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
  getAccountSpendings: account => {
    const query = `
      SELECT COALESCE((t.total_spent_in_cents / 100.0), 0) as total_spent_in_dollars, accounts.spending_quota, accounts.account_id 
      FROM accounts
      LEFT JOIN
      (
        SELECT accounts.account_id, SUM(tiers.price_per_hour_in_cent) as total_spent_in_cents
        FROM accounts 
        INNER JOIN machines ON accounts.account_id = machines.account_id
        INNER JOIN tasks ON tasks.machine_id = machines.machine_id
        INNER JOIN tiers ON tasks.tier_id = tiers.tier_id
        GROUP BY accounts.account_id
      ) t
      ON t.account_id = accounts.account_id
      WHERE accounts.account_id = ?`

    return connection().query(query, [account])
      .then(([rows, fields]) =>
        rows.length >= 0 ? rows[0]
          : Promise.reject(new Error(`Account ${account} not found`)))
  }
}
