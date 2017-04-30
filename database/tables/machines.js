const connection = require('../connection')

module.exports = {
  getMachines: account => {
    const query =
      'SELECT machines.machine_id, machines.name, machines.vm_id, machines.container_id, machines.ssh_port ' +
      'FROM accounts ' +
      'INNER JOIN machines ON accounts.account_id = machines.account_id ' +
      'WHERE accounts.account_id = ?'

    return connection().query(query, [account])
      .then(([rows, fields]) => rows)
  }
}
