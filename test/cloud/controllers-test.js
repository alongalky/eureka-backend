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
      instance_image: 'awesome-machine'
    }
  }
  describe('Agnostic', () => {
    const googleController = {
      controls: 'google',
      runInstance: sinon.stub()
    }
    const database = {
      changeTaskStatusInitializing: sinon.stub(),
      changeTaskStatusRunning: sinon.stub(),
      changeTaskStatusError: sinon.stub(),
      changeTaskStatusDone: sinon.stub()
    }
    const Dockerode = sinon.stub()
    Dockerode.prototype.pull = sinon.stub()
    Dockerode.prototype.run = sinon.stub()
    beforeEach(() => {
      googleController.runInstance.reset()
      database.changeTaskStatusInitializing.reset()
      database.changeTaskStatusRunning.reset()
      database.changeTaskStatusError.reset()
      database.changeTaskStatusDone.reset()
      Dockerode.prototype.pull.reset()
      Dockerode.prototype.run.reset()
    })
    const cloud = require('../../cloud/agnostic')({
      config,
      database,
      Dockerode,
      controllers: [googleController],
      delayFactorInMs: 1
    })
    it('on happy flow transitions a task to Initializing and then Running', done => {
      database.changeTaskStatusInitializing.resolves()
      googleController.runInstance.resolves({ ip: '1.2.3.4' })
      Dockerode.prototype.pull.resolves()
      Dockerode.prototype.run.resolves()

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.changeTaskStatusRunning)
          sinon.assert.callOrder(database.changeTaskStatusInitializing, database.changeTaskStatusRunning)
          sinon.assert.calledWith(database.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.changeTaskStatusRunning, '1234')
          sinon.assert.notCalled(database.changeTaskStatusError)
          sinon.assert.notCalled(database.changeTaskStatusDone)
          done()
        })
    })
    it('transitions task to Running on the second succesfull docker pull attempt and happy flow', done => {
      database.changeTaskStatusInitializing.resolves()
      googleController.runInstance.resolves({ ip: '1.2.3.4' })
      Dockerode.prototype.pull.onFirstCall().rejects(new Error('Crazy docker error'))
      Dockerode.prototype.pull.onSecondCall().resolves()
      Dockerode.prototype.run.resolves()

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.changeTaskStatusRunning)
          sinon.assert.callOrder(database.changeTaskStatusInitializing, database.changeTaskStatusRunning)
          sinon.assert.calledWith(database.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.changeTaskStatusRunning, '1234')
          sinon.assert.notCalled(database.changeTaskStatusError)
          sinon.assert.notCalled(database.changeTaskStatusDone)
          done()
        })
    })
    it('transitions task to Running on the second succesfull docker run attempt and happy flow', done => {
      database.changeTaskStatusInitializing.resolves()
      googleController.runInstance.resolves({ ip: '1.2.3.4' })
      Dockerode.prototype.pull.resolves()
      Dockerode.prototype.run.onFirstCall().rejects(new Error('Crazy docker error'))
      Dockerode.prototype.run.onSecondCall().resolves()

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.changeTaskStatusRunning)
          sinon.assert.callOrder(database.changeTaskStatusInitializing, database.changeTaskStatusRunning)
          sinon.assert.calledWith(database.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.changeTaskStatusRunning, '1234')
          sinon.assert.notCalled(database.changeTaskStatusError)
          sinon.assert.notCalled(database.changeTaskStatusDone)
          done()
        })
    })
    it('transitions task from Initializing to Error if changeTaskStatusInitializing fails', done => {
      database.changeTaskStatusInitializing.rejects(new Error('Crazy database error'))

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.changeTaskStatusError)
          sinon.assert.callOrder(database.changeTaskStatusInitializing, database.changeTaskStatusError)
          sinon.assert.calledWith(database.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.changeTaskStatusError, '1234')
          sinon.assert.notCalled(database.changeTaskStatusRunning)
          sinon.assert.notCalled(database.changeTaskStatusDone)
          done()
        })
    })
    it('transitions task from Initializing to Error if runInstance fails', done => {
      database.changeTaskStatusInitializing.resolves()
      googleController.runInstance.rejects(new Error('Crazy API Error'))

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.changeTaskStatusError)
          sinon.assert.callOrder(database.changeTaskStatusInitializing, database.changeTaskStatusError)
          sinon.assert.calledWith(database.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.changeTaskStatusError, '1234')
          sinon.assert.notCalled(database.changeTaskStatusRunning)
          sinon.assert.notCalled(database.changeTaskStatusDone)
          done()
        })
    })
    it('transitions task to Error if docker all pulls fail', done => {
      database.changeTaskStatusInitializing.resolves()
      googleController.runInstance.resolves({ ip: '1.2.3.4' })
      Dockerode.prototype.pull.rejects(new Error('Crazy docker error'))
      Dockerode.prototype.run.rejects(new Error('Crazy docker error'))

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.changeTaskStatusError)
          sinon.assert.callOrder(database.changeTaskStatusInitializing, database.changeTaskStatusError)
          sinon.assert.calledWith(database.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.changeTaskStatusError, '1234')
          sinon.assert.notCalled(database.changeTaskStatusRunning)
          sinon.assert.notCalled(database.changeTaskStatusDone)
          done()
        })
    })
    it('transitions task to Error if all docker runs fail', done => {
      database.changeTaskStatusInitializing.resolves()
      googleController.runInstance.resolves({ ip: '1.2.3.4' })
      Dockerode.prototype.pull.resolves()
      Dockerode.prototype.run.rejects(new Error('Crazy docker error'))

      cloud.runTask('1234', {})
        .then(() => {
          sinon.assert.calledWithMatch(Dockerode, { host: '1.2.3.4' })
          sinon.assert.calledOnce(database.changeTaskStatusInitializing)
          sinon.assert.calledOnce(database.changeTaskStatusError)
          sinon.assert.callOrder(database.changeTaskStatusInitializing, database.changeTaskStatusError)
          sinon.assert.calledWith(database.changeTaskStatusInitializing, '1234')
          sinon.assert.calledWith(database.changeTaskStatusError, '1234')
          sinon.assert.notCalled(database.changeTaskStatusRunning)
          sinon.assert.notCalled(database.changeTaskStatusDone)
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
        sinon.assert.calledWith(gZone.createVM, 'compute-1234', sinon.match.any)
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
        sinon.assert.calledWith(gZone.vm, 'compute-1234')
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
