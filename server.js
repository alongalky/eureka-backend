const fs = require('fs')
const config = require('./config/config')(fs, require)
const appInsights = require('applicationinsights')
// Set up Application Insights for logging requests
appInsights.setup(config.applicationInsights.iKey)
  .setAutoCollectRequests(false)
  .setAutoCollectPerformance(false)
  .start()
const AppInsightsStream = require('./logger/appInsightsStream')(appInsights.client)
const logger = require('./logger/logger')()
logger.addStream({
  name: 'aiStream',
  stream: new AppInsightsStream()
})

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const morgan = require('morgan')
const expressValidator = require('express-validator')
const database = require('./database/database')
const gce = require('@google-cloud/compute')()
const apiAuthenticate = require('./routes/api/authenticate')({ database, config })
const Dockerode = require('dockerode')
const gAuth = require('google-auto-auth')()
const googleController = require('./cloud/google/controller')({ config, gce, gAuth })
const persevere = require('./util/persevere')
const passport = require('passport')

const controller = [googleController].find(c => c.controls === config.cloud_provider)
if (!controller) {
  throw new Error(`Could not find a cloud controller to handle ${config.cloud_provider}`)
}
const cloud = require('./cloud/agnostic')({ config, database, Dockerode, controller, persevere })
const apiRouter = require('./routes/api')({
  database,
  cloud,
  tiers: config.tiers,
  config,
  authStrategy: apiAuthenticate.Strategy()
})

// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(expressValidator({
  customValidators: {
    isArray: Array.isArray
  }
}))
app.use(passport.initialize())

// Request logging middleware
app.use(morgan('tiny', {
  skip: (req, res) => req.url.endsWith('/health')
}))

var port = process.env.PORT || 8080

// Filter requests that don't start with /api from analytics
app.use('/api', (req, res, next) => {
  appInsights.client.trackRequest(req, res)

  next()
})
app.use('/api', apiRouter)

app.listen(port)
logger.info('Magic happens on port ' + port)
