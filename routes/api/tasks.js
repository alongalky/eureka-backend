const moment = require('moment')
const util = require('util')
const logger = require('../../logger/logger')()

module.exports = ({ database, cloud }) => {
  const addDurationAndCost = task => {
    const endTime = task.timestamp_done ? moment(task.timestamp_done) : moment()
    const durationInSeconds = endTime.diff(moment(task.timestamp_initializing), 'seconds')
    const durationInMinutesRoundedUp = Math.ceil(durationInSeconds / 60.0)
    const costInCents = (durationInMinutesRoundedUp / 60.0) * task.price_per_hour_in_cent

    return Object.assign({}, task, { durationInSeconds, costInCents })
  }

  return {
    addTask: (req, res) =>
      database.tiers.getTiers()
        .then(tiers => {
          // Validation
          req.checkBody('command', 'Expected command between 1 to 255 characters').notEmpty().isLength({min: 1, max: 255})
          req.checkBody('machineName', 'Missing machineName').notEmpty().isLength({min: 1, max: 255})
          req.checkBody('taskName', 'Missing taskName').notEmpty().isLength({min: 1, max: 255})
          const tierNames = tiers.map(t => t.name)
          req.checkBody('tier', `Incorrect tier: options are ${tierNames.join(', ')}`).notEmpty().isIn(tierNames)

          return req.getValidationResult()
            .then(result => {
              if (!result.isEmpty()) {
                return res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
              }

              return database.tasks.getTasks(req.params.account_id)
                .then(tasks => {
                  if (tasks.length === 0) {
                    return
                  }
                  const totalSpentInDollars = tasks
                    .map(addDurationAndCost)
                    .map(t => t.costInCents)
                    .reduce((x, y) => x + y, 0) / 100.0

                  const accountSpendingQuota = tasks[0].spending_quota
                  if (totalSpentInDollars > accountSpendingQuota) {
                    logger.info(`Account ${req.params.account_id} has exceeded its quota. ` +
                      `Total spent: $ ${totalSpentInDollars}, Quota: $ ${accountSpendingQuota}`)

                    const err = new Error(`Spending quota exceeded`)
                    err.type = 'spending_quota_exceeded'
                    throw err
                  }
                })
                .then(() => {
                  const tierId = tiers.find(t => t.name === req.body.tier).tier_id
                  const params = {
                    command: req.body.command,
                    machineName: req.body.machineName,
                    taskName: req.body.taskName,
                    tierId,
                    account: req.params.account_id
                  }

                  return database.tasks.addTask(params)
                    .then(taskId => {
                      res.status(201).send({message: 'Task queued successfully'})
                      // This call could fail against the API, but we return a 201 anyway.
                      // Instance is transitioned to Error status in case of an API error.
                      cloud.runTask(taskId, params)
                    })
                })
            })
        }).catch(err => {
          if (err.type === 'machine_not_exists') {
            res.status(404).send('Machine not found')
          } else if (err.type === 'spending_quota_exceeded') {
            res.status(400).send('Spending quota exceeded')
          } else {
            logger.error(err)
            res.status(500).send('Failed to add task')
          }
        }),
    getTasks: (req, res) =>
      req.getValidationResult().then(result => {
        if (!result.isEmpty()) {
          res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
          return
        }

        database.tasks.getTasks({
          account: req.params.account_id
        }).then(allTasks => {
          const formattedTasks = allTasks
            .map(addDurationAndCost)
            .map(task => ({
              name: task.name,
              command: task.command,
              status: task.status,
              machineName: task.machine_name,
              timestamp_initializing: task.timestamp_initializing,
              timestamp_done: task.timestamp_done,
              tier: task.tier,
              durationInSeconds: task.durationInSeconds,
              costInCents: task.costInCents
            }))
          return res.json(formattedTasks)
        })
        .catch(err => {
          logger.error(err)
          res.status(500).send('Failed to get tasks')
        })
      }),
    killTask: (req, res) => {
      req.checkBody('task_name', 'Expected name between 1 to 60 characters').notEmpty().isLength({min: 1, max: 60})
      return req.getValidationResult().then(result => {
        if (!result.isEmpty()) {
          res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
          return
        }

        database.tasks.getTasks({
          account: req.params.account_id
        }).then(allTasks => {
          const matchingTasks = allTasks.filter(task => task.name.includes(req.body.task_name))

          if (matchingTasks.length === 0) {
            const err = new Error()
            err.type = 'task_name_unexistent'
            throw err
          }
          if (matchingTasks.length > 1) {
            const err = new Error()
            err.type = 'task_name_ambiguos'
            throw err
          }
          if (matchingTasks[0].status !== 'Running' && matchingTasks[0].status !== 'Initializing') {
            const err = new Error()
            err.type = 'task_name_notrunning'
            throw err
          }

          const taskId = matchingTasks[0].task_id
          return cloud.terminateTask(taskId)
            .then(() => database.tasks.changeTaskStatusKilled(taskId))
            .then(() => {
              logger.info('Killing VM for task', taskId)
              res.status(201).send({ message: 'Task killed successfully' })
            })
        })
        .catch(err => {
          if (err.type === 'task_name_unexistent') {
            res.status(404).send('Task not found')
          } else if (err.type === 'task_name_ambiguos') {
            res.status(400).send('Task name matches more than one task')
          } else if (err.type === 'task_name_notrunning') {
            res.status(400).send('Task name matches a task that cannot be killed')
          } else {
            logger.error(err)
            res.status(500).send('Failed to modify task')
          }
        })
      })
    }
  }
}
