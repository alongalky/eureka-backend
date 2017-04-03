const machines = require('../../database/machines')

const getMachines = (req, res) => {
  machines.getMachines(req.key)
    .then(allMachines => res.json(allMachines))
    .catch(err => res.send(err))
}

module.exports = {
  getMachines
}
