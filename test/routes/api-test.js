const logger = require('../../logger/logger')
logger.silence = true
const sinon = require('sinon')
const sinonStubPromise = require('sinon-stub-promise')
sinonStubPromise(sinon)
const supertest = require('supertest')
const apiRouter = require('../../routes/api')
const express = require('express')
const expect = require('chai').expect
const bodyParser = require('body-parser')
const expressValidator = require('express-validator')
const moment = require('moment')
const passport = require('passport')
const jwt = require('jsonwebtoken')

describe('API', () => {
  const database = {
    machines: {
      getMachines: sinon.stub()
    },
    tasks: {
      addTask: sinon.stub(),
      getTasks: sinon.stub()
    },
    accounts: {
      getAccount: sinon.stub(),
      getAccountSecretKey: sinon.stub()
    }
  }
  const cloud = {
    runTask: sinon.stub()
  }
  const tiers = [{
    name: 'tiny',
    pricePerHourInCents: 60
  }]

  let succeedAuthentication = true
  class FakeEurekaStrategy extends passport.Strategy {
    constructor () {
      super()
      this.name = 'jwt'
    }
    authenticate (req, options) {
      if (succeedAuthentication) {
        return this.success({ message: 'Yay' })
      } else {
        return this.fail({ message: 'Failing fake strategy' }, 401)
      }
    }
  }
  const strategy = new FakeEurekaStrategy()
  const config = {
    authentication: {
      secret: 'puppy'
    }
  }
  const apiRouterParams = {
    database,
    cloud,
    tiers,
    strategy,
    config
  }
  const app = express()

  before(() => {
    // Middleware
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())
    app.use(expressValidator({
      customValidators: {
        isArray: Array.isArray
      }
    }))
  })

  beforeEach(() => {
    database.machines.getMachines.reset()
    database.tasks.getTasks.reset()
    database.tasks.addTask.reset()
    database.accounts.getAccount.reset()
    database.accounts.getAccountSecretKey.reset()
    cloud.runTask.reset()
    succeedAuthentication = true
  })

  describe('Routes', () => {
    before(() => {
      // Route
      app.use('/api', apiRouter(apiRouterParams))
    })

    describe('GET /health-check', () => {
      it('health-check returns status code 200', done => {
        supertest(app)
          .get('/api/health-check')
          .expect(200, done)
      })
      it('health-check returns status "All is well" message', done => {
        supertest(app)
          .get('/api/health-check')
          .expect('Content-Type', /json/)
          .end((err, res) => {
            expect(res.body.message).to.equal('All is well')
            expect(err).to.be.null
            done()
          })
      })
      it('doesn\'t care about authentication', done => {
        succeedAuthentication = false

        supertest(app)
          .get('/api/health-check')
          .expect(200, done)
      })
    })

    describe('POST /tasks', () => {
      const goodParams = {
        command: 'hello world',
        machine: 'machina',
        taskName: 'tasky',
        tier: 'tiny',
        output: '/output'
      }

      beforeEach(() => {
        database.tasks.addTask.resolves()
        database.tasks.getTasks.resolves([])
        database.accounts.getAccount.resolves({
          spending_quota: 100000
        })
        cloud.runTask.returns(Promise.resolve())
      })

      describe('Return codes', () => {
        it('returns 201 on happy flow', done => {
          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks', goodParams)
            .send(goodParams)
            .expect(201)
            .end((err, res) => {
              sinon.assert.alwaysCalledWithMatch(database.tasks.addTask, {
                command: 'hello world',
                output: '/output',
                machine: 'machina',
                taskName: 'tasky',
                tier: 'tiny',
                account: 'b9fe526d-6c9c-4c59-a705-c145c39c0a91'
              })

              done(err)
            })
        })
        it('returns 500 when task add database operation fails', done => {
          database.tasks.addTask.rejects(new Error('Crazy database error'))

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
            .send(goodParams)
            .expect(500)
            .end((err, res) => {
              sinon.assert.calledOnce(database.tasks.addTask)

              done(err)
            })
        })
        it('returns 500 when account retrieval database operation fails', done => {
          database.accounts.getAccount.rejects(new Error('Crazy database error'))

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
            .send(goodParams)
            .expect(500)
            .end((err, res) => {
              sinon.assert.calledOnce(database.accounts.getAccount)

              done(err)
            })
        })
        it('returns 404 when machine does not exist', done => {
          const err = new Error(`Machine does not exist`)
          err.type = 'machine_not_exists'
          database.tasks.addTask.rejects(err)

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
            .send(goodParams)
            .expect(404)
            .end((err, res) => {
              sinon.assert.calledOnce(database.tasks.addTask)

              done(err)
            })
        })
        it('returns 400 when account has overspent', done => {
          // Quota of $100.00
          database.accounts.getAccount.resolves({ spending_quota: 100 })
          // 101 tasks, $1.00 each
          database.tasks.getTasks.resolves(Array(101).fill({
            tier: 'tiny',
            timestamp_initializing: moment().subtract(100, 'minute').toDate()
          }))

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
            .send(goodParams)
            .expect(400)
            .end((err, res) => {
              sinon.assert.notCalled(database.tasks.addTask)

              done(err)
            })
        })
        it('Happy flow when account has not overspent', done => {
          // Quota of $100.00
          database.accounts.getAccount.resolves({ spending_quota: 100 })
          // 99 tasks, $1.00 each
          database.tasks.getTasks.resolves(Array(99).fill({
            tier: 'tiny',
            timestamp_initializing: moment().subtract(100, 'minute').toDate()
          }))

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
            .send(goodParams)
            .expect(201)
            .end((err, res) => {
              sinon.assert.calledOnce(database.tasks.addTask)

              done(err)
            })
        })
        it('returns 401 when authentication fails', done => {
          succeedAuthentication = false

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks', goodParams)
            .send(goodParams)
            .expect(401)
            .end((err, res) => {
              sinon.assert.notCalled(database.tasks.addTask)
              done(err)
            })
        })
        it('returns 400 when account has overspent', done => {
          // Quota of $100.00
          database.accounts.getAccount.resolves({ spending_quota: 100 })
          // 101 tasks, $1.00 each
          database.tasks.getTasks.resolves(Array(101).fill({
            tier: 'tiny',
            timestamp_initializing: moment().subtract(100, 'minute').toDate()
          }))

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
            .send(goodParams)
            .expect(400)
            .end((err, res) => {
              sinon.assert.notCalled(database.tasks.addTask)

              done(err)
            })
        })
        it('Happy flow when account has not overspent', done => {
          // Quota of $100.00
          database.accounts.getAccount.resolves({ spending_quota: 100 })
          // 99 tasks, $1.00 each
          database.tasks.getTasks.resolves(Array(99).fill({
            tier: 'tiny',
            timestamp_initializing: moment().subtract(100, 'minute').toDate()
          }))

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
            .send(goodParams)
            .expect(201)
            .end((err, res) => {
              sinon.assert.calledOnce(database.tasks.addTask)

              done(err)
            })
        })
      })

      describe('Parameter verification', () => {
        for (let prop of ['command', 'output', 'machine', 'taskName']) {
          it(`returns 422 when ${prop} is too long`, done => {
            const badParams = Object.assign({}, goodParams, { [prop]: 'h'.repeat(256) })

            supertest(app)
              .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks', {})
              .send(badParams)
              .expect(422)
              .end((err, res) => {
                sinon.assert.notCalled(database.tasks.addTask)

                done(err)
              })
          })
          it(`returns 422 when ${prop} is empty`, done => {
            const badParams = Object.assign({}, goodParams, { [prop]: undefined })

            supertest(app)
              .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks', {})
              .send(badParams)
              .expect(422)
              .end((err, res) => {
                sinon.assert.notCalled(database.tasks.addTask)

                done(err)
              })
          })
        }
        it('returns 422 when accounts is not a valid UUID', done => {
          const badParams = Object.assign({}, goodParams, { taskName: undefined })

          supertest(app)
            .post('/api/accounts/1234/tasks')
            .send(badParams)
            .expect(422)
            .end((err, res) => {
              sinon.assert.notCalled(database.tasks.addTask)

              done(err)
            })
        })
        it('returns 422 when tier is not "tiny"', done => {
          const badParams = Object.assign({}, goodParams, { tier: 'something else' })

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
            .send(badParams)
            .expect(422)
            .end((err, res) => {
              sinon.assert.notCalled(database.tasks.addTask)

              done(err)
            })
        })
      })
    })

    describe('GET /tasks', () => {
      it('returns 200 on happy flow', done => {
        database.tasks.getTasks.returns(Promise.resolve([
          {
            tier: 'tiny'
          },
          {
            tier: 'tiny'
          }
        ]))

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.not.be.empty
            expect(res.body).to.have.lengthOf(2)
            sinon.assert.calledWithMatch(database.tasks.getTasks, { account: 'b9fe526d-6c9c-4c59-a705-c145c39c0a91' })

            done(err)
          })
      })
      it('calculates duration & cost correctly when task has timestamp_done', done => {
        const start = moment()
        const end = moment().add(2, 'minute')

        database.tasks.getTasks.returns(Promise.resolve([
          {
            tier: 'tiny',
            timestamp_initializing: start.toDate(),
            timestamp_done: end.toDate()
          }
        ]))

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.have.length(1)
            expect(res.body[0].durationInSeconds).to.be.equal(120)
            expect(res.body[0].costInCents).to.be.equal(2)

            done(err)
          })
      })
      it('calculates duration & cost correctly when task does not have timestamp_done', done => {
        const start = moment().subtract(10, 'minutes')

        database.tasks.getTasks.returns(Promise.resolve([
          {
            tier: 'tiny',
            timestamp_initializing: start.toDate()
          }
        ]))

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.have.length(1)
            expect(res.body[0].durationInSeconds).to.be.approximately(10 * 60, 2)
            expect(res.body[0].costInCents).to.be.approximately(10, 1)

            done(err)
          })
      })
      it('returns 422 when accounts is not a valid UUID', done => {
        supertest(app)
          .get('/api/accounts/1234/tasks')
          .expect(422)
          .end((err, res) => {
            sinon.assert.notCalled(database.tasks.getTasks)

            done(err)
          })
      })
      it('returns 500 when database call fails', done => {
        database.tasks.getTasks.rejects(new Error('Crazy database error'))

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
          .expect(500, done)
      })
      it('returns 401 when authentication fails', done => {
        succeedAuthentication = false

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
          .expect(401)
          .end((err, res) => {
            sinon.assert.notCalled(database.tasks.getTasks)
            done(err)
          })
      })
    })

    describe('GET /machines', () => {
      it('GET /machines returns 200 on happy flow', done => {
        database.machines.getMachines.returns(Promise.resolve(['happy', 'flow', 'forever']))

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/machines')
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.not.be.empty
            expect(res.body).to.have.lengthOf(3)
            sinon.assert.calledWithMatch(database.machines.getMachines, { account: 'b9fe526d-6c9c-4c59-a705-c145c39c0a91' })

            done(err)
          })
      })
      it('returns 422 when accounts is not a valid UUID', done => {
        supertest(app)
          .get('/api/accounts/1234/machines')
          .expect(422)
          .end((err, res) => {
            sinon.assert.notCalled(database.tasks.getTasks)

            done(err)
          })
      })
      it('returns 500 when database call fails', done => {
        database.machines.getMachines.rejects(new Error('Crazy database error'))

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/machines')
          .expect(500, done)
      })
      it('returns 401 when authentication fails', done => {
        succeedAuthentication = false

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/machines')
          .expect(401)
          .end((err, res) => {
            sinon.assert.notCalled(database.machines.getMachines)
            done(err)
          })
      })
    })
  })
  describe('Authentication', () => {
    const config = {
      authentication: {
        secret: 'puppy'
      }
    }

    before(() => {
      const apiAuthenticate = require('../../routes/api/authenticate')({ database, config })

      app.use('/api', apiRouter(Object.assign({}, apiRouterParams, {
        strategy: apiAuthenticate.Strategy()
      })))
    })
    beforeEach(() => {
      database.accounts.getAccountSecretKey.resolves({
        key: 'Key',
        secret: 'Secret',
        account_id: 'b9fe526d-6c9c-4c59-a705-c145c39c0a91'
      })
    })

    describe('POST /authenticate', () => {
      const goodParams = {
        key: 'Key',
        secret: 'Secret',
        account_id: 'b9fe526d-6c9c-4c59-a705-c145c39c0a91'
      }

      describe('Parameter verification', () => {
        it('returns 200 on happy flow', done => {
          supertest(app)
            .post('/api/authenticate')
            .send(goodParams)
            .expect(200, done)
        })
        for (let prop of ['secret', 'key', 'account_id']) {
          it(`returns 422 when ${prop} is too long`, done => {
            const badParams = Object.assign({}, goodParams, { [prop]: 'h'.repeat(256) })

            supertest(app)
              .post('/api/authenticate')
              .send(badParams)
              .expect(422)
              .end((err, res) => {
                sinon.assert.notCalled(database.accounts.getAccountSecretKey)

                done(err)
              })
          })
          it(`returns 422 when ${prop} is empty`, done => {
            const badParams = Object.assign({}, goodParams, { [prop]: undefined })

            supertest(app)
              .post('/api/authenticate')
              .send(badParams)
              .expect(422)
              .end((err, res) => {
                sinon.assert.notCalled(database.accounts.getAccountSecretKey)

                done(err)
              })
          })
        }
        it('returns 422 when accounts is not a valid UUID', done => {
          const badParams = Object.assign({}, goodParams, { account_id: '1234' })

          supertest(app)
            .post('/api/authenticate')
            .send(badParams)
            .expect(422)
            .end((err, res) => {
              sinon.assert.notCalled(database.accounts.getAccountSecretKey)

              done(err)
            })
        })
        it('returns 422 when accounts is missing', done => {
          const badParams = Object.assign({}, goodParams, { account_id: undefined })

          supertest(app)
            .post('/api/authenticate')
            .send(badParams)
            .expect(422)
            .end((err, res) => {
              sinon.assert.notCalled(database.accounts.getAccountSecretKey)

              done(err)
            })
        })
      })

      describe('endpoint logic', () => {
        it('returns token on happy flow', done => {
          supertest(app)
            .post('/api/authenticate')
            .send(goodParams)
            .expect(200)
            .end((err, res) => {
              expect(res.body.token.substr(0, 4)).to.equal('JWT ')
              const token = res.body.token.substr(4)
              const decodedToken = jwt.verify(token, 'puppy')

              expect(decodedToken).to.have.property('key', 'Key')
              expect(decodedToken).to.have.property('account_id', goodParams.account_id)
              expect(decodedToken).to.not.have.property('secret')

              done(err)
            })
        })
        it('does not return token if key is incorrect', done => {
          const badParams = Object.assign({}, goodParams, {
            key: 'badkey'
          })
          supertest(app)
          .post('/api/authenticate')
          .send(badParams)
          .expect(401)
          .end((err, res) => {
            expect(res.body).to.not.property('token')
            done(err)
          })
        })
        it('does not return token if secret is incorrect', done => {
          const badParams = Object.assign({}, goodParams, {
            secret: 'badsecret'
          })
          supertest(app)
          .post('/api/authenticate')
          .send(badParams)
          .expect(401)
          .end((err, res) => {
            expect(res.body).to.not.property('token')
            done(err)
          })
        })
        it('does not return token if account_id is incorrect', done => {
          const badParams = Object.assign({}, goodParams, {
            account_id: '9e43c1df-04c9-4d40-844f-65dfda675e06'
          })
          supertest(app)
          .post('/api/authenticate')
          .send(badParams)
          .expect(401)
          .end((err, res) => {
            expect(res.body).to.not.property('token')
            done(err)
          })
        })
        it('does not return token if account_id is incorrect', done => {
          const badParams = Object.assign({}, goodParams, {
            account_id: '9e43c1df-04c9-4d40-844f-65dfda675e06'
          })
          supertest(app)
          .post('/api/authenticate')
          .send(badParams)
          .expect(401)
          .end((err, res) => {
            expect(res.body).to.not.property('token')
            done(err)
          })
        })
      })
    })
    describe('Authentication logic', () => {
      const account = {
        key: 'Key',
        secret: 'Secret',
        account_id: 'b9fe526d-6c9c-4c59-a705-c145c39c0a91'
      }
      beforeEach(() => {
        database.machines.getMachines.resolves([])
        database.accounts.getAccount.resolves(account)
      })
      it('authenticates on happy flow', done => {
        const goodToken = jwt.sign(account, config.authentication.secret, {
          expiresIn: '7 days'
        })

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/machines')
          .set('Authorization', 'JWT ' + goodToken)
          .expect(200)
          .end((err, res) => {
            sinon.assert.calledOnce(database.accounts.getAccount)
            sinon.assert.calledWithExactly(database.accounts.getAccount, 'b9fe526d-6c9c-4c59-a705-c145c39c0a91')
            done(err)
          })
      })
      it('fails when account_id in token is different from the one in the url', done => {
        const badAccount = Object.assign({}, account, { account_id: 'fe7fa976-12fa-416f-b4f3-ef79f7030dde' })

        const badToken = jwt.sign(badAccount, config.authentication.secret, {
          expiresIn: '7 days'
        })

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/machines')
          .set('Authorization', 'JWT ' + badToken)
          .expect(401)
          .end((err, res) => {
            sinon.assert.calledOnce(database.accounts.getAccount)
            sinon.assert.calledWithExactly(database.accounts.getAccount, badAccount.account_id)
            done(err)
          })
      })
      it('fails when token is expired', done => {
        const badToken = jwt.sign(account, config.authentication.secret, {
          expiresIn: -1
        })

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/machines')
          .set('Authorization', 'JWT ' + badToken)
          .expect(401)
          .end((err, res) => {
            sinon.assert.notCalled(database.accounts.getAccount)
            done(err)
          })
      })
    })
  })
})
