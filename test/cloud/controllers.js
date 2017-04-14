const sinon = require('sinon')

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
    const cloud = {
      startTask: sinon.stub()
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

    const googleRunInstance = require('../../cloud/google/runinstance')({ 
      config,
      database,
      cloud,
      gce
    })

    const oldLog = console.log
    const oldError = console.error

    beforeEach(() => {
      console.log = () => {}
      console.error = () => {}
      database.changeTaskStatusRunning.reset()
      database.changeTaskStatus.reset()
      cloud.startTask.reset()
      gZone.createVM.reset()
      gVm.waitFor.reset()
    })

    it('transitions task to RUNNING and updates timestamp on happy flow', done => {
      gZone.createVM.returns(Promise.resolve([gVm]))
      gVm.waitFor.returns(Promise.resolve())
      database.changeTaskStatusRunning.returns(Promise.resolve())

      googleRunInstance('1234', {})
      .then(() => {
        console.log = oldLog
        console.error = oldError
        // Checks if instance gets named correctly
        sinon.assert.calledWith(gZone.createVM, 'compute-1234', sinon.match.any)
        sinon.assert.notCalled(database.changeTaskStatus)
        sinon.assert.calledOnce(database.changeTaskStatusRunning)
        sinon.assert.calledWithExactly(database.changeTaskStatusRunning, '1234')
        done()
      })
    })

    it('transitions task to ERROR when fails to create instance', done => {
      gZone.createVM.returns(Promise.reject())

      googleRunInstance('1234', {})
      .then(() => {
        console.log = oldLog
        console.error = oldError
        sinon.assert.calledOnce(database.changeTaskStatus)
        sinon.assert.calledWithExactly(database.changeTaskStatus, '1234', 'Error')
        done()
      })
    })

    it('transitions task to ERROR when fails to wait for instance RUNNING', (done) => {
      gZone.createVM.returns(Promise.resolve([gVm]))
      gVm.waitFor.returns(Promise.reject())

      googleRunInstance('1234', {})
      .then(() => {
        console.log = oldLog
        console.error = oldError
        sinon.assert.calledOnce(database.changeTaskStatus)
        sinon.assert.calledWithExactly(database.changeTaskStatus, '1234', 'Error')
        done()
      })
    })
  })
})
