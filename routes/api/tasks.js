const moment = require('moment')
const util = require('util')
const logger = require('../../logger/logger')()

const failIfQuotaExceeded = ({ account, totalCostInCents }) => {
  const quotaInDollars = parseFloat(account.spending_quota)
  const didAccountExceededSpendingQuota =
    totalCostInCents / 100.0 > quotaInDollars

  if (didAccountExceededSpendingQuota) {
    logger.info(`Account ${account.account_id} has exceeded its quota. ` +
      `Total spent: $ ${totalCostInCents / 100.0}, Quota: $ ${quotaInDollars}`)

    const err = new Error(`Spending quota exceeded`)
    err.type = 'spending_quota_exceeded'
    return Promise.reject(err)
  } else {
    return Promise.resolve()
  }
}

const addTaskDuration = task => {
  const start = moment(task.timestamp_initializing)

  let end
  if (task.timestamp_done) {
    end = moment(task.timestamp_done)
  } else {
    end = moment()
  }

  task.durationInSeconds = end.diff(start, 'seconds')
  return task
}

const addCost = tiers => task => {
  const tier = tiers.find(t => t.name === task.tier)
  if (!tier) {
    throw new Error(`Invalid tier found for task ${task.task_id}`)
  }

  task.costInCents = tier.pricePerHourInCents * (task.durationInSeconds / (60.0 * 60.0))
  return task
}

const addTaskCostAndDuration = tiers => task => addCost(tiers)(addTaskDuration(task))

const addTask = ({ database, cloud, tiers }) => (req, res) => {
  // Validation
  req.checkBody('command', 'Expected command between 1 to 255 characters').notEmpty().isLength({min: 1, max: 255})
  req.checkBody('output', 'Missing output folder').notEmpty().isLength({min: 1, max: 255})
  req.checkBody('machine', 'Missing machine').notEmpty().isLength({min: 1, max: 255})
  req.checkBody('taskName', 'Missing taskName').notEmpty().isLength({min: 1, max: 255})
  const tierNames = tiers.map(t => t.name)
  req.checkBody('tier', `Incorrect tier: options are ${tierNames.join(', ')}`).notEmpty().isIn(tierNames)

  req.getValidationResult().then(result => {
    if (!result.isEmpty()) {
      return res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
    }

    const params = {
      command: req.body.command,
      output: req.body.output,
      machine: req.body.machine,
      key: req.key,
      taskName: req.body.taskName,
      tier: req.body.tier,
      account: req.params.account_id
    }

    database.tasks.getTasks({
      account: req.params.account_id,
      key: req.key
    })
    .then(tasks => {
      const totalCostInCents = tasks
        .map(addTaskCostAndDuration(tiers))
        .map(task => task.costInCents)
        .reduce((sum, val) => val + sum, 0)

      return database.accounts.getAccount(params.account)
        .then(account => failIfQuotaExceeded({ account, totalCostInCents }))
    })
    .then(() => database.tasks.addTask(params))
    .then(taskId => {
      res.status(201).send({message: 'Task queued successfuly'})
      // This call could fail against the API, but we return a 201 anyway.
      // Instance is transitioned to Error status in case of an API error.
      cloud.runTask(taskId, params)
    }).catch(err => {
      if (err.type === 'machine_not_exists') {
        res.status(404).send('Machine not found')
      } else if (err.type === 'spending_quota_exceeded') {
        res.status(400).send('Spending quota exceeded')
      } else {
        logger.error(err)
        res.status(500).send('Failed to add task')
      }
    })
  })
}

const getTasks = ({database, tiers}) => (req, res) =>
  req.getValidationResult().then(result => {
    if (!result.isEmpty()) {
      res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
      return
    }

    database.tasks.getTasks({
      account: req.params.account_id,
      key: req.key
    }).then(allTasks => res.json(allTasks.map(addTaskCostAndDuration(tiers))))
    .catch(err => {
      logger.error(err)
      res.status(500).send('Failed to get tasks')
    })
  })

module.exports = ({database, cloud, tiers}) => ({
  addTask: addTask({ database, cloud, tiers }),
  getTasks: getTasks({ database, tiers })
})
