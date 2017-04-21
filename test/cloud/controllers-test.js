const logger = require('../../logger/logger')
logger.silence = true
const sinon = require('sinon')
const sinonStubPromise = require('sinon-stub-promise')
sinonStubPromise(sinon)

describe.only('Cloud controller', () => {
  const config = {
    cloud_provider: 'google',
    google: {
      region: 'us-east1',
      zone: 'us-east1-b',
      project: 'striped-zebra-11',
      instance_image: 'awesome-machine',
      docker_registry: 'us.docker.registry.io'
    }
  }
  describe('Agnostic', () => {
    const googleController = {
      controls: 'google',
      runInstance: sinon.stub(),
      resolveInstanceExternalIp: sinon.stub(),
      pushImage: sinon.stub(),
      pullImage: sinon.stub()
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
      googleController.resolveInstanceExternalIp.reset()
      database.tasks.changeTaskStatusInitializing.reset()
      database.tasks.changeTaskStatusRunning.reset()
      database.tasks.changeTaskStatusError.reset()
      database.tasks.changeTaskStatusDone.reset()
      database.machines.getMachines.reset()
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
    const params = {
      account: '9876',
      machineName: 'otramachina',
      command: 'wget the.web'
    }
    const taskId = '1234'
    const remoteImageName = [[config.google.docker_registry, config.google.project, params.account].join('/'), taskId].join(':')

    it.only('on happy flow transitions a task to Initializing and then Running', done => {
      database.tasks.changeTaskStatusInitializing.resolves()
      database.machines.getMachines.resolves([ { name: 'testmachina', vm_id: 'Vm123', container_id: '6969' }, { name: 'otramachina', vm_id: 'Vm987', container_id: 'abcd' } ])
      googleController.runInstance.resolves({ ip: '1.2.3.4' })
      googleController.resolveInstanceExternalIp.resolves('9.8.7.6')
      googleController.pushImage.resolves(remoteImageName)
      googleController.pullImage.resolves()
      Dockerode.prototype.run.returns({ on: (event, callback) => callback('1423') })
      Dockerode.prototype.getContainer.returns(dContainer)
      database.tasks.changeTaskStatusRunning.resolves()
      dContainer.commit.resolves()

      cloud.runTask(taskId, params)
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '9.8.7.6' })
          sinon.assert.calledWith(database.machines.getMachines, { account: '9876' })
          sinon.assert.calledWith(Dockerode.prototype.getContainer, 'abcd')
          sinon.assert.alwaysCalledWith(dContainer.commit, { repo: '9876', tag: '1234' })
          sinon.assert.calledWithMatch(googleController.pushImage, { taskId: '1234', params } )
          sinon.assert.calledWith(googleController.resolveInstanceExternalIp, 'Vm987')
          sinon.assert.calledOnce(googleController.runInstance)
          sinon.assert.calledWith(googleController.runInstance, '1234', params)
          sinon.assert.alwaysCalledWithMatch(googleController.pullImage, { image: remoteImageName })
          sinon.assert.alwaysCalledWithMatch(Dockerode.prototype.run, remoteImageName, params.command.split(' '))
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
    it('transitions task from Initializing to Error if changeTaskStatusInitializing fails', done => {
      database.tasks.changeTaskStatusInitializing.rejects(new Error('Crazy database error'))

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.tasks.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.tasks.changeTaskStatusError)
          sinon.assert.callOrder(database.tasks.changeTaskStatusInitializing, database.tasks.changeTaskStatusError)
          sinon.assert.calledWith(database.tasks.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
          sinon.assert.notCalled(database.tasks.changeTaskStatusRunning)
          sinon.assert.notCalled(database.tasks.changeTaskStatusDone)
          done()
        })
    })
    it('transitions task from Initializing to Error if runInstance fails', done => {
      database.tasks.changeTaskStatusInitializing.resolves()
      googleController.runInstance.rejects(new Error('Crazy API Error'))

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.tasks.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.tasks.changeTaskStatusError)
          sinon.assert.callOrder(database.tasks.changeTaskStatusInitializing, database.tasks.changeTaskStatusError)
          sinon.assert.calledWith(database.tasks.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
          sinon.assert.notCalled(database.tasks.changeTaskStatusRunning)
          sinon.assert.notCalled(database.tasks.changeTaskStatusDone)
          done()
        })
    })
    it('transitions task to Error if docker all pulls fail', done => {
      database.tasks.changeTaskStatusInitializing.resolves()
      googleController.runInstance.resolves({ ip: '1.2.3.4' })
      Dockerode.prototype.pull.rejects(new Error('Crazy docker error'))
      Dockerode.prototype.run.rejects(new Error('Crazy docker error'))

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.tasks.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.tasks.changeTaskStatusError)
          sinon.assert.callOrder(database.tasks.changeTaskStatusInitializing, database.tasks.changeTaskStatusError)
          sinon.assert.calledWith(database.tasks.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
          sinon.assert.notCalled(database.tasks.changeTaskStatusRunning)
          sinon.assert.notCalled(database.tasks.changeTaskStatusDone)
          done()
        })
    })
    it('transitions task to Error if all docker runs fail', done => {
      database.tasks.changeTaskStatusInitializing.resolves()
      googleController.runInstance.resolves({ ip: '1.2.3.4' })
      Dockerode.prototype.pull.resolves()
      Dockerode.prototype.run.rejects(new Error('Crazy docker error'))

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.tasks.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.tasks.changeTaskStatusError)
          sinon.assert.callOrder(database.tasks.changeTaskStatusInitializing, database.tasks.changeTaskStatusError)
          sinon.assert.calledWith(database.tasks.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.tasks.changeTaskStatusError, '1234')
          sinon.assert.notCalled(database.tasks.changeTaskStatusRunning)
          sinon.assert.notCalled(database.tasks.changeTaskStatusDone)
          done()
        })
    })
  })
  describe('Google Runner', () => {
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

    const googleController = require('../../cloud/google/controller')({
      config,
      gce
    })

    beforeEach(() => {
      gZone.createVM.reset()
      gZone.vm.reset()
      deleteVm.delete.reset()
      gVm.waitFor.reset()
    })

    it('on happy flow formatted VM metadata is returned', done => {
      gZone.createVM.resolves([gVm])
      gVm.waitFor.resolves([{
        networkInterfaces: [{
          accessConfigs: [{
            natIP: '1.2.3.4'
          }]
        }]
      }])

      googleController.runInstance('1234', {})
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

    it('deletes instance on API error', done => {
      gZone.createVM.rejects(new Error('Crazy API Error'))
      gZone.vm.returns(deleteVm)
      deleteVm.delete.resolves()

      googleController.runInstance('1234', {})
      .then(() => {
        sinon.assert.calledOnce(gZone.vm)
        sinon.assert.calledWith(gZone.vm, 'runner-1234')
        sinon.assert.calledOnce(deleteVm.delete)
        done()
      })
    })

    it('deletes instance when fails to wait for RUNNING state', (done) => {
      gZone.createVM.resolves([gVm])
      gZone.vm.returns(deleteVm)
      deleteVm.delete.resolves()
      gVm.waitFor.rejects(new Error('waitFor API Error'))

      googleController.runInstance('1234', {})
      .then(() => {
        sinon.assert.calledOnce(gZone.vm)
        sinon.assert.calledWith(gZone.vm, 'compute-1234')
        sinon.assert.calledOnce(deleteVm.delete)
        done()
      })
    })
  })
})
