const connection = require('../connection')

module.exports = {
  getTiers: () => connection().query('SELECT * FROM tiers')
    .then(([rows, fields]) => rows)
}
