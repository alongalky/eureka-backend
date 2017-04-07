const path = require('path')

module.exports = (fs, readFile, env = process.env.EUREKA_ENV) => {
  const defaultsfile = path.join(__dirname, 'defaults.config.js')
  let environmentfile = path.join(__dirname, `${env || ''}.config.js`)
  if (!fs.existsSync(environmentfile)) {
    /* We assume local environment as fallback */
    environmentfile = path.join(__dirname, 'local.config.js')
  }

  const config = Object.assign(readFile(defaultsfile), readFile(environmentfile))

  return config
}
