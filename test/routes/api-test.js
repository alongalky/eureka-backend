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

describe('API', () => {
  const database = {
    machines: {
      getMachines: sinon.stub()
    },
    tasks: {
      addTask: sinon.stub(),
      getTasks: sinon.stub(),
      changeTaskStatus: sinon.stub()
    }
  }
  const cloud = {
    runTask: sinon.stub()
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

    // Route
    app.use('/api', apiRouter({
      machinesDatabase: database.machines,
      tasksDatabase: database.tasks,
      cloud,
      tiers: [{
        name: 'tiny',
        pricePerHourInCents: 60
      }]
    }))
  })

  beforeEach(() => {
    logger.silence = true
    database.machines.getMachines.reset()
    database.tasks.getTasks.reset()
    database.tasks.addTask.reset()
    cloud.runTask.reset()
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
  })

  describe('POST /tasks', () => {
    const goodParams = {
      command: 'hello world',
      machine: 'machina',
      taskName: 'tasky',
      tier: 'tiny',
      output: '/output'
    }

    describe('Return codes', () => {
      it('returns 201 on happy flow', done => {
        database.tasks.addTask.returns(Promise.resolve())
        cloud.runTask.returns(Promise.resolve())

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
      it('returns 500 when database operation fails', done => {
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
      it('returns 404 when machine does not exists', done => {
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
          timestamp_start: start.toDate(),
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
          timestamp_start: start.toDate()
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
  })
})
