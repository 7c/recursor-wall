const argv = require('minimist')(process.argv.slice(2))
var { } = require('mybase')
const vars = require('./inc/vars')
const Sentry = false

function getConfig() {
    return new Promise(async function (resolve, reject) {
        try {
            vars.config = config
            resolve(config)
        }
        catch (err) {
            reject(err)
        }
    })
}

var config = {
    apiserver: {
        ip: '0.0.0.0',
        port: 81
    },
    redisserver: {
        host:'127.0.0.1',
        port:6379,
        queries_channel:'queries' // this should match with recursor publishing channel
    },
}


if (require.main === module) {
    getConfig().then(c => {
        console.log(c)
        process.exit(0)
    })
}

module.exports = {
    Sentry,
    getConfig
}