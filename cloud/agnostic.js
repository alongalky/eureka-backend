const moment = require('moment')
const logger = require('../logger/logger')()

module.exports = ({ config, database, Dockerode, controller, persevere }) => {
  const persevereRunImagePromisified = ({ docker, image, streams, command, opts, delays }) =>
    persevere(() =>
      new Promise((resolve, reject) =>
        docker.run(image, command.split(' '), null, opts, err => reject(err))
          .on('container', container => resolve(container))
      ),
      delays
    )
  const snapshotMachine = ({ machine, taskId, params }) =>
    // TODO: this should be changed to internal, external IP will have Docker firewalled
    controller.resolveInstanceExternalIp(machine.vm_id)
      .then(ip => {
        const docker = new Dockerode({ host: ip, port: config.docker_port })
        const container = docker.getContainer(machine.container_id)
        return persevere(() => container.commit({ repo: params.account, tag: taskId }), [moment.duration(5, 'seconds')])
          .then(() => controller.pushImage({ docker, taskId, params }))
      })
  return {
    runTask: (taskId, params) => {
      return database.tasks.changeTaskStatusInitializing(taskId)
        .then(() => database.machines.getMachines({ account: params.account }))
        .then(machines => machines.find(machine => machine.name === params.machineName))
        .then(machine => snapshotMachine({ machine, taskId, params }))
        .then(imageLocator =>
          controller.runInstance(taskId, params)
            .then(vm => {
              const docker = new Dockerode({ host: vm.ip, port: config.docker_port })
              return persevere(() => controller.pullImage({ docker, image: imageLocator }), Array(6).fill(moment.duration(5, 'seconds')))
                .then(() => logger.info('Successfully pulled %s on %s', imageLocator, vm.ip))
                .then(() => persevereRunImagePromisified({ docker, image: imageLocator, command: params.command, delays: [moment.duration(5, 'seconds')] }))
                .then(container => logger.info('Container %s running for task %s', container.id, taskId))
                .then(() => database.tasks.changeTaskStatusRunning(taskId))
                .then(() => logger.info('Task %s running', taskId))
            })
        )
        .catch(err => {
          logger.error('Error starting task', taskId, err)
          return database.tasks.changeTaskStatusError(taskId)
        })
        .catch(err => {
          // TODO: Alert
          logger.error('Task %s deployment failed but status could not be updated', taskId, err)
        })
    }
  }
}
