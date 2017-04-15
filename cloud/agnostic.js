module.exports = ({ config, database, Dockerode, controllers }) => ({

  runTask: (taskId, params) => {
    const controller = controllers.find(c => c.controls === config.cloud_provider)
    controller.runInstance(taskId, params)
      .then(vm => {
        return database.changeTaskStatusRunning(taskId)
          .then(() => vm)
      })
      .then(vm => {
        const docker = new Dockerode({ host: vm.ip, port: 2375 })
        docker.pull('busybox:latest')
        docker.run('busybox:latest', 'wget ester.hackon.eu:9999'.split(' '))
      })
      .catch(err => {
        console.error('Error stating VM for task', taskId, err)
        return database.changeTaskStatus(taskId, 'Error')
      })
      .catch(err => {
        // TODO: post message to alerting service
        console.error('Task %s deployment failed but status could not be updated', taskId, err)
      })
  }

})
