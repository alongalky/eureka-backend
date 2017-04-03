const database = require('./database')

module.exports = {
  getMachines: (key) => new Promise((resolve, reject) => {
    const query =
      'SELECT machines.id, machines.name ' +
      'FROM accounts ' +
      'INNER JOIN machines ON accounts.id = machines.owner_account_id ' +
      'WHERE accounts.key = ? AND accounts.secret = ?'

    database().query(query, [key.key, key.secret], (error, results, fields) => {
      if (error) {
        reject(error)
      } else {
        resolve(results)
      }
    })
  })
}
