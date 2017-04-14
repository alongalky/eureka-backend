module.exports = ({ config, database, gce }) => ({
  runInstance: (taskId, params) => {
    const cloud = require('./agnostic')({ config, database, gce })
    const googleRunInstance = require('./google/runinstance')({ config, database, gce, cloud })
    switch (config.cloud_provider) {
      case 'google':
      default:
        googleRunInstance(taskId, params)
    }
  },
  startTask: (ip, params) => {

  }
})
