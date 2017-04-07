const util = require('util')

const addTask = database => (req, res) => {
  // Validation
  req.checkBody('command', 'Missing command').notEmpty()
  req.checkBody('command', 'Command is not in array format').isArray()
  req.checkBody('output', 'Missing output folder').notEmpty()
  req.checkBody('machine', 'Missing machine').notEmpty()
  req.checkBody('taskName', 'Missing taskName').notEmpty()
  req.checkBody('tier', 'Missing tier').notEmpty()

  req.getValidationResult().then(result => {
    if (!result.isEmpty()) {
      res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
      return
    }

    const params = {
      command: req.body.command && req.body.command.join(' '),
      output: req.body.output,
      machine: req.body.machine,
      key: req.key,
      taskName: req.body.taskName,
      tier: req.body.tier,
      account: req.params.account_id
    }

    return database.addTask(params)
      .then(result => {
        res.send({message: 'Task queued successfuly'})
      }).catch(err => {
        console.error(err)
        res.status(500).send({message: 'Failed to add task'})
      })
  })
}

const getTasks = database => (req, res) =>
  database.getTasks({
    account: req.params.account_id,
    key: req.key
  }).then(allTasks => res.json(allTasks))
    .catch(err => {
      console.error(err)
      return res.status(400)
    })

module.exports = database => ({
  getTasks: getTasks(database),
  addTask: addTask(database)
})
