const { reply } = require('../inc/shared.js')

// GET
function api_ping (req, res, next) {
    reply(res,{
        retcode: 200,
        message: 'pong',
    })
}

module.exports = { api_ping }