const connection = require('../connection')
const uuid = require('uuid')

const getTasks = ({account}) => {
  // This query rounds the duration up to the nearest minute when calculating cost,
  // but returns the duration in seconds.
  const query = `
    SELECT tasks.name, tasks.command, tasks.status, machines.name AS machine_name,
      tasks.tier_id as tier_id, tiers.name as tier, timestamp_initializing,
      timestamp_done, tiers.price_per_hour_in_cent, accounts.spending_quota
    FROM accounts
    INNER JOIN machines ON accounts.account_id = machines.account_id
    INNER JOIN tasks ON tasks.machine_id = machines.machine_id
    INNER JOIN tiers ON tasks.tier_id = tiers.tier_id
    WHERE accounts.account_id = ?`

  return connection().query(query, [account])
    .then(([rows, fields]) => rows)
}

const addTask = ({command, machineName, taskName, tierId, account}) => {
  const findMachineIdQuery =
    'SELECT machines.machine_id ' +
    'FROM machines ' +
    'INNER JOIN accounts ' +
    'ON accounts.account_id = machines.account_id ' +
    'WHERE machines.name = ? AND accounts.account_id = ?'

  const insertTaskQuery =
    'INSERT INTO tasks (`task_id`, `name`, `status`, `command`, `timestamp_initializing`, `tier_id`, `machine_id`) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?)'

  return connection().query(findMachineIdQuery, [machineName, account])
    .then(([rows, fields]) => {
      if (rows.length === 0) {
        const err = new Error(`Machine ${machineName} does not exist`)
        err.type = 'machine_not_exists'
        throw err
      } else {
        const taskId = uuid.v4()
        return connection().query(insertTaskQuery, [taskId, taskName, 'Initializing', command, new Date(), tierId, rows[0].machine_id])
          .then(([rows, fields]) => taskId)
      }
    })
}

const changeTaskStatusError = taskId => {
  const query =
    'UPDATE tasks SET status = "Error", timestamp_done = ? WHERE task_id = ?'

  return connection().query(query, [new Date(), taskId])
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
