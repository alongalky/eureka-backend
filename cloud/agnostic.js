const moment = require('moment')
const logger = require('../logger/logger')()

module.exports = ({ config, database, Dockerode, controller, persevere }) => {
  const snapshotMachine = ({ machine, taskId, params }) =>
    controller.resolveInstanceInternalIp(machine.vm_id)
      .then(ip => {
        const docker = new Dockerode({ host: ip, port: config.docker_port })
        const container = docker.getContainer(machine.container_id)
        logger.info('Committing container for task %s container %s from %s', taskId, machine.container_id, machine.vm_id)
        return persevere(() => container.commit({ repo: params.account, tag: taskId, pause: false }), [moment.duration(5, 'seconds')])
          .then(() => {
            logger.info('Committed container for task', taskId)
            logger.info('Going to push image for task', taskId)
            return controller.pushImage({ docker, taskId, params })
          })
          .then(imageLocator => {
            logger.info('Succesfully pushed for task %s image %s', taskId, imageLocator)
            return imageLocator
          })
      })
  const terminateTask = taskId =>
      controller.findInstanceForTask(taskId)
        .then(vmId => controller.terminateInstance(vmId))

  return {
    terminateTask,

    runTask: (taskId, params) =>
      database.tasks.changeTaskStatusInitializing(taskId)
        .then(() => Promise.all([
          database.machines.getMachines(params.account)
            .then(machines => machines.find(machine => machine.name === params.machineName))
            .then(machine => snapshotMachine({ machine, taskId, params })),
          database.tiers.getTier(params.tierId)
            .then(tier => {
              logger.info('VM for task %s starting', taskId)
              return controller.runInstance({ taskId, tier, params })
            })
            .then(vm => {
              logger.info('VM for task %s started', taskId)
              return vm
            })
        ]))
        .catch(err => {
          logger.error('Error starting task', taskId, err)
          terminateTask(taskId).catch(() => {})
          return database.tasks.changeTaskStatusError(taskId)
        })
        .catch(err => {
          // TODO: Alert
          logger.error('Deployment for task %s failed but status could not be updated', taskId, err)
        }),

    resolveInstanceExternalIp: vmId => controller.resolveInstanceExternalIp(vmId),
    getInstanceTags: vmId => controller.getInstanceTags(vmId),
    getBucketForAccount: account => controller.getBucketForAccount(account)
  }
}
