const user = 'roboto'
const password = 'tHMu4ZXuMJHuT8hFccEZVmZ6'
const database = 'eureka_beta'
const instanceName = 'eureka-beta:us-east1:eureka-beta-sql'

module.exports = {
  eureka_endpoint: 'https://eureka-beta.appspot.com',
  google: {
    project: 'eureka-beta',
    project_service_account: '614729623195-compute@developer.gserviceaccount.com',
    instance_image: 'docker-gcfuse-scripts',
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
