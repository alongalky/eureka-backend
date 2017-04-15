const fs = require('fs')
const config = require('./config/config')(fs, require)
const appInsights = require('applicationinsights')
// Set up Application Insights for logging requests
appInsights.setup(config.applicationInsights.iKey)
  .setAutoCollectRequests(false)
  .start()

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const morgan = require('morgan')
const expressValidator = require('express-validator')
const machinesDatabase = require('./database/machines')
const tasksDatabase = require('./database/tasks')
const gce = require('@google-cloud/compute')()
const googleController = require('./cloud/google/controller')({ config, database: tasksDatabase, gce })
const cloud = require('./cloud/agnostic')({config, database: tasksDatabase, googleController})
const apiRouter = require('./routes/api')({machinesDatabase, tasksDatabase, cloud, tiers: config.tiers})
const winston = require('winston')
const aiLogger = require('winston-azure-application-insights').AzureApplicationInsightsLogger

// Set up logging through winston
winston.configure({
  transports: [
    new (winston.transports.Console)({
      formatter: (options) =>
        new Date().toISOString() + ' ' + options.level.toUpperCase() + ' ' + (options.message || '')
    })
  ]
})

// Set up Application Insights winston transport
winston.add(aiLogger, {
  key: config.applicationInsights.iKey
})

// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(expressValidator({
  customValidators: {
    isArray: Array.isArray
  }
}))
// Request logging middleware
app.use(morgan('tiny', {
  skip: (req, res) => req.url.endsWith('/health')
}))

// Our authentication middleware
app.use((req, res, next) => {
  const authHeader = req.get('Authentication')
  const [key, secret] = authHeader ? authHeader.trim().split(':') : ['', '']
  req.key = {key, secret}
  next()
})

var port = process.env.PORT || 8080

// Filter requests that don't start with /api from analytics
app.use('/api', (req, res, next) => {
  appInsights.client.trackRequest(req, res)

  next()
})
app.use('/api', apiRouter)

app.listen(port)
winston.info('Magic happens on port ' + port)
