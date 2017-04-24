const user = 'roboto'
const password = '5ffc78b9830ece36adb672e80c54789c'
const database = 'eureka_dev'
const instanceName = 'dotted-vim-164110:us-east1:eureka-dev'

module.exports = {
  eureka_endpoint: 'https://dotted-vim-164110.appspot.com',
  google: {
    project: 'dotted-vim-164110',
    instance_image: 'docker-enabled-nowrapping',
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
    secret: '2AfLYp83GtvS8nzs'
  }
}
