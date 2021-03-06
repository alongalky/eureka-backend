const bunyan = require('bunyan')

module.exports = createLogger
module.exports.silence = false
module.exports.logger = null

function createLogger () {
  if (module.exports.logger) {
    return module.exports.logger
  }
  if (module.exports.silence) {
    return bunyan.createLogger({
      name: 'logger',
      streams: []
    })
  }
  module.exports.logger = bunyan.createLogger({name: 'logger'})
  return module.exports.logger
}
