const fs = require('fs')
const path = require('path')

module.exports = (env) => {
  let filename = path.join(__dirname, `${env || ''}.config.js`)
  if (!fs.existsSync(filename)) {
    filename = path.join(__dirname, `default.config.js`)
  }

  return require(filename)
}
