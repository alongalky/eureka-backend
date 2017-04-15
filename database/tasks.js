const database = require('./database')
const uuid = require('uuid')

const getTasks = ({key, account}) => {
  const query =
      'SELECT tasks.name, tasks.command, tasks.status, machines.name AS machine, tasks.tier, tasks.timestamp_start, tasks.timestamp_done ' +
    'FROM accounts ' +
    'INNER JOIN machines ON accounts.account_id = machines.account_id ' +
    'INNER JOIN tasks ON tasks.machine_id = machines.machine_id ' +
    'WHERE accounts.key = ? AND accounts.secret = ? AND accounts.account_id = ?'

  return database().query(query, [key.key, key.secret, account])
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
    'INSERT INTO tasks (`task_id`, `name`, `status`, `command`, `timestamp_start`, `tier`, `machine_id`) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?)'

  return database().query(findMachineIdQuery, [machine, key.key, key.secret, account])
    .then(([rows, fields]) => {
      if (rows.length === 0) {
        const err = new Error(`Machine ${machine} does not exist`)
        err.type = 'machine_not_exists'
        throw err
      } else {
        const taskId = uuid.v4()
        return database().query(insertTaskQuery, [taskId, taskName, 'Initializing', command, new Date(), tier, rows[0].machine_id])
          .then(([rows, fields]) => taskId)
      }
    })
}

const changeTaskStatus = (taskId, status) => {
  const changeTaskStatusQuery =
    'UPDATE tasks SET status = ? WHERE task_id = ?'

  return database().query(changeTaskStatusQuery, [status, taskId])
}

const changeTaskStatusRunning = taskId => {
  const changeTaskRunningTimestampQuery =
    'UPDATE tasks SET status = ?, timestamp_ready = ? WHERE task_id = ?'

  return database().query(changeTaskRunningTimestampQuery, ['Running', new Date(), taskId])
}

module.exports = {
  getTasks,
  addTask,
  changeTaskStatus,
  changeTaskStatusRunning
}
