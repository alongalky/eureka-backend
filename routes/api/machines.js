const util = require('util')
const logger = require('../../logger/logger')()
const client = require('scp2')

module.exports = ({ database, cloud }) => {
  const getMachinesWithIps = accountId =>
    database.machines.getMachines(accountId)
      .then(allMachines =>
        Promise.all(allMachines.map(machine =>
          cloud.resolveInstanceExternalIp(machine.vm_id)
            .then(ip => Object.assign(machine, {ip})))))

  return {
    getMachines: (req, res) => {
      req.getValidationResult().then(result => {
        if (!result.isEmpty()) {
          res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
          return
        }

        getMachinesWithIps(req.params.account_id)
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
    },
    uploadFile: (req, res) => {
      req.getValidationResult().then(result => {
        if (!result.isEmpty()) {
          res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
          return
        }

        getMachinesWithIps(req.params.account_id)
          .then(machines => {
            if (machines.length !== 1) {
              logger.error(`More than one machine per user in account ${req.params.account_id}, not supported yet`)
              throw new Error()
            }
            const machine = machines[0]

            logger.info(`Uploading file ${req.file.originalname} for account ${req.params.account_id}`)

            client.scp(req.file.path, {
              host: machine.ip,
              username: 'root',
              port: parseInt(machine.ssh_port),
              password: 'eureka',
              path: `/root/${req.file.originalname}`
            }, err => {
              if (err) {
                logger.error(err)
                res.status(500)
              } else {
                res.status(200).end()
              }
            })
          })
          .catch(err => {
            logger.error(err)
            res.status(500).send('Failed to get machines')
          })
      })
    }
  }
}
