const database = require('./database')
const uuid = require('uuid')

const newUuid = () => uuid.v1().replace(/-/g, '')

module.exports = {
  getTasks: (key) => new Promise((resolve, reject) => {
    const query =
      'SELECT tasks.id, tasks.command, tasks.status, machines.name AS machine ' +
      'FROM accounts ' +
      'INNER JOIN machines ON accounts.id = machines.owner_account_id ' +
      'INNER JOIN tasks ON tasks.machine_id = machines.id ' +
      'WHERE accounts.key = ? AND accounts.secret = ?'

    database().query(query, [key.key, key.secret], (error, results, fields) => {
      if (error) {
        reject(error)
      } else {
        resolve(results)
      }
    })
  }),

  addTask: ({command, output, machine, key}) => new Promise((resolve, reject) => {
    const findMachineIdQuery =
      'SELECT machines.id as machine_id ' +
      'FROM machines ' +
      'INNER JOIN accounts ' +
      'ON accounts.id = machines.owner_account_id ' +
      'WHERE machines.name = ? AND accounts.key = ? AND accounts.secret = ?'

    const insertTaskQuery =
      'INSERT INTO tasks (`id`, `machine_id`, `status`, `timestamp`, `command`) ' +
      'VALUES (?, ?, \'Running\', \'Now\', ?)'

    database().query(findMachineIdQuery, [machine, key.key, key.secret], (error, results, fields) => {
      if (error) {
        reject(error)
      } else {
        if (results.length === 0) {
          reject(new Error(`Machine ${machine} does not exist`))
        } else {
          database().query(insertTaskQuery, [newUuid(), results[0].machine_id, command], (error, results, fields) => {
            if (error) {
              reject(error)
            } else {
              resolve(true)
            }
          })
        }
      }
    })
  })
}
