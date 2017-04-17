const util = require('util')
const jwt = require('jsonwebtoken')
const logger = require('../../logger/logger')()
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt

module.exports = ({ database, config }) => ({
  authenticate: (req, res) => {
    // Validation
    req.checkBody('key').notEmpty().isLength({min: 1, max: 255})
    req.checkBody('secret').notEmpty().isLength({min: 1, max: 255})
    req.checkBody('account_id', 'Account ID must be a valid lower-case UUID').notEmpty().isUUID().isLowercase()

    req.getValidationResult().then(result => {
      if (!result.isEmpty()) {
        return res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
      }
      database.accounts.getAccountSecretKey(req.body.account_id)
        .then(account => {
          if (!account ||
              account.account_id !== req.body.account_id ||
              account.key !== req.body.key ||
              account.secret !== req.body.secret) {
            res.status(401).json({ success: false, message: 'Authentication failed. Wrong Key/Secret combination.' })
          } else {
            const token = jwt.sign({key: account.key, account_id: account.account_id}, config.authentication.secret, {
              expiresIn: '7 days'
            })

            // return the information including token as JSON
            res.json({
              success: true,
              message: 'Enjoy your token!',
              token: 'JWT ' + token
            })
          }
        })
        .catch(err => {
          logger.error(err)
        })
    })
  },

  Strategy: () => {
    const opts = {
      jwtFromRequest: ExtractJwt.fromAuthHeader(),
      secretOrKey: config.authentication.secret
    }
    return new JwtStrategy(opts, (jwtPayload, done) => {
      database.accounts.getAccount(jwtPayload.account_id)
        .then(account => {
          if (account.account_id === jwtPayload.account_id) {
            return done(null, account)
          } else {
            return done(null, false, { message: 'Token does not match account' })
          }
        })
        .catch(err => {
          return done(err, false)
        })
    })
  }
})
