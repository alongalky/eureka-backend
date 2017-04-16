const logger = require('../../logger/logger')()
// To be removed
function killInstance (vm) {
  vm.delete()
  .then(() => {
    logger.info('Terminated instance %s', vm.name)
  })
  .catch(err => {
    logger.error('Error terminating instance %s', vm.name, err)
  })
}

module.exports = ({ config, gce }) => ({
  controls: 'google',
  runInstance: (taskId, params) => {
    const gZone = gce.zone(config.google.zone)
    const instanceConfig = {
      machineType: 'f1-micro',
      disks: [ {
        boot: true,
        mode: 'READ_WRITE',
        autoDelete: true,
        initializeParams: {
          sourceImage: `projects/${config.google.project}/global/images/${config.google.instance_image}`,
          diskType: `projects/${config.google.project}/zones/${config.google.zone}/diskTypes/pd-standard`,
          diskSizeGb: '10'
        }
      } ],
      tags: [
        'type-runner',
        ['account', params.account].join('-'),
        ['name', params.taskName].join('-')
      ],
      networkInterfaces: [ {
        network: `projects/${config.google.project}/global/networks/default`,
        subnetwork: `projects/${config.google.project}/regions/${config.google.region}/subnetworks/default`,
        accessConfigs: [ {
          name: 'External NAT',
          type: 'ONE_TO_ONE_NAT',
          natIP: null
        } ]
      } ],
      scheduling: {
        preemptible: false,
        onHostMaintenance: 'TERMINATE',
        automaticRestart: false
      },
      serviceAccounts: [ {
        email: '760853174060-compute@developer.gserviceaccount.com',
        scopes: [
          'https://www.googleapis.com/auth/servicecontrol',
          'https://www.googleapis.com/auth/service.management.readonly',
          'https://www.googleapis.com/auth/logging.write',
          'https://www.googleapis.com/auth/monitoring.write',
          'https://www.googleapis.com/auth/trace.append',
          'https://www.googleapis.com/auth/devstorage.read_write'
        ]
      } ]
    }

    const vmName = ['compute', taskId].join('-')

    return gZone.createVM(vmName, instanceConfig)
      .then(([vm, operation, apiResponse]) => {
        logger.info('VM %s starting', vmName)
        // To be removed: Kill instance after 3 minutes
        setTimeout(() => killInstance(vm), 60000 * 3)
        return vm.waitFor('RUNNING')
      })
      .then(([vmMetadata]) => {
        logger.info('VM %s started', vmName)
        return {
          ip: vmMetadata.networkInterfaces[0].accessConfigs[0].natIP
        }
      })
      .catch(err => {
        logger.error('Error starting VM for task', taskId, err)
        return gZone.vm(vmName).delete()
      })
      .catch(err => {
        // TODO: Alert
        logger.error('Impossible to remove failed VM %s', vmName, err)
      })
  }
})
