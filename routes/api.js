const express = require('express')
const apiRouter = express.Router()
const accountsRouter = express.Router({mergeParams: true})
const passport = require('passport')

module.exports = ({ database, cloud, config, authStrategy }) => {
  const machinesApi = require('./api/machines')({ database })
  const tasksApi = require('./api/tasks')({ database, cloud })
  const authenticateApi = require('./api/authenticate')({ database, config })

  apiRouter.get('/health-check', (req, res) => {
    res.json({ message: 'All is well' })
  })

  apiRouter.post('/authenticate', authenticateApi.authenticate)

  passport.use(authStrategy)
  apiRouter.use('/accounts/:account_id', passport.authenticate('jwt', {session: false}), accountsRouter)

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
