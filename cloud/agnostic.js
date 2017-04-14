module.exports = ({ config, database, gce }) => ({
  runTask: (taskId, params) => {
    const cloud = require('./agnostic')({ config, database, gce })
    const googleRunInstance = require('./google/runinstance')({ config, database, gce, cloud })
    switch (config.cloud_provider) {
      case 'google':
      default:
        return googleRunInstance(taskId, params)
    }
  }
})
