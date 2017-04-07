const database = require('./database')

module.exports = {
  getMachines: ({account, key}) => {
    const query =
      'SELECT machines.machine_id, machines.name ' +
      'FROM accounts ' +
      'INNER JOIN machines ON accounts.account_id = machines.account_id ' +
      'WHERE accounts.key = ? AND accounts.secret = ? AND accounts.account_id = ?'

    return database().query(query, [key.key, key.secret, account])
      .then(([rows, fields]) => rows)
  }
}
