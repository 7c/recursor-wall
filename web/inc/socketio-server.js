const chalk = require('chalk')
const vars = require('./vars.js')


function setupIOServer(io) {
    return new Promise(async function (resolve,reject) {
        io.sockets.on('connection', function(client){
            var clientid = client.conn.id
            client.ip = client.handshake.headers.hasOwnProperty('x-tha-ip') && validIp(client.handshake.headers['x-tha-ip'])
            ? client.handshake.headers['x-tha-ip']
            : client.handshake.address
            client.browser = client.handshake.headers.hasOwnProperty('user-agent') ? client.handshake.headers['user-agent'] : '-'
            //client.handshake.headers['x-forwarded-for'] || client.handshake.address.address;
            console.log(`socketio: a client has connected with id ${clientid} and address ${client.ip}`);
            client.on('disconnect', function(){
                // disconnects are 2 different
                // one is server initiated which does not cause reconnect (event='io server disconnect')
                // other is transport based (connection drops), they cause to reconnect (event='transport close')
                if (vars.peers.hasOwnProperty(clientid)) delete vars.peers[clientid]   
                // if (admins.hasOwnProperty(clientid)) delete admins[clientid]
            });
            client.on('auth',(data)=>{
                console.log('auth',data)
                var { secret } = data
                if (!secret) {
                    console.log(chalk.red(`${client.ip} peer without secret, disconnecting`))
                    return client.disconnect()
                }
                if (vars.token && vars.token===secret) {
                    vars.peers[clientid]=client
                    console.log(chalk.green(`${client.ip} client accepted with id ${clientid}`))
                    client.emit('welcome')
                    
                    return
                }
                console.log(chalk.red(`${client.ip} peer has invalid secret '${secret}', disconneting`))
                return client.disconnect()
            })
            client.on('publish',function (channel){
                // var clientid = client.conn.id
                // console.log(`channel=${channel}`,clientid)
                // if (admins.hasOwnProperty(clientid)) {
                //     console.log(chalk.green(`${clientid} you are eligable to publish`))
                //     for(var clientid in vars.peers) {
                //         vars.peers[clientid].emit('test','ok')
                //     }
                // }
                // else console.log(chalk.red(`${clientid} you are NOT eligable to publish`))
            })
        })
    })
}

module.exports = setupIOServer