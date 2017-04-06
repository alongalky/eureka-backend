const database = require('./database')
const uuid = require('uuid')

module.exports = {
  getTasks: (key) => {
    const query =
      'SELECT tasks.name, tasks.command, tasks.status, machines.name AS machine, tasks.tier, tasks.timestamp_start ' +
      'FROM accounts ' +
      'INNER JOIN machines ON accounts.account_id = machines.account_id ' +
      'INNER JOIN tasks ON tasks.machine_id = machines.machine_id ' +
      'WHERE accounts.key = ? AND accounts.secret = ?'

    return database().query(query, [key.key, key.secret])
      .then(([rows, fields]) => rows)
  },

  addTask: ({command, output, machine, key, taskName, tier}) => {
    const findMachineIdQuery =
      'SELECT machines.machine_id ' +
      'FROM machines ' +
      'INNER JOIN accounts ' +
      'ON accounts.account_id = machines.account_id ' +
      'WHERE machines.name = ? AND accounts.key = ? AND accounts.secret = ?'

    const insertTaskQuery =
      'INSERT INTO tasks (`task_id`, `name`, `status`, `command`, `timestamp_start`, `tier`, `machine_id`) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?)'

    return database().query(findMachineIdQuery, [machine, key.key, key.secret])
      .then(([rows, fields]) => {
        if (rows.length === 0) {
          throw new Error(`Machine ${machine} does not exist`)
        } else {
          return database().query(insertTaskQuery, [uuid.v4(), taskName, 'Initializing', command, new Date(), tier, rows[0].machine_id])
            .then(([rows, fields]) => rows)
        }
      })
  }
}
