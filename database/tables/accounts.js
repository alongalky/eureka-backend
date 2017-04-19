const connection = require('../connection')

module.exports = {
  getAccount: account => {
    const query =
      'SELECT account_id, spending_quota ' +
      'FROM accounts ' +
      'WHERE accounts.account_id = ?'

    return connection().query(query, [account])
      .then(([rows, fields]) => rows[0])
  },
  getAccountSecretKey: account => {
    const query =
      'SELECT accounts.account_id, accounts.key, accounts.secret ' +
      'FROM accounts ' +
      'WHERE accounts.account_id = ?'

    return connection().query(query, [account])
      .then(([rows, fields]) => rows.length > 0 ? rows[0] : null)
  }
}
