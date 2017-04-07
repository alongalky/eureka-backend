const putTasks = database => (req, res) => {
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
    .then(result => res.status(200).send({message: 'Task queued successfuly'}))
    .catch(err => {
      console.error(err)
      return res.status(400).send({message: 'Failed to add task', error: err})
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
  putTasks: putTasks(database)
})
