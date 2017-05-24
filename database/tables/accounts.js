const connection = require('../connection')

module.exports = {
  createAccount: account => {
    const query =
      'INSERT INTO `accounts` ' +
      '(`account_id`, `name`, `key`, `secret`, `first_name`, `last_name`, `email`, `spending_quota`, `vm_quota`, `public_key`) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'

    return connection().query(query, Object.values(account))
      .then(([rows, fields]) => rows[0])
  },
  getAccount: accountId => {
    const query =
      'SELECT * ' +
      'FROM accounts ' +
      'WHERE accounts.account_id = ?'

    return connection().query(query, [accountId])
      .then(([rows, fields]) => rows[0])
  },
  getAccountSecretKey: accountId => {
    const query =
      'SELECT accounts.account_id, accounts.key, accounts.secret ' +
      'FROM accounts ' +
      'WHERE accounts.account_id = ?'

    return connection().query(query, [accountId])
      .then(([rows, fields]) => rows.length > 0 ? rows[0] : null)
  },
  getAccounts: vmId => {
    const query =
      'SELECT accounts.* ' +
      'FROM machines ' +
      'INNER JOIN accounts ON machines.account_id = accounts.account_id ' +
      'WHERE machines.vm_id = ?'

    return connection().query(query, [vmId])
      .then(([rows, fields]) => rows)
  }
}
