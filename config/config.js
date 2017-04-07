const fs = require('fs')
const path = require('path')

module.exports = (env = process.env.EUREKA_ENV) => {
  let filename = path.join(__dirname, `${env || ''}.config.js`)
  if (!fs.existsSync(filename)) {
    console.log('No environment specified, using default')
    filename = path.join(__dirname, `default.config.js`)
  }

  console.log('Loading configuration from file', filename)
  const config = require(filename)
  console.log('Configuration is', config)

  return config
}
