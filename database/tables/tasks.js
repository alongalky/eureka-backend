const connection = require('../connection')
const uuid = require('uuid')

const getTasks = ({key, account}) => {
  const query =
    'SELECT tasks.name, tasks.command, tasks.status, machines.name AS machine, tasks.tier, ' +
      'timestamp_initializing, timestamp_done ' +
    'FROM accounts ' +
    'INNER JOIN machines ON accounts.account_id = machines.account_id ' +
    'INNER JOIN tasks ON tasks.machine_id = machines.machine_id ' +
    'WHERE accounts.key = ? AND accounts.secret = ? AND accounts.account_id = ?'

  return connection().query(query, [key.key, key.secret, account])
    .then(([rows, fields]) => rows)
}

const addTask = ({command, output, machine, key, taskName, tier, account}) => {
  const findMachineIdQuery =
    'SELECT machines.machine_id ' +
    'FROM machines ' +
    'INNER JOIN accounts ' +
    'ON accounts.account_id = machines.account_id ' +
    'WHERE machines.name = ? AND accounts.key = ? AND accounts.secret = ?  AND accounts.account_id = ?'

  const insertTaskQuery =
    'INSERT INTO tasks (`task_id`, `name`, `status`, `command`, `timestamp_initializing`, `tier`, `machine_id`) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?)'

  return connection().query(findMachineIdQuery, [machine, key.key, key.secret, account])
    .then(([rows, fields]) => {
      if (rows.length === 0) {
        const err = new Error(`Machine ${machine} does not exist`)
        err.type = 'machine_not_exists'
        throw err
      } else {
        const taskId = uuid.v4()
        return connection().query(insertTaskQuery, [taskId, taskName, 'Initializing', command, new Date(), tier, rows[0].machine_id])
          .then(([rows, fields]) => taskId)
      }
    })
}

const changeTaskStatusError = taskId => {
  const query =
    'UPDATE tasks SET status = "Error" WHERE task_id = ?'

  return connection().query(query, [taskId])
}

const changeTaskStatusRunning = taskId => {
  const query =
    'UPDATE tasks SET status = "Running", timestamp_running = ? WHERE task_id = ?'

  return connection().query(query, [new Date(), taskId])
}

const changeTaskStatusInitializing = taskId => {
  const query =
    'UPDATE tasks SET status = "Initializing", timestamp_initializing = ? WHERE task_id = ?'

  return connection().query(query, [new Date(), taskId])
}

const changeTaskStatusDone = taskId => {
  const query =
    'UPDATE tasks SET status = "Done", timestamp_done = ? WHERE task_id = ?'

  return connection().query(query, [new Date(), taskId])
}

module.exports = {
  getTasks,
  addTask,
  changeTaskStatusInitializing,
  changeTaskStatusRunning,
  changeTaskStatusDone,
  changeTaskStatusError
}
