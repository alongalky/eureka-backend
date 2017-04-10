const util = require('util')

module.exports = database => {
  return {
    getMachines: (req, res) => {
      req.getValidationResult().then(result => {
        if (!result.isEmpty()) {
          res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
          return
        }

        const account = req.params.account_id
        return database.getMachines({account, key: req.key})
          .then(allMachines => res.json(allMachines))
          .catch(err => {
            console.error(err)
            return res.status(400)
          })
      })
    }
  }
}
