const sinon = require('sinon')
const sinonStubPromise = require('sinon-stub-promise')
sinonStubPromise(sinon)

describe('Cloud controller', () => {
  describe('Google Runner', () => {
    const config = {
      cloud_provider: 'google',
      google: {
        region: 'us-east1',
        zone: 'us-east1-b',
        project: 'striped-zebra-11',
        instance_image: 'awesome-machine'
      }
    }
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
      gZone.createVM.returns(Promise.resolve([gVm]))
      gVm.waitFor.returns(Promise.resolve([{
        networkInterfaces: [{
          accessConfigs: [{
            natIP: '1.2.3.4'
          }]
        }]
      }]))

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
      deleteVm.delete.returns(Promise.resolve())

      googleController.runInstance('1234', {})
      .then(() => {
        sinon.assert.calledOnce(gZone.vm)
        sinon.assert.calledWith(gZone.vm, 'compute-1234')
        sinon.assert.calledOnce(deleteVm.delete)
        done()
      })
    })

    it('deletes instance when fails to wait for RUNNING state', (done) => {
      gZone.createVM.returns(Promise.resolve([gVm]))
      gZone.vm.returns(deleteVm)
      deleteVm.delete.returns(Promise.resolve())
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
