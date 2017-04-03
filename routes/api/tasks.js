const util = require('util')
const tasks = require('../../database/tasks')

const putTasks = (req, res) => {
  req.checkParams('id', 'Missing task id').notEmpty().isAlphanumeric()

  req.getValidationResult().then(function (result) {
    if (!result.isEmpty()) {
      res.status(400).send({message: 'There have been validation errors: ' + util.inspect(result.array())})
      return
    }

    const command = req.body.command
    const output = req.body.output
    const machine = req.params.id

    tasks.addTask({command, output, machine, key: req.key})
      .then(res.status(200).send({message: 'Task queued successfuly'}))
      .catch(err => res.status(400).send({message: 'Failed to add task', error: err}))
  })
}

const getTasks = (req, res) => {
  tasks.getTasks(req.key)
    .then(allTasks => res.json(allTasks))
    .catch(err => res.status(400).send({message: err}))
}

module.exports = {
  getTasks,
  putTasks
}
