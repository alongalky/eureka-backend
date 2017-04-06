module.exports = database => {
  return {
    getMachines: (req, res) => {
      return database.getMachines(req.key)
        .then(allMachines => res.json(allMachines))
        .catch(err => res.send(err))
    }
  }
}
