const util = require('util')

const putTasks = (req, res) => {
  req.checkParams('id', 'Missing task id').notEmpty().isAlphanumeric()

  req.getValidationResult().then(function (result) {
    if (!result.isEmpty()) {
      res.status(400).send('There have been validation errors: ' + util.inspect(result.array()))
      return
    }

    const responseJson = {
      urlparam: req.params.urlparam,
      getparam: req.params.getparam,
      postparam: req.params.postparam
    }

    res.json(responseJson)
  })
}

const getTasks = (req, res) => {
  // TODO: integrate with db
  const mockTasks = [
    { id: 'task1' }, { id: 'task2' }
  ]

  res.json(mockTasks)
}

module.exports = {
  getTasks,
  putTasks
}
