const winston = require('winston')

// To be removed
function killInstance (vm) {
  vm.delete()
  .then(() => {
    winston.log('Terminated instance %s', vm.name)
  })
  .catch(err => {
    winston.error('Error terminating instance %s', vm.name, err)
  })
}

module.exports = ({ config, database, gce }) => ({
  runInstance: (taskId, params) => {
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
      winston.log('VM compute-%s starting', taskId)
      // To be removed: Kill instance after 1 minute
      setTimeout(() => killInstance(vm), 60000)
      return vm.waitFor('RUNNING')
    })
    .then(() => {
      winston.log('VM compute-%s started', taskId)
      return database.changeTaskStatusRunning(taskId)
    })
    .catch(err => {
      winston.error('Error starting VM for task', taskId, err)
      return database.changeTaskStatus(taskId, 'Error')
    })
  }
})
