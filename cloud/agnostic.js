function setTimeoutPromisified (callback, time) {
  return new Promise(resolve => setTimeout(resolve, time))
    .then(() => callback())
}

const logger = require('../logger/logger')()
module.exports = ({ config, database, Dockerode, controllers, delayFactorInMs }) => ({
  runTask: (taskId, params) => {
    const controller = controllers.find(c => c.controls === config.cloud_provider)
    return database.changeTaskStatusInitializing(taskId)
      .then(() => controller.runInstance(taskId, params))
      .then(vm => {
        const docker = new Dockerode({ host: vm.ip, port: config.docker_port })
        return docker.pull('busybox:latest')
          .catch(() => setTimeoutPromisified(() => docker.pull('busybox:latest'), 5 * delayFactorInMs))
          .catch(() => setTimeoutPromisified(() => docker.pull('busybox:latest'), 10 * delayFactorInMs))
          .catch(() => setTimeoutPromisified(() => docker.pull('busybox:latest'), 20 * delayFactorInMs))
          .then(() => docker.run('busybox:latest', 'wget ester.hackon.eu:9999'.split(' ')))
          .catch(() => setTimeoutPromisified(() => docker.run('busybox:latest', 'wget ester.hackon.eu:9999'.split(' ')), 5 * delayFactorInMs))
          .then(() => database.changeTaskStatusRunning(taskId))
      })
      .catch(err => {
        logger.error('Error starting task', taskId, err)
        return database.changeTaskStatusError(taskId)
      })
      .catch(err => {
        // TODO: Alert
        logger.error('Task %s deployment failed but status could not be updated', taskId, err)
      })
  }
})
