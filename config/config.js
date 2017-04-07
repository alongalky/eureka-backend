const fs = require('fs')
const path = require('path')
const objectMege = require('object-merge')

module.exports = (env = process.env.EUREKA_ENV) => {
  let defaultsfile = path.join(__dirname, 'defaults.config.js')
  let environmentfile = path.join(__dirname, `${env || ''}.config.js`)
  if (!fs.existsSync(environmentfile)) {
    /* We assume local environment as fallback */
    console.log('No environment specified, using local')
    environmentfile = path.join(__dirname, 'local.config.js')
  }

  console.log('Loading configuration from file', filename)
  const config = objectMege(require(defaultsfile), require(environmentfile))
  console.log('Configuration is', config)

  return config
}
