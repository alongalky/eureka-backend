const express = require('express')
const router = express.Router()
const tasks = require('./api/tasks')
const machines = require('./api/machines')

router.get('/health-check', (req, res) => {
  res.json({ message: 'All is well' })
})

router.put('/tasks/:id', tasks.putTasks)
router.get('/tasks', tasks.getTasks)
router.get('/machines', machines.getMachines)

module.exports = router
