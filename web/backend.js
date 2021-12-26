const argv = require('minimist')(process.argv.slice(2))
const express = require('express');
const chalk = require('chalk');
const { softexit, randomString } = require('mybase')
const bodyParser = require('body-parser')
const app = express()
const vars = require('./inc/vars')
const { getConfig, Sentry } = require('./config.js')
const package = require('./../package.json')
const { api_ping } = require('./api/ping')
const middleware_logging = require('./api/middleware/logging.js');
const setupIOServer = require('./inc/socketio-server');
const { import_or_create_token, redis_client } = require('./inc/shared')
const redis = require("redis")

// app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(bodyParser.json({ limit: '1mb', strict: false }));
app.use(middleware_logging)

// static
app.use('/', express.static('static'))

// api endpoints
app.get('(/api)?/ping', api_ping)


function subscribeRedis(config) {
    return new Promise(async function (resolve, reject) {
        var sub = redis.createClient({ host: config.redisserver.host, port: config.redisserver.port })
        sub.subscribe(config.redisserver.queries_channel, (message) => {
            console.log(`>${config.redisserver.queries_channel}:`, message)
            // send subscribed channel content to all socket.io-clients (peers)
            for (let clientid in vars.peers) {
                vars.peers[clientid].emit('query', message)
            }
        })

        sub.on("ready", function (err) {
            console.log(`redis ready`)
        })
        sub.on("connect", function () {
            console.log(`redis connect`)
        })
        sub.on("error", function (err) {
            console.log(`redis error`, err)
        })
        await sub.connect()
        return resolve(sub)
    })
}
// initiate services
async function bootstrap() {

    console.log(chalk.green(`Starting API Server`))
    try {
        config = await getConfig()
        await subscribeRedis(config)
        vars.redis_client = await redis_client(config)
        // start apiserver --port can modify the port
        var apiserver_port = argv.port ? argv.port : config.apiserver.port
        var server = app.listen(apiserver_port, config.apiserver.ip, async function () {
            console.log(chalk.bold(`${package.name} ${package.version} API Server is running at ${chalk.yellow(config.apiserver.ip)}:${chalk.yellow(apiserver_port)}`))
            import_or_create_token()
        })

        // start a socket-io server on same port
        var io = require('socket.io')(server, { cors: { origin: '*', } })
        await setupIOServer(io)
    }
    catch (err) {
        console.log(`Exception at start:`, err)
        if (Sentry) Sentry.captureException(err, { extra: { location: 'bootstrap' } })
        softexit(60)
    }
}

bootstrap()
