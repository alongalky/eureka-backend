const moment = require('moment')
const logger = require('../logger/logger')()

module.exports = ({ config, database, Dockerode, controller, persevere }) => ({
  runTask: (taskId, params) => {
    return database.tasks.changeTaskStatusInitializing(taskId)
      .then(() => controller.runInstance(taskId, params))
      .then(vm => {
        const docker = new Dockerode({ host: vm.ip, port: config.docker_port })
        return persevere(() => docker.pull('busybox:latest'), Array(6).fill(moment.duration(5, 'seconds')))
          .then(() => persevere(() => docker.run('busybox:latest', 'wget ester.hackon.eu:9999'.split(' ')), [moment.duration(5, 'seconds')]))
          .then(() => database.tasks.changeTaskStatusRunning(taskId))
          .then(() => logger.info('Task %s running', taskId))
      })
      .catch(err => {
        logger.error('Error starting task', taskId, err)
        return database.tasks.changeTaskStatusError(taskId)
      })
      .catch(err => {
        // TODO: Alert
        logger.error('Task %s deployment failed but status could not be updated', taskId, err)
      })
  }
})
