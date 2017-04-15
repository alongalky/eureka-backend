module.exports = {
  cloud_provider: 'google',
  aws: {
    region: 'us-west-2'
  },
  google: {
    project: 'dotted-vim-164110',
    region: 'us-east1',
    zone: 'us-east1-b',
    instance_image: 'docker-enabled-nowrapping'
  },
  tiers: [
    {
      'name': 'n1-standard-1',
      'cpuCount': 1,
      'memoryInGb': 3.75,
      'originalPrice': 4.75,
      'pricePerHourInCents': '5.23'
    },
    {
      'name': 'n1-standard-2',
      'cpuCount': 2,
      'memoryInGb': 7.5,
      'originalPrice': 9.5,
      'pricePerHourInCents': '10.45'
    },
    {
      'name': 'n1-standard-4',
      'cpuCount': 4,
      'memoryInGb': 15,
      'originalPrice': 19,
      'pricePerHourInCents': '20.90'
    },
    {
      'name': 'n1-standard-8',
      'cpuCount': 8,
      'memoryInGb': 30,
      'originalPrice': 38,
      'pricePerHourInCents': '41.80'
    },
    {
      'name': 'n1-standard-16',
      'cpuCount': 16,
      'memoryInGb': 60,
      'originalPrice': 76,
      'pricePerHourInCents': '83.60'
    },
    {
      'name': 'n1-standard-32',
      'cpuCount': 32,
      'memoryInGb': 120,
      'originalPrice': 152,
      'pricePerHourInCents': '167.20'
    }
  ]
}
