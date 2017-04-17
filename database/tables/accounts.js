const connection = require('../connection')

module.exports = {
  getAccount: account => {
    const query =
      'SELECT account_id, spending_quota ' +
      'FROM accounts ' +
      'WHERE accounts.account_id = ?'

    return connection().query(query, [account])
      .then(([rows, fields]) => rows[0])
  }
}
