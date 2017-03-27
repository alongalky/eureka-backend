const getMachines = (req, res) => {
  // TODO: integrate with db
  const mockMachines = [
    { name: 'machina1' }, { name: 'machina2' }
  ]

  res.json(mockMachines)
}

module.exports = {
  getMachines
}
