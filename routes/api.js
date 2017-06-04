const express = require('express')
const apiRouter = express.Router()
const accountsRouter = express.Router({mergeParams: true})
const passport = require('passport')

module.exports = ({ database, cloud, config, authStrategy }) => {
  const machinesApi = require('./api/machines')({ database, cloud })
  const tasksApi = require('./api/tasks')({ database, cloud })
  const authenticateApi = require('./api/authenticate')({ database, config })
  const onboardApi = require('./api/onboard')({ database, config })
  const internalApi = require('./api/internal')({ database, config, cloud })

  apiRouter.get('/health-check', (req, res) => {
    res.json({ message: 'All is well' })
  })

  apiRouter.post('/signup', onboardApi.signup)
  apiRouter.post('/authenticate', authenticateApi.authenticate)

  apiRouter.put('/_internal/tasks/:task_id', internalApi.putTask)
  apiRouter.get('/_internal/scripts', internalApi.getScript)

  passport.use(authStrategy)
  apiRouter.use('/accounts/:account_id', passport.authenticate('jwt', {session: false}), accountsRouter)

  // Add account_id verification middleware
  accountsRouter.use((req, res, next) => {
    req.checkParams('account_id', 'Account ID must be a valid lower-case UUID').notEmpty().isUUID().isLowercase()
    next()
  })

  accountsRouter.post('/tasks', tasksApi.addTask)
  accountsRouter.get('/tasks', tasksApi.getTasks)
  accountsRouter.put('/tasks', tasksApi.killTask)
  accountsRouter.get('/machines', machinesApi.getMachines)
  accountsRouter.post('/machines', onboardApi.onboard)

  return apiRouter
}
