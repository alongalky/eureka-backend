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
  },
  getAccounts: ({vmId}) => {
    const query =
      'SELECT accounts.* ' +
      'FROM machines ' +
      'INNER JOIN accounts ON machines.account_id = accounts.account_id ' +
      'WHERE machines.vm_id = ?'

    return connection().query(query, [vmId])
      .then(([rows, fields]) => rows)
  }
}
