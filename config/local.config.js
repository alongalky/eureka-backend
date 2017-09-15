const user = 'roboto'
const password = '5ffc78b9830ece36adb672e80c54789c'
const database = 'eureka_dev'

module.exports = {
  eureka_endpoint: 'https://devapidemo.eureka.guru',
  listen_port: 8080,
  google: {
    project: 'dotted-vim-164110',
    project_service_account: '760853174060-compute@developer.gserviceaccount.com',
    instance_image: 'docker-gcfuse-scripts',
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
    secret: 'wQjvx8Wcc9hGL7mD'
  }
}
