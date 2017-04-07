const express = require('express')
const apiRouter = express.Router()
const accountsRouter = express.Router({mergeParams: true})

module.exports = ({machinesDatabase, tasksDatabase}) => {
  const machinesApi = require('./api/machines')(machinesDatabase)
  const tasksApi = require('./api/tasks')(tasksDatabase)

  apiRouter.get('/health-check', (req, res) => {
    res.json({ message: 'All is well' })
  })

  apiRouter.use('/accounts/:account_id', accountsRouter)

  accountsRouter.post('/tasks', tasksApi.addTask)
  accountsRouter.get('/tasks', tasksApi.getTasks)
  accountsRouter.get('/machines', machinesApi.getMachines)

  return apiRouter
}
