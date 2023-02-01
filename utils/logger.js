
const winston = require('winston');
const winstonRotator = require('winston-daily-rotate-file');

var logger = winston.createLogger({
    transports: [
        new (winston.transports.DailyRotateFile)({
            name: 'access-file',
            level: 'info',
            filename: './logs/access.log',
            json: false,
            datePattern: 'yyyy-MM-DD',
            prepend: true,
            maxFiles: 10
        }),
        new (winston.transports.DailyRotateFile)({
            name: 'error-file',
            level: 'error',
            filename: './logs/error.log',
            json: false,
            datePattern: 'yyyy-MM-DD',
            prepend: true,
            maxFiles: 10
        })
    ],
    format: winston.format.combine(
        winston.format.label({
            label: `Label`
        }),
        winston.format.timestamp({
            format: 'MMM-DD-YYYY HH:mm:ss'
        }),
        winston.format.printf(info => `${info.level}: ${info.label}: ${[info.timestamp]}: ${info.message}`),
    )
});


// Create a custom error logging function
const logError = (err, req) => {
    // Extract the URL from the request object
    const url = req.originalUrl;
    let userName = (req.session.passport) ? req.session.passport.user.fullName : '';

    // Log the error message and the URL
    logger.error(`${err.message} - URL: ${url} -loggedUser: ${userName}`);
};
module.exports = { logError, logger };
