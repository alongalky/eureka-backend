const sinon = require('sinon')
const supertest = require('supertest')
const apiRouter = require('../../routes/api')
const express = require('express')
const expect = require('chai').expect
const bodyParser = require('body-parser')
const expressValidator = require('express-validator')

describe('API', () => {
  const database = {
    machines: {
      getMachines: sinon.stub()
    },
    tasks: {
      addTask: sinon.stub(),
      getTasks: sinon.stub()
    }
  }
  const app = express()

  before(() => {
    // Middleware
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())
    app.use(expressValidator())

    // Route
    app.use('/api', apiRouter({
      machinesDatabase: database.machines,
      tasksDatabase: database.tasks
    }))
  })

  beforeEach(() => {
    database.machines.getMachines.reset()
    database.tasks.getTasks.reset()
    database.tasks.addTask.reset()
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

  describe('PUT /tasks', () => {
    it('PUT /tasks returns 200 on happy flow', done => {
      database.tasks.addTask.returns(Promise.resolve())

      supertest(app)
        .put('/api/accounts/1234/tasks')
        .expect(200)
        .end((err, res) => {
          sinon.assert.calledWithMatch(database.tasks.addTask, {account: '1234'})

          done(err)
        })
    })
  })

  describe('GET /tasks', () => {
    it('GET /tasks returns 200 on happy flow', done => {
      database.tasks.getTasks.returns(Promise.resolve(['happy', 'joy']))

      supertest(app)
        .get('/api/accounts/1234/tasks')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.not.be.empty
          expect(res.body).to.have.lengthOf(2)
          sinon.assert.calledWithMatch(database.tasks.getTasks, {account: '1234'})

          done(err)
        })
    })
  })

  describe('GET /machines', () => {
    it('GET /machines returns 200 on happy flow', done => {
      database.machines.getMachines.returns(Promise.resolve(['happy', 'flow', 'forever']))

      supertest(app)
        .get('/api/accounts/1234/machines')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.not.be.empty
          expect(res.body).to.have.lengthOf(3)
          sinon.assert.calledWithMatch(database.machines.getMachines, {account: '1234'})

          done(err)
        })
    })
  })
})
