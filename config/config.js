const path = require('path')
const deepExtend = require('deep-extend')

module.exports = (fs, readFile, env = process.env.EUREKA_ENV) => {
  const defaultsfile = path.join(__dirname, 'defaults.config.js')
  let environmentfile = path.join(__dirname, `${env || ''}.config.js`)
  if (!fs.existsSync(environmentfile)) {
    /* We assume local environment as fallback */
    environmentfile = path.join(__dirname, 'local.config.js')
  }

  return deepExtend(readFile(defaultsfile), readFile(environmentfile))
}
