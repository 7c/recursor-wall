const argv = require('minimist')(process.argv.slice(2))
const chalk = require('chalk')
const vars = require('./vars')

function reply(res, ops) {
    console.log(chalk.green.inverse(`reply`), JSON.stringify(ops))
    return res.json({
        ...ops
    })
}

function import_or_create_token() {
    if (argv.token && typeof argv.token === 'string' && argv.token.length > 3) vars.token = argv.token;
    else vars.token = randomString(8)
    console.log(chalk.inverse(`authentication token=${chalk.bold(vars.token)}`), argv.token ? `` : `you will need this token, you may define a static one via --token parameter`)
}

module.exports = {
    reply,
    import_or_create_token
}