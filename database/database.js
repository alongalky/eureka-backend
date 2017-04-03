const mysql = require('mysql')
const config = require('../config/config')()

let pool = null
const poolFactory = () => {
  if (!pool) {
    pool = mysql.createPool(config.database)
  }
  return pool
}

module.exports = poolFactory
