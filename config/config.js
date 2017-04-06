const fs = require('fs')
const path = require('path')
const objectMege = require('object-merge')

module.exports = (env) => {
  let defaultsfile = path.join(__dirname, 'defaults.config.js')
  let environmentfile = path.join(__dirname, `${env || ''}.config.js`)
  if (!fs.existsSync(environmentfile)) {
    /* We assume dev environment as fallback */
    environmentfile = path.join(__dirname, 'local.config.js')
  }

  return objectMege(require(defaultsfile), require(environmentfile))
}
