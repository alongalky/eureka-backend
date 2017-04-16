const delay = time => new Promise(resolve => setTimeout(resolve, time))

module.exports = (callback, delays) =>
  delays.reduce((chain, duration) =>
    chain.catch(() => delay(duration.asMilliseconds()).then(() => callback())),
    callback())
