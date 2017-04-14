const gce = require('@google-cloud/compute')()

// To be removed
function killInstance(vm) {
  vm.delete()
  .then(() => {
    console.log("Terminated instance %s", vm.name)
  })
  .catch(err => {
    console.error("Error terminating instance %s", vm.name, err)
  })
}

module.exports = ({ config, database, cloud, gce }) => (taskId, params) => {
  const gZone = gce.zone(config.google.region)
  const instanceConfig = {
    machineType: 'f1-micro',
    os: 'debian',
    tags: [
      ['account', params.account].join('-'),
      ['name', params.taskName].join('-')
    ]
  }
  return gZone.createVM([ 'compute', taskId ].join('-'), instanceConfig)
  .then(([vm, operation, apiResponse]) => {
    console.log('VM %s starting', vm.name)
    // To be removed: Kill instance after 1 minute
    setTimeout(() => killInstance(vm), 60000)
    return vm.waitFor('RUNNING').then(() => vm)
  })
  .then(vm => {
    console.log('VM %s started', vm.name)
    return database.changeTaskStatusRunning(taskId)
    // TODO: cloud.startTask({ ip: vm. , params })
  })
  .catch(err => {
    console.error('Error starting VM for task', taskId, err)
    return database.changeTaskStatus(taskId, 'Error')
  })
}
