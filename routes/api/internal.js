const util = require('util')
const logger = require('../../logger/logger')()

module.exports = ({ database, config, cloud }) => {
  return {
    doneTask: (req, res) => {
      req.checkParams('task_id', 'Task ID must be a valid lower-case UUID').notEmpty().isUUID().isLowercase()
      req.getValidationResult().then(result => {
        if (!result.isEmpty()) {
          res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
          return
        }

        const taskId = req.params.task_id
        return cloud.terminateTask(taskId)
          .then(() => database.tasks.changeTaskStatusDone(taskId))
          .then(() => {
            logger.info('Succesfully terminated task', taskId)
            res.status(201).send({message: 'Task terminated successfuly'})
          })
          .catch(err => {
            // TODO: Alert
            logger.error(err)
            res.status(500).send(`Failed to transition task ${taskId} to Done`)
            return database.tasks.changeTaskStatusError(taskId)
          })
          .catch(err => {
            // TODO: Alert
            logger.error(err)
          })
      })
    }
  }
}
