const getMachines = (req, res) => {
  // TODO: integrate with db
  const mockMachines = [
    { id: 'machina1' }, { id: 'machina2' }
  ]

  res.json(mockMachines)
}

module.exports = {
  getMachines
}
