const user = 'roboto'
const password = 'j5GAVFeAPE4CQBhlnzbj'
const database = 'eureka_gamma'
const instanceName = 'eureka-gamma:us-east1:eureka-gamma'

module.exports = {
  eureka_endpoint: 'https://eureka-gamma.appspot.com',
  google: {
    project: 'eureka-gamma',
    project_service_account: '1004834989148-compute@developer.gserviceaccount.com',
    instance_image: 'ubuntu-runner-gpu',
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
    secret: 'CwZUyfV3akFmtdkR'
  }
}
