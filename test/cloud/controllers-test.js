const logger = require('../../logger/logger')
logger.silence = true
const sinon = require('sinon')
const sinonStubPromise = require('sinon-stub-promise')
sinonStubPromise(sinon)

describe('Cloud controller', () => {
  describe('Google Runner', () => {
    const config = {
      cloud_provider: 'google',
      google: {
        region: 'us-east1-b'
      }
    }
    const database = {
      changeTaskStatusRunning: sinon.stub(),
      changeTaskStatus: sinon.stub()
    }
    const gZone = {
      createVM: sinon.stub()
    }
    const gce = {
      zone: () => gZone
    }
    const gVm = {
      name: 'test-vm',
      waitFor: sinon.stub()
    }

    const googleController = require('../../cloud/google/controller')({
      config,
      database,
      gce
    })

    beforeEach(() => {
      database.changeTaskStatusRunning.reset()
      database.changeTaskStatus.reset()
      gZone.createVM.reset()
      gVm.waitFor.reset()
    })

    it('transitions task to RUNNING and updates timestamp on happy flow', done => {
      gZone.createVM.returns(Promise.resolve([gVm]))
      gVm.waitFor.returns(Promise.resolve())
      database.changeTaskStatusRunning.returns(Promise.resolve())

      googleController.runInstance('1234', {})
      .then(() => {
        // Checks if instance gets named correctly
        sinon.assert.calledWith(gZone.createVM, 'compute-1234', sinon.match.any)
        sinon.assert.notCalled(database.changeTaskStatus)
        sinon.assert.calledOnce(database.changeTaskStatusRunning)
        sinon.assert.calledWithExactly(database.changeTaskStatusRunning, '1234')
        done()
      })
    })

    it('transitions task to ERROR when fails to create instance', done => {
      gZone.createVM.rejects(new Error('Crazy API Error'))

      googleController.runInstance('1234', {})
      .then(() => {
        sinon.assert.calledOnce(database.changeTaskStatus)
        sinon.assert.calledWithExactly(database.changeTaskStatus, '1234', 'Error')
        done()
      })
    })

    it('transitions task to ERROR when fails to wait for instance RUNNING', (done) => {
      gZone.createVM.returns(Promise.resolve([gVm]))
      gVm.waitFor.rejects(new Error('waitFor API Error'))

      googleController.runInstance('1234', {})
      .then(() => {
        sinon.assert.calledOnce(database.changeTaskStatus)
        sinon.assert.calledWithExactly(database.changeTaskStatus, '1234', 'Error')
        done()
      })
    })
  })
})
