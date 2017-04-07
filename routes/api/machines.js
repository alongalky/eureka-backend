module.exports = database => {
  return {
    getMachines: (req, res) => {
      const account = req.params.account_id
      return database.getMachines({account, key: req.key})
        .then(allMachines => res.json(allMachines))
        .catch(err => {
          console.error(err)
          return res.status(400)
        })
    }
  }
}
