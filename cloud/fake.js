const fs = require('fs')
const exec = require('util').promisify(require('child_process').exec)
const logger = require('../logger/logger')()

const fakePiResult = `Pi calculator will run for 100000000 iterations
Estimated Pi: 3.1415001600000001
Real pi:      3.1415926535897931
`

module.exports = ({ database }) => ({
  runTask: (taskId, params) => {
    logger.info('Running fake task', taskId)
    database.tasks.changeTaskStatusInitializing(taskId)
      .then(() =>
        setTimeout(() => {
          database.tasks.changeTaskStatusRunning(taskId)
          setTimeout(() => {
            database.tasks.changeTaskStatusDone(taskId)
            const results = fakePiResult.replace(/^(?=.)/gm, new Date().toISOString() + ' ')
            fs.writeFileSync(`/tmp/logs-${params.taskName}`, results)
            exec(`gsutil cp /tmp/logs-${params.taskName} gs://eureka-account-${params.account}/eureka-logs/`)
              .then(() => exec(`gsutil iam ch serviceAccount:760853174060-compute@developer.gserviceaccount.com:legacyObjectOwner gs://eureka-account-${params.account}/eureka-logs/logs-${params.taskName}`))
              .then(() => logger.log('Uploaded fake results for task', taskId))
              .catch(() => logger.error('Failed to upload fake results for task', taskId))
          }, 5000 + 10000 * Math.random())
        }, 2000 + 5000 * Math.random())
      )
  }
})
