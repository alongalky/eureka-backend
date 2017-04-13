const util = require('util')

const addTask = database => (req, res) => {
  // Validation
  req.checkBody('command', 'Expected command between 1 to 255 characters').notEmpty().isLength({min: 1, max: 255})
  req.checkBody('output', 'Missing output folder').notEmpty().isLength({min: 1, max: 255})
  req.checkBody('machine', 'Missing machine').notEmpty().isLength({min: 1, max: 255})
  req.checkBody('taskName', 'Missing taskName').notEmpty().isLength({min: 1, max: 255})
  req.checkBody('tier', 'Missing tier').notEmpty().isIn(['tiny'])

  req.getValidationResult().then(result => {
    if (!result.isEmpty()) {
      res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
      return
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

    return database.addTask(params)
      .then(result => {
        res.status(201).send({message: 'Task queued successfuly'})
      }).catch(err => {
        if (err.type === 'machine_not_exists') {
          res.status(404).send('Machine not found')
        } else {
          console.error(err)
          res.status(500).send('Failed to add task')
        }
      })
  })
}

const getTasks = database => (req, res) =>
  req.getValidationResult().then(result => {
    if (!result.isEmpty()) {
      res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
      return
    }

    database.getTasks({
      account: req.params.account_id,
      key: req.key
    }).then(allTasks => res.json(allTasks))
      .catch(err => {
        console.error(err)
        res.status(500).send('Failed to get tasks')
      })
  })

module.exports = database => ({
  getTasks: getTasks(database),
  addTask: addTask(database)
})
