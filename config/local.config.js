module.exports = {
  listen_port: 8080,
  ssl_enabled: false,
  database: {
    connectionLimit: 10,
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'eureka_local'
  },
  applicationInsights: {
    iKey: '32b8b06f-ff4a-4b04-b26d-4d9c4796b92a'
  },
  authentication: {
    secret: 'D3ZPg8EUBxxuLdrB'
  }
}
