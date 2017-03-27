const express = require('express')
const router = express.Router()
const tasks = require('./api/tasks')

router.get('/health-check', (req, res) => {
  res.json({ message: 'All is well' })
})

router.put('/tasks/:id', tasks.putTasks)

module.exports = router
