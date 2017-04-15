const winston = require('winston')

module.exports = ({ config, database, googleController }) => ({
  runTask: (taskId, params) => {
    const cloudDispatcher = () => {
      switch (config.cloud_provider) {
        case 'google':
        default:
          return googleController.runInstance(taskId, params)
      }
    }
    cloudDispatcher()
      .catch(err => {
        winston.error(err)
        return database.changeTaskStatus(taskId, 'Error')
      })
      .catch(err => {
        // TODO: post message to alerting service
        winston.error('VM %s deployment failed but status could not be updated', taskId, err)
      })
  }
})
