const user = 'roboto'
const password = '5ffc78b9830ece36adb672e80c54789c'
const database = 'eureka_dev'
const instanceName = 'dotted-vim-164110:us-east1:eureka-dev'

module.exports = {
  eureka_endpoint: 'https://devapidemo.eureka.guru',
  listen_port: 443,
  ssl_enabled: true,
  ssl_certificate: '/etc/letsencrypt/live/devapidemo.eureka.guru/fullchain.pem',
  ssl_key: '/etc/letsencrypt/live/devapidemo.eureka.guru/privkey.pem',
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
    database,
    socketPath: `/cloudsql/${instanceName}`
  },
  applicationInsights: {
    iKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY
  },
  authentication: {
    secret: 'wQjvx8Wcc9hGL7mD'
  }
}
