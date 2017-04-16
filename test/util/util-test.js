const logger = require('../../logger/logger')
logger.silence = true
const moment = require('moment')
const sinon = require('sinon')
const sinonStubPromise = require('sinon-stub-promise')
sinonStubPromise(sinon)

describe('Utils', () => {
  describe('Persevere', () => {
    const callback = sinon.stub()
    const persevere = require('../../util/persevere')
    beforeEach(() => {
      callback.reset()
    })
    it('without delays, succesfull callback is called once', done => {
      callback.resolves()
      persevere(callback, [])
        .then(() => {
          sinon.assert.calledOnce(callback)
          done()
        })
    })
    it('without delays, failing callback is called once', done => {
      callback.rejects(new Error('boom'))
      persevere(callback, [])
        .catch(() => {
          sinon.assert.calledOnce(callback)
          done()
        })
    })
    it('with delays, succesful callback is called once', done => {
      callback.resolves()
      persevere(callback, Array(5).fill(moment.duration(1, 'milliseconds')))
        .then(() => {
          sinon.assert.calledOnce(callback)
          done()
        })
    })
    it('with 2 delays, successful callback on fourth attempt is not called', done => {
      callback.onFirstCall().rejects(new Error('boom'))
      callback.onSecondCall().rejects(new Error('boom'))
      callback.onThirdCall().rejects(new Error('boom'))
      callback.onCall(3).resolves()
      persevere(callback, Array(2).fill(moment.duration(1, 'milliseconds')))
        .catch(() => {
          sinon.assert.calledThrice(callback)
          done()
        })
    })
    it('with 2 delays, successful callback on third attempt is called thrice', done => {
      callback.onFirstCall().rejects(new Error('boom'))
      callback.onSecondCall().rejects(new Error('boom'))
      callback.onThirdCall().resolves()
      persevere(callback, Array(2).fill(moment.duration(1, 'milliseconds')))
        .then(() => {
          sinon.assert.calledThrice(callback)
          done()
        })
    })
    it('fails through all attempts', done => {
      callback.rejects(new Error('boom'))
      persevere(callback, Array(2).fill(moment.duration(1, 'milliseconds')))
        .catch(() => {
          sinon.assert.calledThrice(callback)
          done()
        })
    })
  })
})
