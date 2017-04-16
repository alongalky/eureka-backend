const fs = require('fs')
const mysql = require('mysql2/promise')
const config = require('../config/config')(fs, require)

let pool = null
const poolFactory = () => {
  if (!pool) {
    pool = mysql.createPool(config.database)
  }
  return pool
}

module.exports = poolFactory
