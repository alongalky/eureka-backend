const express = require('express')
const router = express.Router()

module.exports = ({machinesDatabase, tasksDatabase}) => {
  const machinesApi = require('./api/machines')(machinesDatabase)
  const tasksApi = require('./api/tasks')(tasksDatabase)

  router.get('/health-check', (req, res) => {
    res.json({ message: 'All is well' })
  })

  router.put('/tasks', tasksApi.putTasks)
  router.get('/tasks', tasksApi.getTasks)
  router.get('/machines', machinesApi.getMachines)

  return router
}
