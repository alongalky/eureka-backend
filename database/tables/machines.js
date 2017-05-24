const connection = require('../connection')

module.exports = {
  createMachine: machine => {
    const query =
      'INSERT INTO `machines` ' +
      '(`machine_id`, `name`, `account_id`, `vm_id`, `container_id`, `ssh_port`) ' +
      'VALUES (?, ?, ?, ?, ?, ?)'

    return connection().query(query, Object.values(machine))
      .then(([rows, fields]) => rows[0])
  },
  getMachines: accountId => {
    const query =
      'SELECT machines.machine_id, machines.name, machines.vm_id, machines.container_id, machines.ssh_port ' +
      'FROM accounts ' +
      'INNER JOIN machines ON accounts.account_id = machines.account_id ' +
      'WHERE accounts.account_id = ?'

    return connection().query(query, [accountId])
      .then(([rows, fields]) => rows)
  }
}
