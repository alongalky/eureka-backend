const util = require('util')
const logger = require('../../logger/logger')()

module.exports = ({ database, cloud }) => {
  const failIfQuotaExceeded = spendings => {
    if (spendings.total_spent_in_dollars > spendings.spending_quota) {
      logger.info(`Account ${spendings.account_id} has exceeded its quota. ` +
        `Total spent: $ ${spendings.total_spent_in_dollars}, Quota: $ ${spendings.spending_quota}`)

      const err = new Error(`Spending quota exceeded`)
      err.type = 'spending_quota_exceeded'

      return Promise.reject(err)
    } else {
      return Promise.resolve()
    }
  }

  return {
    addTask: (req, res) =>
      database.tiers.getTiers()
        .then(tiers => {
          // Validation
          req.checkBody('command', 'Expected command between 1 to 255 characters').notEmpty().isLength({min: 1, max: 255})
          req.checkBody('output', 'Missing output folder').notEmpty().isLength({min: 1, max: 255})
          req.checkBody('machineName', 'Missing machineName').notEmpty().isLength({min: 1, max: 255})
          req.checkBody('taskName', 'Missing taskName').notEmpty().isLength({min: 1, max: 255})
          const tierNames = tiers.map(t => t.name)
          req.checkBody('tier', `Incorrect tier: options are ${tierNames.join(', ')}`).notEmpty().isIn(tierNames)

          return req.getValidationResult()
            .then(result => {
              if (!result.isEmpty()) {
                return res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
              }

              return database.accounts.getAccountSpendings(req.params.account_id)
                .then(spendings => failIfQuotaExceeded(spendings))
                .then(() => {
                  const tierId = tiers.find(t => t.name === req.body.tier).tier_id
                  const params = {
                    command: req.body.command,
                    output: req.body.output,
                    machineName: req.body.machineName,
                    taskName: req.body.taskName,
                    tierId,
                    account: req.params.account_id
                  }

                  return database.tasks.addTask(params)
                    .then(taskId => {
                      res.status(201).send({message: 'Task queued successfuly'})
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
          const formattedTasks = allTasks.map(t => ({
            name: t.name,
            command: t.command,
            status: t.status,
            machineName: t.machine_name,
            timestamp_initializing: t.timestamp_initializing,
            timestamp_done: t.timestamp_done,
            tier: t.tier,
            durationInSeconds: t.duration_in_seconds,
            costInCents: (t.total_spent_in_dollars * 100.0)
          }))
          return res.json(formattedTasks)
        })
        .catch(err => {
          logger.error(err)
          res.status(500).send('Failed to get tasks')
        })
      })
  }
}
