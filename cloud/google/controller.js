module.exports = ({ config, gce, gAuth }) => {
  const gZone = gce.zone(config.google.zone)
  const getGAuthToken = () =>
    new Promise((resolve, reject) => {
      gAuth.getToken((err, token) => {
        if (err) {
          err.message = 'getGAuthToken ' + err.message
          reject(err)
        } else {
          resolve(token)
        }
      })
    })
  return {
    controls: 'google',
    resolveInstanceInternalIp: instanceId => gZone.vm(instanceId).get().then(([vm]) => vm.metadata.networkInterfaces[0].networkIP),
    resolveInstanceExternalIp: instanceId => gZone.vm(instanceId).get().then(([vm]) => vm.metadata.networkInterfaces[0].accessConfigs[0].natIP),
    findInstanceForTask: taskId => Promise.resolve('runner-' + taskId),
    getInstanceTags: instanceId => gZone.vm(instanceId).getTags().then(([tags]) => tags),
    getBucketForAccount: account => Promise.resolve('eureka-account-' + account),
    runInstance: ({ taskId, tier, params }) => {
      const standardDisk = `projects/${config.google.project}/zones/${config.google.zone}/diskTypes/pd-standard`
      const ssdDisk = `projects/${config.google.project}/zones/${config.google.zone}/diskTypes/pd-ssd`
      const instanceConfig = {
        machineType: tier.cloud_type_name,
        disks: [ {
          boot: true,
          mode: 'READ_WRITE',
          autoDelete: true,
          initializeParams: {
            sourceImage: `projects/${config.google.project}/global/images/${config.google.instance_image}`,
            diskType: tier.local_disk_gb ? standardDisk : ssdDisk,
            diskSizeGb: tier.local_disk_gb || tier.ssd_disk_gb
          }
        } ],
        tags: [
          'type-runner',
          ['account', params.account].join('-'),
          ['task', taskId].join('-'),
          ['taskname', params.taskName].join('-')
        ],
        metadata: {
          items: [
            {
              key: 'eureka_endpoint',
              value: config.eureka_endpoint
            }
          ]
        },
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
          email: config.google.project_service_account,
          scopes: [
            'https://www.googleapis.com/auth/datastore',
            'https://www.googleapis.com/auth/compute',
            'https://www.googleapis.com/auth/servicecontrol',
            'https://www.googleapis.com/auth/service.management.readonly',
            'https://www.googleapis.com/auth/logging.write',
            'https://www.googleapis.com/auth/monitoring.write',
            'https://www.googleapis.com/auth/trace.append',
            'https://www.googleapis.com/auth/devstorage.full_control'
          ]
        } ]
      }

      const vmName = ['runner', taskId].join('-')

      return gZone.createVM(vmName, instanceConfig)
        .then(([vm]) => vm.waitFor('RUNNING'))
        .then(([vmMetadata]) => ({ ip: vmMetadata.networkInterfaces[0].networkIP }))
    },
    terminateInstance: vmId => gZone.vm(vmId).delete(),
    pushImage: ({ docker, taskId, params }) => {
      // imageName format is REPO:TAG, in API calls these need to be passed as { repo: , tag: }
      const localImageName = [params.account, taskId].join(':')
      const remoteImageName = [[config.google.docker_registry, config.google.project, params.account].join('/'), taskId].join(':')
      const remoteImageAPIName = { repo: [config.google.docker_registry, config.google.project, params.account].join('/'), tag: taskId }
      let dockerImage = docker.getImage(localImageName)
      return dockerImage.tag(remoteImageAPIName)
        .then(() => getGAuthToken())
        .then(token => {
          const dockerAuth = {
            username: 'oauth2accesstoken',
            password: token,
            serveraddress: config.google.docker_registry
          }
          dockerImage = docker.getImage(remoteImageName)
          return new Promise((resolve, reject) => {
            dockerImage.push({ authconfig: dockerAuth }, (err, stream) => {
              if (err || !stream) {
                err.message = 'pushImage ' + err.message
                reject(err)
              } else {
                const onFinished = err => {
                  if (err) {
                    err.message = 'pushImage ' + err.message
                    reject(err)
                  } else {
                    resolve(remoteImageName)
                  }
                }
                docker.modem.followProgress(stream, onFinished)
              }
            })
          })
        })
    },
    pullImage: ({ docker, image }) => {
      return getGAuthToken().then(token => {
        const dockerAuth = {
          username: 'oauth2accesstoken',
          password: token,
          serveraddress: config.google.docker_registry
        }
        return new Promise((resolve, reject) => {
          docker.pull(image, { authconfig: dockerAuth }, (err, stream) => {
            if (err || !stream) {
              err.message = 'pullImage ' + err.message
              reject(err)
            } else {
              const onFinished = err => {
                if (err) {
                  err.message = 'pullImage ' + err.message
                  reject(err)
                } else {
                  resolve(image)
                }
              }
              docker.modem.followProgress(stream, onFinished)
            }
          })
        })
      })
    }
  }
}
