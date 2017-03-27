const supertest = require('supertest')
const apiRouter = require('../../routes/api')
const express = require('express')
const expect = require('chai').expect
const bodyParser = require('body-parser')
const expressValidator = require('express-validator')

describe('API', () => {
  const app = express()

  before(() => {
    // Middleware
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())
    app.use(expressValidator())

    // Route
    app.use('/api', apiRouter)
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
      supertest(app)
        .put('/api/tasks/jones')
        .expect(200, done)
    })
    it('PUT /tasks fails with 400 when task id is not alphanumeric', done => {
      supertest(app)
        .put('/api/tasks/---')
        .expect(400, done)
    })
    it('PUT /tasks fails with 404 when task id is missing', done => {
      supertest(app)
        .put('/api/tasks')
        .expect(404, done)
    })
  })

  describe('GET /tasks', () => {
    it('GET /tasks returns 200 on happy flow', done => {
      // TODO modify this test after database integration
      supertest(app)
        .get('/api/tasks')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.not.be.empty
          expect(res.body).to.have.lengthOf(2)
          done(err)
        })
    })
  })

  describe('GET /machines', () => {
    it('GET /machines returns 200 on happy flow', done => {
      supertest(app)
        .get('/api/machines')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.not.be.empty
          expect(res.body).to.have.lengthOf(2)
          done(err)
        })
    })
  })
})
