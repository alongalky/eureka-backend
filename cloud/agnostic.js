const logger = require('../logger/logger')()

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
        logger.error(err)
        return database.changeTaskStatus(taskId, 'Error')
      })
      .catch(err => {
        // TODO: post message to alerting service
        logger.error('VM %s deployment failed but status could not be updated', taskId, err)
      })
  }
})
