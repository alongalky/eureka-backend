// Middleware for bunyan that sends telemetry to AI
const stream = require('stream')

const createStream = client =>
  class AppInsightsStream extends stream.Writable {
    _write (chunk, enc, next) {
      const traceObject = JSON.parse(chunk.toString())

      if (traceObject.err) {
        client.trackException(traceObject.err)
      } else {
        const aiSeverityLevel = traceObject.level <= 30 ? 1 : 2
        client.trackTrace(traceObject.msg, aiSeverityLevel)
      }

      next()
    }
  }

module.exports = createStream
