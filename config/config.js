const path = require('path')
const objectMege = require('object-merge')

module.exports = (fs, readFile, env = process.env.EUREKA_ENV) => {
  let defaultsfile = path.join(__dirname, 'defaults.config.js')
  let environmentfile = path.join(__dirname, `${env || ''}.config.js`)
  if (!fs.existsSync(environmentfile)) {
    /* We assume local environment as fallback */
    environmentfile = path.join(__dirname, 'local.config.js')
  }

  const config = objectMege(readFile(defaultsfile), readFile(environmentfile))

  return config
}
