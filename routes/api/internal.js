const util = require('util')
const logger = require('../../logger/logger')()

module.exports = ({ database, config, cloud }) => {
  const buildMachinasScript = (vmId, tags) => {
    const waitForDocker = 'while ! docker ps &> /dev/null; do sleep 1; done'
    return database.accounts.getAccounts(vmId)
      .then(accounts => {
        const accountIds = accounts.map(account => account.account_id)
        return Promise.all([
          Promise.all(accountIds.map(accountId => cloud.getBucketForAccount(accountId))),
          Promise.all(accountIds.map(accountId => database.machines.getMachines(accountId)))
        ])
          .then(([buckets, machines]) => {
            let commands = []
            buckets.map(bucket => {
              commands.push(`mkdir -p /mnt/${bucket}`)
              commands.push(`gcsfuse ${bucket} /mnt/${bucket}`)
            })
            commands.push(waitForDocker)
            machines.reduce((acc, val) => acc.concat(val), []).filter(machine => machine.vm_id === vmId)
              .forEach(machine => commands.push(`docker start ${machine.container_id}`))
            return commands.join('; ')
          })
      })
  }
  const buildRunnerScript = (vmId, tags) => {
    const account = tags.find(tag => tag.startsWith('account-')).substr('account-'.length)
    const taskName = tags.find(tag => tag.startsWith('taskname-')).substr('taskname-'.length)
    return cloud.getBucketForAccount(account)
      .then(bucket =>
        `
          mkdir -p /mnt/${bucket}
          gcsfuse ${bucket} /mnt/${bucket}
          logpath=/mnt/${bucket}/logs-${taskName}
          while [ -z $container ]; do
              container=$(docker ps | tail -n+2 | awk '{ print $1 }')
            if [ -z $container ]; then
              sleep 1
            else
              docker logs -t -f $container &> $logpath &
            fi
          done
        `
      )
  }
  return {
    putTask: (req, res) => {
      req.checkParams('task_id', 'Task ID must be a valid lower-case UUID').notEmpty().isUUID().isLowercase()
      req.checkBody('status', 'Task status must be done').notEmpty().isLowercase()
      req.getValidationResult()
        .then(result => {
          if (!result.isEmpty() || req.body.status !== 'done') {
            logger.error(new Error('Received parameters are incorrect'))
            res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
            return
          }

          const taskId = req.params.task_id
          return cloud.terminateTask(taskId)
            .then(() => database.tasks.changeTaskStatusDone(taskId))
            .then(() => {
              logger.info('Succesfully terminated task', taskId)
              res.status(201).send({message: 'Task terminated successfuly'})
            })
            .catch(err => {
              // TODO: Alert
              logger.error(err)
              res.status(500).send(`Failed to transition task ${taskId} to Done`)
              return database.tasks.changeTaskStatusError(taskId)
            })
        })
        .catch(err => {
          // TODO: Alert
          logger.error(err)
        })
    },
    getScript: (req, res) => {
      req.checkQuery('vm_id', 'Machine ID must be a valid string').notEmpty()
      req.getValidationResult()
        .then(result => {
          if (!result.isEmpty()) {
            logger.error(new Error('Received parameters are incorrect'))
            res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
            return
          }
          const vmId = req.query.vm_id
          return cloud.getInstanceTags(vmId)
            .then(tags => {
              switch (tags.find(tag => tag.startsWith('type-'))) {
                case 'type-machinas':
                  return buildMachinasScript(vmId, tags)
                    .then(script => res.status(200).send({script}))
                case 'type-runner':
                  return buildRunnerScript(vmId, tags)
                    .then(script => res.status(200).send({script}))
                default:
                  const err = `Error requesting script: instance ${vmId} has no type`
                  // TODO: Alert
                  logger.error(err)
                  res.status(400).send(err)
              }
            })
        })
        .catch(err => {
          // TODO: Alert
          logger.error(err)
          res.status(500).send(err)
        })
    }
  }
}
