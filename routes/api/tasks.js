const moment = require('moment')
const util = require('util')
const winston = require('winston')

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

    database.addTask(params)
    .then(taskId => {
      res.status(201).send({message: 'Task queued successfuly'})
      // This call could fail against the API, but we return a 201 anyway.
      // Instance is transitioned to Error status in case of an API error.
      cloud.runTask(taskId, params)
    }).catch(err => {
      if (err.type === 'machine_not_exists') {
        res.status(404).send('Machine not found')
      } else {
        winston.error(err)
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

    database.getTasks({
      account: req.params.account_id,
      key: req.key
    }).then(allTasks => {
      const addTaskDuration = task => {
        const start = moment(task.timestamp_start)

        let end
        if (task.timestamp_done) {
          end = moment(task.timestamp_done)
        } else {
          end = moment()
        }

        task.durationInSeconds = end.diff(start, 'seconds')
        return task
      }

      const addCost = task => {
        const tier = tiers.find(t => t.name === task.tier)
        if (!tier) {
          throw new Error(`'Invalid tier found for task ${task.task_id}`)
        }

        task.costInCents = tier.pricePerHourInCents * (task.durationInSeconds / (60.0 * 60.0))
        return task
      }

      res.json(allTasks.map(addTaskDuration).map(addCost))
    }).catch(err => {
      winston.error(err)
      res.status(500).send('Failed to get tasks')
    })
  })

module.exports = ({database, cloud, tiers}) => ({
  addTask: addTask({ database, cloud, tiers }),
  getTasks: getTasks({ database, tiers })
})
