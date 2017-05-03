const connection = require('../connection')

module.exports = {
  getTiers: () => connection().query('SELECT * FROM tiers')
    .then(([rows, fields]) => rows),
  getTier: tierId => connection().query('SELECT * FROM tiers WHERE tier_id = ?', [tierId])
    .then(([rows, fields]) => rows[0])
}
