const user = 'roboto'
const password = 'tHMu4ZXuMJHuT8hFccEZVmZ6'
const database = 'eureka_beta'
const instanceName = 'eureka-beta:us-east1:eureka-beta-sql'

module.exports = {
  google: {
    project: 'eureka-beta',
    instance_image: 'docker-gcfuse-enabled',
    docker_registry: 'us.gcr.io'
  },
  database: {
    connectionLimit: 10,
    host: 'localhost',
    port: 3306,
    user,
    password,
    database,
    socketPath: `/cloudsql/${instanceName}`
  },
  applicationInsights: {
    iKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY
  },
  authentication: {
    secret: 'QTceKAqBMjw4LTWr'
  }
}
