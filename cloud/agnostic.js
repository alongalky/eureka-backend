module.exports = ({ config, database, Dockerode, controllers }) => ({

  runTask: (taskId, params) => {
    const controller = controllers.find(c => c.controls === config.cloud_provider)
    controller.runInstance(taskId, params)
      .then(vm => {
        return database.changeTaskStatusRunning(taskId)
          .then(() => vm)
      })
      .then(vm => {
        const docker = new Dockerode({ host: vm.ip, port: config.docker_port })
        return docker.pull('busybox:latest')
          .catch(() => setTimeout(() => docker.pull('busybox:latest'), 5000))
          .catch(() => setTimeout(() => docker.pull('busybox:latest'), 10000))
          .catch(() => setTimeout(() => docker.pull('busybox:latest'), 20000))
          .then(() => docker.run('busybox:latest', 'wget ester.hackon.eu:9999'.split(' ')))
          .catch(() => setTimeout(() => docker.run('busybox:latest', 'wget ester.hackon.eu:9999'.split(' ')), 5000))
      })
      .catch(err => {
        console.error('Error starting task', taskId, err)
        return database.changeTaskStatus(taskId, 'Error')
      })
      .catch(err => {
        // TODO: Alert
        console.error('Task %s deployment failed but status could not be updated', taskId, err)
      })
  }

})
