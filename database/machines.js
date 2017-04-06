const database = require('./database')

module.exports = {
  getMachines: (key) => {
    const query =
      'SELECT machines.machine_id, machines.name ' +
      'FROM accounts ' +
      'INNER JOIN machines ON accounts.account_id = machines.account_id ' +
      'WHERE accounts.key = ? AND accounts.secret = ?'

    return database().query(query, [key.key, key.secret])
      .then(([rows, fields]) => rows)
  }
}
