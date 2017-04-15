const database = require('./database')

module.exports = {
  getAccount: account => {
    const query =
      'SELECT account_id, spending_quota ' +
      'FROM accounts ' +
      'WHERE accounts.account_id = ?'

    return database().query(query, [account])
      .then(([rows, fields]) => rows[0])
  }
}
