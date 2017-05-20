const logger = require('../../logger/logger')
logger.silence = true
const sinon = require('sinon')
const sinonStubPromise = require('sinon-stub-promise')
sinonStubPromise(sinon)

describe('Cloud controller', () => {
  const config = {
    cloud_provider: 'google',
    google: {
      region: 'us-east1',
      zone: 'us-east1-b',
      project: 'striped-zebra-11',
      instance_image: 'awesome-image',
      docker_registry: 'us.docker.registry.io'
    }
  }
  const params = {
    account: '9876',
    machineName: 'otramachina',
    command: 'wget the.web'
  }
  const taskId = '1234'
  describe('Agnostic', () => {
    const googleController = {
      controls: 'google',
      runInstance: sinon.stub(),
      terminateInstance: sinon.stub(),
      resolveInstanceExternalIp: sinon.stub(),
      resolveInstanceInternalIp: sinon.stub(),
      pushImage: sinon.stub(),
      pullImage: sinon.stub(),
      findInstanceForTask: taskId => Promise.resolve('runner-' + taskId)
    }
    const database = {
      tasks: {
        changeTaskStatusInitializing: sinon.stub(),
        changeTaskStatusRunning: sinon.stub(),
        changeTaskStatusError: sinon.stub(),
        changeTaskStatusDone: sinon.stub()
      },
      machines: {
        getMachines: sinon.stub()
      },
      tiers: {
        getTier: sinon.stub()
      }
    }
    const dContainer = {
      commit: sinon.stub()
    }

    const Dockerode = sinon.stub()
    Dockerode.prototype.run = sinon.stub()
    Dockerode.prototype.getContainer = sinon.stub()

    beforeEach(() => {
      googleController.runInstance.reset()
      googleController.terminateInstance.reset()
      googleController.pullImage.reset()
      googleController.pushImage.reset()
      googleController.resolveInstanceExternalIp.reset()
      googleController.resolveInstanceInternalIp.reset()
      database.tasks.changeTaskStatusInitializing.reset()
      database.tasks.changeTaskStatusRunning.reset()
      database.tasks.changeTaskStatusError.reset()
      database.tasks.changeTaskStatusDone.reset()
      database.machines.getMachines.reset()
      database.tiers.getTier.reset()
      Dockerode.reset()
      Dockerode.prototype.run.reset()
      dContainer.commit.reset()
    })

    const controllers = [googleController]
    const persevere = callback => callback()
    const cloud = require('../../cloud/agnostic')({
      config,
      database,
      Dockerode,
      controller: controllers.find(c => c.controls === config.cloud_provider),
      persevere
    })
    const remoteImageName = [[config.google.docker_registry, config.google.project, params.account].join('/'), taskId].join(':')
    const tier = { cloud_type_name: 'micro', local_disk_gb: 20 }
    describe('happy flow', () => {
      beforeEach(() => {
        database.tasks.changeTaskStatusInitializing.resolves()
        database.machines.getMachines.resolves([ { name: 'testmachina', vm_id: 'Vm123', container_id: '6969' }, { name: 'otramachina', vm_id: 'Vm987', container_id: 'abcd' } ])
        database.tiers.getTier.resolves(tier)
        googleController.runInstance.resolves({ ip: '1.2.3.4' })
        googleController.resolveInstanceInternalIp.resolves('9.8.7.6')
        googleController.pushImage.resolves(remoteImageName)
        googleController.pullImage.resolves()
        Dockerode.prototype.run.returns({ on: (event, callback) => callback('1423') })
        Dockerode.prototype.getContainer.returns(dContainer)
        database.tasks.changeTaskStatusRunning.resolves()
        dContainer.commit.resolves()
      })
      it('transitions a task to Initializing and then Running', done => {
        cloud.runTask(taskId, params)
          .then(() => {
            sinon.assert.calledOnce(database.tasks.changeTaskStatusInitializing)
            sinon.assert.calledOnce(database.tasks.changeTaskStatusRunning)
            sinon.assert.callOrder(database.tasks.changeTaskStatusInitializing, database.tasks.changeTaskStatusRunning)
            sinon.assert.calledWith(database.tasks.changeTaskStatusInitializing, '1234')
            sinon.assert.calledWith(database.tasks.changeTaskStatusRunning, '1234')
            sinon.assert.notCalled(database.tasks.changeTaskStatusError)
            sinon.assert.notCalled(database.tasks.changeTaskStatusDone)
            done()
          })
      })
      it('it initializes Dockerode twice, once for machina and once for runner', done => {
        cloud.runTask(taskId, params)
          .then(() => {
            sinon.assert.calledTwice(Dockerode)
            sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
            sinon.assert.calledWithMatch(Dockerode, { host: '9.8.7.6' })
            done()
          })
      })
      it('the right machine and container are obtained, resolved, tagged and pushed', done => {
        cloud.runTask(taskId, params)
          .then(() => {
            sinon.assert.calledWith(database.machines.getMachines, '9876')
            sinon.assert.calledWith(Dockerode.prototype.getContainer, 'abcd')
            sinon.assert.alwaysCalledWith(dContainer.commit, { repo: '9876', tag: '1234' })
            sinon.assert.calledWithMatch(googleController.pushImage, { taskId: '1234', params })
            sinon.assert.calledWith(googleController.resolveInstanceInternalIp, 'Vm987')
            done()
          })
      })
      it('only one runner machine is started, properly tagged and proper image pulled', done => {
        cloud.runTask(taskId, params)
          .then(() => {
            sinon.assert.calledOnce(googleController.runInstance)
            sinon.assert.calledWith(googleController.runInstance, { taskId: '1234', tier, params })
            sinon.assert.alwaysCalledWithMatch(googleController.pullImage, { image: remoteImageName })
            done()
          })
      })
    })
    describe('error conditions', () => {
      beforeEach(() => {
        Dockerode.prototype.getContainer.returns(dContainer)
      })
      it('does not initialize any Docker controller if changeTaskStatusInitializing fails', done => {
        database.tasks.changeTaskStatusInitializing.rejects(new Error('Crazy database error'))

        cloud.runTask('1234', params)
          .then(() => {
            sinon.assert.notCalled(Dockerode)
            sinon.assert.notCalled(googleController.runInstance)
            sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
            done()
          })
      })
      it('does not initialize any Docker controller if resolving IP for VM fails', done => {
        database.tasks.changeTaskStatusInitializing.resolves()
        googleController.resolveInstanceInternalIp.rejects(new Error('Crazy API Error'))

        cloud.runTask('1234', params)
          .then(() => {
            sinon.assert.notCalled(Dockerode)
            sinon.assert.notCalled(googleController.runInstance)
            sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
            done()
          })
      })
      it('transitions task to Error if commit fails over the machina\'s Docker controller', done => {
        database.machines.getMachines.resolves([ { name: 'testmachina', vm_id: 'Vm123', container_id: '6969' }, { name: 'otramachina', vm_id: 'Vm987', container_id: 'abcd' } ])
        database.tasks.changeTaskStatusInitializing.resolves()
        googleController.resolveInstanceInternalIp.resolves('9.8.7.6')
        database.tiers.getTier.resolves(tier)
        googleController.runInstance.resolves({ ip: '2.2.2.2' })
        dContainer.commit.rejects(new Error('Crazy Docker Error'))

        cloud.runTask('1234', params)
          .then(() => {
            sinon.assert.calledOnce(Dockerode)
            sinon.assert.calledWith(googleController.resolveInstanceInternalIp, 'Vm987')
            sinon.assert.calledWithMatch(Dockerode, { host: '9.8.7.6' })
            sinon.assert.notCalled(googleController.pushImage)
            sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
            done()
          })
      })
      it('transitions task to Error if push fails over the machina\'s Docker controller', done => {
        database.machines.getMachines.resolves([ { name: 'testmachina', vm_id: 'Vm123', container_id: '6969' }, { name: 'otramachina', vm_id: 'Vm987', container_id: 'abcd' } ])
        database.tasks.changeTaskStatusInitializing.resolves()
        googleController.resolveInstanceInternalIp.resolves('9.8.7.6')
        dContainer.commit.resolves()
        database.tiers.getTier.resolves(tier)
        googleController.runInstance.resolves({ ip: '2.2.2.2' })
        googleController.pushImage.rejects(new Error('Crazy Docker Error'))

        cloud.runTask('1234', params)
          .then(() => {
            sinon.assert.calledOnce(Dockerode)
            sinon.assert.calledWith(googleController.resolveInstanceInternalIp, 'Vm987')
            sinon.assert.calledWithMatch(Dockerode, { host: '9.8.7.6' })
            sinon.assert.calledOnce(googleController.terminateInstance)
            sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
            done()
          })
      })
      it('transitions task to Error if runInstance fails over the machina\'s Docker controller', done => {
        database.machines.getMachines.resolves([ { name: 'testmachina', vm_id: 'Vm123', container_id: '6969' }, { name: 'otramachina', vm_id: 'Vm987', container_id: 'abcd' } ])
        database.tasks.changeTaskStatusInitializing.resolves()
        googleController.resolveInstanceInternalIp.resolves('9.8.7.6')
        dContainer.commit.resolves()
        googleController.pushImage.resolves()
        googleController.runInstance.rejects(new Error('Crazy API error'))

        cloud.runTask('1234', params)
          .then(() => {
            sinon.assert.calledOnce(Dockerode)
            sinon.assert.calledWith(googleController.resolveInstanceInternalIp, 'Vm987')
            sinon.assert.calledWithMatch(Dockerode, { host: '9.8.7.6' })
            sinon.assert.notCalled(googleController.pullImage)
            sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
            done()
          })
      })
      it('transitions task to Error if docker pull fails', done => {
        database.machines.getMachines.resolves([ { name: 'testmachina', vm_id: 'Vm123', container_id: '6969' }, { name: 'otramachina', vm_id: 'Vm987', container_id: 'abcd' } ])
        database.tasks.changeTaskStatusInitializing.resolves()
        googleController.resolveInstanceInternalIp.resolves('9.8.7.6')
        database.tiers.getTier.resolves(tier)
        dContainer.commit.resolves()
        googleController.pushImage.resolves(remoteImageName)
        googleController.runInstance.resolves({ ip: '2.2.2.2' })
        googleController.pullImage.rejects(new Error('Crazy Docker Error'))

        cloud.runTask('1234', params)
          .then(() => {
            sinon.assert.calledTwice(Dockerode)
            sinon.assert.calledWithMatch(Dockerode, { host: '9.8.7.6' })
            sinon.assert.calledWithMatch(Dockerode, { host: '2.2.2.2' })
            sinon.assert.calledWith(googleController.resolveInstanceInternalIp, 'Vm987')
            sinon.assert.calledWithMatch(googleController.pullImage, { image: remoteImageName })
            sinon.assert.notCalled(Dockerode.prototype.run)
            sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
            done()
          })
      })
      it('transitions task to Error if docker run fails', done => {
        database.machines.getMachines.resolves([ { name: 'testmachina', vm_id: 'Vm123', container_id: '6969' }, { name: 'otramachina', vm_id: 'Vm987', container_id: 'abcd' } ])
        database.tasks.changeTaskStatusInitializing.resolves()
        googleController.resolveInstanceInternalIp.resolves('9.8.7.6')
        database.tiers.getTier.resolves(tier)
        dContainer.commit.resolves()
        googleController.pushImage.resolves(remoteImageName)
        googleController.runInstance.resolves({ ip: '2.2.2.2' })
        googleController.pullImage.resolves()
        Dockerode.prototype.run = (a, b, c, d, errorCallback) => errorCallback(new Error('Crazy Docker Error'))

        cloud.runTask('1234', params)
          .then(() => {
            sinon.assert.calledTwice(Dockerode)
            sinon.assert.calledWithMatch(Dockerode, { host: '9.8.7.6' })
            sinon.assert.calledWithMatch(Dockerode, { host: '2.2.2.2' })
            sinon.assert.calledWith(googleController.resolveInstanceInternalIp, 'Vm987')
            sinon.assert.calledWithMatch(googleController.pullImage, { image: remoteImageName })
            sinon.assert.notCalled(database.tasks.changeTaskStatusRunning)
            sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
            done()
            Dockerode.prototype.run = sinon.stub()
          })
      })
    })
  })
  describe('Google', () => {
    const gZone = {
      createVM: sinon.stub(),
      vm: sinon.stub()
    }
    const gce = {
      zone: () => gZone
    }
    const gVm = {
      name: 'test-vm',
      waitFor: sinon.stub()
    }
    const deleteVm = {
      delete: sinon.stub()
    }
    const gAuth = {
      getToken: null
    }

    const googleController = require('../../cloud/google/controller')({
      config,
      gce,
      gAuth
    })

    beforeEach(() => {
      gZone.createVM.reset()
      gZone.vm.reset()
      deleteVm.delete.reset()
      gVm.waitFor.reset()
    })

    describe('runInstance', () => {
      const tier = { cloud_type_name: 'micro', local_disk_gb: 20 }
      it('on happy flow formatted VM metadata is returned', done => {
        gZone.createVM.resolves([gVm])
        gVm.waitFor.resolves([{
          networkInterfaces: [{
            networkIP: '1.2.3.4'
          }]
        }])

        googleController.runInstance({ taskId: '1234', tier, params: {} })
          .then(vm => {
            sinon.assert.calledOnce(gZone.createVM)
            // Checks if instance gets named correctly
            sinon.assert.calledWith(gZone.createVM, 'runner-1234', sinon.match.any)
            sinon.assert.calledOnce(gVm.waitFor)
            sinon.assert.calledWith(gVm.waitFor, 'RUNNING')
            if (vm.ip !== '1.2.3.4') {
              sinon.assert.fail('Metadata not returned correctly')
            }
            done()
          })
      })
      it('on happy flow instance is tagged correctly', done => {
        const params =
          {
            account: '9898',
            taskName: 'awesomecalculus'
          }
        gZone.createVM.resolves([gVm])
        gVm.waitFor.resolves([{
          networkInterfaces: [{
            accessConfigs: [{
              natIP: '1.2.3.4'
            }]
          }]
        }])

        googleController.runInstance({ taskId: '1234', tier, params })
          .then(vm => {
            sinon.assert.calledOnce(gZone.createVM)
            // Checks if instance gets tagged correctly
            sinon.assert.calledWithMatch(gZone.createVM, 'runner-1234',
              {
                tags: [
                  'type-runner',
                  ['account', params.account].join('-'),
                  ['task', '1234'].join('-'),
                  ['taskname', params.taskName].join('-')
                ]
              }
            )
            done()
          })
      })
      it('on happy flow instance has proper disk image, size and type standard', done => {
        const tier = { cloud_type_name: 'micro', local_disk_gb: 20 }
        gZone.createVM.resolves([gVm])
        gVm.waitFor.resolves([{
          networkInterfaces: [{
            accessConfigs: [{
              natIP: '1.2.3.4'
            }]
          }]
        }])

        googleController.runInstance({ taskId: '1234', tier, params: {} })
          .then(vm => {
            sinon.assert.calledOnce(gZone.createVM)
            sinon.assert.calledWithMatch(gZone.createVM, 'runner-1234',
              {
                machineType: tier.cloud_type_name,
                disks: [{
                  autoDelete: true,
                  boot: true,
                  initializeParams: {
                    diskSizeGb: 20,
                    diskType: `projects/${config.google.project}/zones/${config.google.zone}/diskTypes/pd-standard`,
                    sourceImage: `projects/${config.google.project}/global/images/${config.google.instance_image}`
                  },
                  mode: 'READ_WRITE'
                }]
              }
            )
            done()
          })
      })
      it('on happy flow instance has proper disk image, size and type ssd', done => {
        const tier = { cloud_type_name: 'micro', ssd_disk_gb: 80 }
        gZone.createVM.resolves([gVm])
        gVm.waitFor.resolves([{
          networkInterfaces: [{
            accessConfigs: [{
              natIP: '1.2.3.4'
            }]
          }]
        }])

        googleController.runInstance({ taskId: '1234', tier, params: {} })
          .then(vm => {
            sinon.assert.calledOnce(gZone.createVM)
            sinon.assert.calledWithMatch(gZone.createVM, 'runner-1234',
              {
                machineType: tier.cloud_type_name,
                disks: [{
                  autoDelete: true,
                  boot: true,
                  initializeParams: {
                    diskSizeGb: 80,
                    diskType: `projects/${config.google.project}/zones/${config.google.zone}/diskTypes/pd-ssd`,
                    sourceImage: `projects/${config.google.project}/global/images/${config.google.instance_image}`
                  },
                  mode: 'READ_WRITE'
                }]
              }
            )
            done()
          })
      })
      it('throws and does not delete instance on createVM API error', done => {
        gZone.createVM.rejects(new Error('Crazy API Error'))
        gZone.vm.returns(deleteVm)
        deleteVm.delete.resolves()

        googleController.runInstance({ taskId: '1234', tier, params: {} })
        // Notice the catch
          .catch(() => {
            sinon.assert.notCalled(deleteVm.delete)
            done()
          })
      })

      it('throws and does not delete instance when fails to wait for RUNNING state', (done) => {
        gZone.createVM.resolves([gVm])
        gZone.vm.returns(deleteVm)
        deleteVm.delete.resolves()
        gVm.waitFor.rejects(new Error('waitFor API Error'))

        googleController.runInstance({ taskId: '1234', tier, params: {} })
          .catch(() => {
            sinon.assert.notCalled(deleteVm.delete)
            done()
          })
      })
    })

    describe('Docker registry interactions', () => {
      const dImage = {
        push: null,
        tag: sinon.stub()
      }
      const dModem = {
        followProgress: null
      }
      const docker = {
        getImage: sinon.stub(),
        modem: dModem,
        pull: null
      }
      const repo = `${config.google.docker_registry}/${config.google.project}/${params.account}`
      const tag = taskId
      const fakestream = {}
      describe('pushImage', () => {
        it('on happy flow returns properly formatted image locator', done => {
          gAuth.getToken = callback => callback(null, 'token')
          docker.getImage.returns(dImage)
          dImage.tag.resolves()
          dImage.push = ({authconfig}, callback) => {
            if (authconfig.password !== 'token') {
              sinon.assert.fail('token passed incorrectly')
              done()
            } else {
              callback(null, fakestream)
            }
          }
          dModem.followProgress = (stream, onFinishedCallback) =>
            onFinishedCallback(null)

          googleController.pushImage({ docker, taskId, params })
            .then(imageLocator => {
              if (imageLocator !== `${repo}:${tag}`) {
                sinon.assert.fail('returned image locator has not proper format')
              }
              // Get local image, and not the remote with full repo
              sinon.assert.calledWith(docker.getImage, `${params.account}:${taskId}`)
              sinon.assert.calledWith(dImage.tag, {repo, tag})
              done()
            })
        })
        it('throws when tagging fails', done => {
          dImage.tag.rejects()
          googleController.pushImage({ docker, taskId, params })
            .catch(() => {
              done()
            })
        })
        it('throws when gAuth getToken fails', done => {
          dImage.tag.resolves()
          gAuth.getToken = callback => callback('getToken ERROR', null)
          googleController.pushImage({ docker, taskId, params })
            .catch(() => {
              done()
            })
        })
        it('throws when pushing fails', done => {
          gAuth.getToken = callback => callback(null, 'token')
          docker.getImage.returns(dImage)
          dImage.tag.resolves()
          dImage.push = ({authconfig}, callback) => {
            if (authconfig.password !== 'token') {
              sinon.assert.fail('token passed incorrectly')
              done()
            } else {
              callback('push ERROR', null)
            }
          }
          googleController.pushImage({ docker, taskId, params })
            .catch(() => {
              done()
            })
        })
      })
      describe('pullImage', () => {
        it('on happy flow returns properly formatted image locator', done => {
          gAuth.getToken = callback => callback(null, 'token')
          docker.pull = (image, {authconfig}, callback) => {
            if (authconfig.password !== 'token') {
              sinon.assert.fail('token passed incorrectly')
              done()
            } else if (image !== 'Image/Locator:39484') {
              sinon.assert.fail('image locator has been altered')
              done()
            } else {
              callback(null, fakestream)
            }
          }
          dModem.followProgress = (stream, onFinishedCallback) =>
            onFinishedCallback(null)

          googleController.pullImage({ docker, image: 'Image/Locator:39484' })
            .then(imageLocator => {
              if (imageLocator !== 'Image/Locator:39484') {
                sinon.assert.fail('returned image locator has not proper format')
              }
              done()
            })
        })
        it('throws when gAuth getToken fails', done => {
          dImage.tag.resolves()
          gAuth.getToken = callback => callback('getToken ERROR', null)
          googleController.pushImage({ docker, taskId, params })
            .catch(() => {
              done()
            })
        })
        it('throws when pull fails', done => {
          gAuth.getToken = callback => callback(null, 'token')
          docker.pull = (image, {authconfig}, callback) => {
            if (authconfig.password !== 'token') {
              sinon.assert.fail('token passed incorrectly')
              done()
            } else if (image !== 'Image/Locator:39484') {
              sinon.assert.fail('image locator has been altered')
              done()
            } else {
              callback('pull ERROR', null)
            }
          }
          dModem.followProgress = (stream, onFinishedCallback) =>
            onFinishedCallback(null)

          googleController.pullImage({ docker, image: 'Image/Locator:39484' })
            .catch(() => {
              done()
            })
        })
      })
    })
    describe('terminateInstance', () => {
      beforeEach(() => {
        gZone.vm.returns(deleteVm)
      })
      it('happy flow', done => {
        deleteVm.delete.resolves()
        googleController.terminateInstance('1234')
          .then(vm => {
            sinon.assert.calledOnce(gZone.vm)
            sinon.assert.calledOnce(deleteVm.delete)
            sinon.assert.calledWith(gZone.vm, '1234')
            done()
          })
      })

      it('throws on vm.delete API error', done => {
        deleteVm.delete.rejects(new Error('Crazy API error'))
        googleController.terminateInstance('1234')
          .catch(vm => {
            sinon.assert.calledOnce(gZone.vm)
            sinon.assert.calledOnce(deleteVm.delete)
            sinon.assert.calledWith(gZone.vm, '1234')
            done()
          })
      })
    })
  })
})
