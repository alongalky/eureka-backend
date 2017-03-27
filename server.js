const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const expressValidator = require('express-validator')
const router = require('./routes/api')

// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(expressValidator())

var port = process.env.PORT || 8080

app.use('/api', router)

app.listen(port)
console.log('Magic happens on port ' + port)
