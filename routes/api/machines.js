const util = require('util')
const logger = require('../../logger/logger')()

module.exports = ({ database, cloud }) => {
  return {
    getMachines: (req, res) => {
      req.getValidationResult().then(result => {
        if (!result.isEmpty()) {
          res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
          return
        }

        const account = req.params.account_id
        return database.machines.getMachines(account)
          .then(allMachines =>
            Promise.all(allMachines.map(machine =>
              cloud.resolveInstanceExternalIp(machine.vm_id)
                .then(ip => Object.assign(machine, {ip})))))
          .then(allMachines => {
            res.json(allMachines.map(machine => ({
              machine_id: machine.machine_id,
              name: machine.name,
              ssh_port: machine.ssh_port,
              ssh_ip: machine.ip
            })))
          })
          .catch(err => {
            logger.error(err)
            res.status(500).send('Failed to get machines')
          })
      })
    }
  }
}
