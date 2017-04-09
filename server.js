const fs = require('fs')
const config = require('./config/config')(fs, require)
const appInsights = require('applicationinsights')
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const morgan = require('morgan')
const expressValidator = require('express-validator')
const machinesDatabase = require('./database/machines')
const tasksDatabase = require('./database/tasks')
const apiRouter = require('./routes/api')({machinesDatabase, tasksDatabase})

// Set up Application Insights for logging requests
appInsights.setup(config.applicationInsights.iKey).start()

// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(expressValidator())
// Request logging middleware
app.use(morgan('tiny'))

// Our authentication middleware
app.use((req, res, next) => {
  const authHeader = req.get('Authentication')
  const keyFields = authHeader ? authHeader.trim().split(':') : ['', '']
  const key = keyFields[0]
  const secret = keyFields[1]
  req.key = {key, secret}
  next()
})

var port = process.env.PORT || 8080

app.use('/api', apiRouter)

app.listen(port)
console.log('Magic happens on port ' + port)
