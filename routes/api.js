const express = require('express')
const apiRouter = express.Router()
const accountsRouter = express.Router({mergeParams: true})

module.exports = ({machinesDatabase, tasksDatabase, cloud, tiers}) => {
  const machinesApi = require('./api/machines')(machinesDatabase)
  const tasksApi = require('./api/tasks')({
    database: tasksDatabase,
    cloud,
    tiers
  })

  apiRouter.get('/health-check', (req, res) => {
    res.json({ message: 'All is well' })
  })

  apiRouter.use('/accounts/:account_id', accountsRouter)

  // Add account_id verification middleware
  accountsRouter.use((req, res, next) => {
    req.checkParams('account_id', 'Account ID must be a valid lower-case UUID').notEmpty().isUUID().isLowercase()
    next()
  })

  accountsRouter.post('/tasks', tasksApi.addTask)
  accountsRouter.get('/tasks', tasksApi.getTasks)
  accountsRouter.get('/machines', machinesApi.getMachines)

  return apiRouter
}
