const user = 'roboto'
const password = 'j5GAVFeAPE4CQBhlnzbj'
const database = 'eureka_gamma'

module.exports = {
  eureka_endpoint: 'http://10.142.0.7',
  google: {
    project: 'eureka-gamma',
    project_service_account: '1004834989148-compute@developer.gserviceaccount.com',
    instance_image: 'ubuntu-runner',
    docker_registry: 'us.gcr.io'
  },
  database: {
    connectionLimit: 10,
    host: 'localhost',
    port: 3306,
    user,
    password,
    database
  },
  applicationInsights: {
    iKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY
  },
  authentication: {
    secret: 'CwZUyfV3akFmtdkR'
  }
}
