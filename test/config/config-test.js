const sinon = require('sinon')
const expect = require('chai').expect
const configFactory = require('../../config/config')

describe('Config', () => {
  const fs = {
    existsSync: sinon.stub()
  }
  const readFile = sinon.stub()

  beforeEach(() => {
    fs.existsSync.reset()
    readFile.reset()
    readFile.onFirstCall().returns({ aws: { region: 'default-region' } })
  })

  it('merges objects correctly', () => {
    fs.existsSync.returns(false)
    readFile.onSecondCall().returns({ database: { host: 'localhost' } })

    const config = configFactory(fs, readFile)

    expect(config.aws.region).to.equal('default-region')
    expect(config.database.host).to.equal('localhost')
    sinon.assert.calledTwice(readFile)
  })

  it('overrides properties on merge', () => {
    fs.existsSync.returns(false)
    readFile.onSecondCall().returns({ aws: { region: 'us-west-2' } })

    const config = configFactory(fs, readFile, 'non-existent-env')

    expect(config.aws.region).to.equal('us-west-2')
    sinon.assert.calledTwice(readFile)
  })
})
