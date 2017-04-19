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
      getAccountSecretKey: sinon.stub(),
      getAccountSpendings: sinon.stub()
    },
    tiers: {
      getTiers: sinon.stub()
    }
  }
  const cloud = {
    runTask: sinon.stub()
  }

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
        return this.fail({ message: 'Failing fake authentication strategy' }, 401)
      }
    }
  }
  const authStrategy = new FakeEurekaStrategy()
  const config = {
    authentication: {
      secret: 'puppy'
    }
  }
  const apiRouterParams = {
    database,
    cloud,
    authStrategy,
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
    app.use(passport.initialize())
  })

  beforeEach(() => {
    database.machines.getMachines.reset()
    database.tasks.getTasks.reset()
    database.tasks.addTask.reset()
    database.accounts.getAccount.reset()
    database.accounts.getAccountSecretKey.reset()
    database.accounts.getAccountSpendings.reset()
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
        machineName: 'machina',
        taskName: 'tasky',
        tier: 'tiny',
        output: '/output'
      }

      const tiers = [{
        tier_id: '12345',
        name: 'tiny',
        price_per_hour: 60
      }]
      beforeEach(() => {
        database.tasks.addTask.resolves()
        database.tasks.getTasks.resolves([])
        database.accounts.getAccountSpendings.resolves({
          total_spent_in_dollars: 5,
          spending_quota: 100000
        })
        database.tiers.getTiers.resolves(tiers)
        cloud.runTask.resolves()
      })
      describe('Return codes', () => {
        it('returns 201 on happy flow', done => {
          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks', goodParams)
            .send(goodParams)
            .expect(201)
            .end((err, res) => {
              sinon.assert.calledOnce(database.accounts.getAccountSpendings)
              sinon.assert.alwaysCalledWithMatch(database.tasks.addTask, {
                command: 'hello world',
                output: '/output',
                machineName: 'machina',
                taskName: 'tasky',
                tierId: '12345',
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
          database.accounts.getAccountSpendings.rejects(new Error('Crazy database error'))

          supertest(app)
            .post('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
            .send(goodParams)
            .expect(500)
            .end((err, res) => {
              sinon.assert.calledOnce(database.accounts.getAccountSpendings)

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
          database.accounts.getAccountSpendings.resolves({
            total_spent_in_dollars: 10,
            spending_quota: 5
          })

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
          database.accounts.getAccountSpendings.resolves({
            total_spent_in_dollars: 5,
            spending_quota: 10
          })

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
      })

      describe('Parameter verification', () => {
        for (let prop of ['command', 'output', 'machineName', 'taskName']) {
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
          supertest(app)
            .post('/api/accounts/1234/tasks')
            .send(goodParams)
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
        const goodTask = {
          duration_in_seconds: 60 * 60 * 2, // 2 hours
          price_per_hour_in_dollars: 2,
          total_spent_in_dollars: 4,
          name: 'good-task',
          command: '/run/wild',
          status: 'Initializing',
          machine_name: 'machine17',
          tier: 'tiny',
          timestamp_initializing: new Date().toString(),
          timestamp_done: new Date().toString()
        }
        database.tasks.getTasks.resolves([ goodTask, goodTask ])

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/tasks')
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.not.be.empty
            expect(res.body).to.have.lengthOf(2)
            sinon.assert.calledWithMatch(database.tasks.getTasks, { account: 'b9fe526d-6c9c-4c59-a705-c145c39c0a91' })
            expect(res.body[0]).to.deep.equal({
              name: goodTask.name,
              command: goodTask.command,
              status: goodTask.status,
              machineName: goodTask.machine_name,
              timestamp_initializing: goodTask.timestamp_initializing,
              timestamp_done: goodTask.timestamp_done,
              tier: goodTask.tier,
              durationInSeconds: 2 * 60 * 60,
              costInCents: 400.0
            })

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
        authStrategy: apiAuthenticate.Strategy()
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
        for (let prop of ['secret', 'account_id']) {
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
      })
    })
    describe('Authentication logic', () => {
      const account = {
        key: 'Key',
        secret: 'Secret',
        account_id: 'b9fe526d-6c9c-4c59-a705-c145c39c0a91'
      }
      const differentAccount = Object.assign({}, account, { account_id: 'fe7fa976-12fa-416f-b4f3-ef79f7030dde' })

      beforeEach(() => {
        database.machines.getMachines.resolves([])
        database.accounts.getAccountSecretKey.withArgs('b9fe526d-6c9c-4c59-a705-c145c39c0a91').resolves(account)
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
            sinon.assert.calledOnce(database.accounts.getAccountSecretKey)
            sinon.assert.calledWithExactly(database.accounts.getAccountSecretKey, 'b9fe526d-6c9c-4c59-a705-c145c39c0a91')
            done(err)
          })
      })
      it('fails when account_id in token is different from the one in the url', done => {
        const differentToken = jwt.sign(differentAccount, config.authentication.secret, {
          expiresIn: '7 days'
        })

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/machines')
          .set('Authorization', 'JWT ' + differentToken)
          .expect(401)
          .end((err, res) => {
            sinon.assert.notCalled(database.accounts.getAccountSecretKey)
            done(err)
          })
      })
      it('fails when token is expired', done => {
        const expiredToken = jwt.sign(account, config.authentication.secret, {
          expiresIn: -1
        })

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/machines')
          .set('Authorization', 'JWT ' + expiredToken)
          .expect(401)
          .end((err, res) => {
            sinon.assert.notCalled(database.accounts.getAccount)
            done(err)
          })
      })
      it('fails when token account matches url account but the key is different', done => {
        const tokenWithWrongKey = jwt.sign(Object.assign({}, account, { key: 'oldwrongkey' }),
          config.authentication.secret, { expiresIn: '7 days' })

        supertest(app)
          .get('/api/accounts/b9fe526d-6c9c-4c59-a705-c145c39c0a91/machines')
          .set('Authorization', 'JWT ' + tokenWithWrongKey)
          .expect(401)
          .end((err, res) => {
            sinon.assert.calledOnce(database.accounts.getAccountSecretKey)
            done(err)
          })
      })
    })
  })
})
