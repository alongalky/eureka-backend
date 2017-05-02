const moment = require('moment')
const logger = require('../logger/logger')()

module.exports = ({ config, database, Dockerode, controller, persevere }) => {
  const wrapCommand = (command, taskId) => command + ` ; sync; curl -X PUT -H 'Content-Type: application/json' -d '{"status":"done"}' ${config.eureka_endpoint}/api/_internal/tasks/${taskId}`
  const containerBindsPerAccount = account => ({ HostConfig: { Binds: [ `/mnt/eureka-account-${account}:/keep` ] } })
  const persevereRunImagePromisified = ({ docker, image, streams, command, opts, delays }) =>
    persevere(() =>
      new Promise((resolve, reject) =>
        docker.run(image, '/bin/sh -l -c'.split(' ').concat(command), null, opts, err => reject(err))
          .on('container', container => resolve(container))
      ),
      delays
    )
  const snapshotMachine = ({ machine, taskId, params }) =>
    controller.resolveInstanceInternalIp(machine.vm_id)
      .then(ip => {
        const docker = new Dockerode({ host: ip, port: config.docker_port })
        const container = docker.getContainer(machine.container_id)
        return persevere(() => container.commit({ repo: params.account, tag: taskId }), [moment.duration(5, 'seconds')])
          .then(() => controller.pushImage({ docker, taskId, params }))
      })
  return {
    terminateTask: taskId =>
      controller.findInstanceForTask(taskId)
        .then(vmId => controller.terminateInstance(vmId)),
    runTask: (taskId, params) => {
      return database.tasks.changeTaskStatusInitializing(taskId)
        .then(() => database.machines.getMachines(params.account))
        .then(machines => machines.find(machine => machine.name === params.machineName))
        .then(machine => snapshotMachine({ machine, taskId, params }))
        .then(imageLocator =>
          controller.runInstance(taskId, params)
            .then(vm => {
              const docker = new Dockerode({ host: vm.ip, port: config.docker_port })
              return persevere(() => controller.pullImage({ docker, image: imageLocator }), Array(6).fill(moment.duration(5, 'seconds')))
                .then(() => logger.info('Successfully pulled %s on %s', imageLocator, vm.ip))
                .then(() => {
                  const wrappedCommand = wrapCommand(params.command, taskId)
                  return persevereRunImagePromisified({ docker, image: imageLocator, command: wrappedCommand, opts: containerBindsPerAccount(params.account), delays: [moment.duration(5, 'seconds')] })
                })
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
    },
    resolveInstanceExternalIp: vmId => controller.resolveInstanceExternalIp(vmId),
    getInstanceTags: vmId => controller.getInstanceTags(vmId),
    getBucketForAccount: account => controller.getBucketForAccount(account)
  }
}
