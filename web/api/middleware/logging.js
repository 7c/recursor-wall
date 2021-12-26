const chalk = require('chalk')

function middleware_logging(req, res, next) {
    var { client } = req
    if (req.method==='GET')
        console.log(chalk.yellow.inverse(`request`),chalk.blue.inverse('GET'),chalk.green(`${req.originalUrl}`))
        else
    if (req.method==='POST')
        console.log(chalk.yellow.inverse(`request`),chalk.blue.inverse('POST'),chalk.green(`${req.originalUrl}`),JSON.stringify(req.body))
    next()
}

module.exports = middleware_logging