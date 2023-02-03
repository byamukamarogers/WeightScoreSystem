const Sequelize = require('sequelize');
const logger = require('./utils/logger').logger;
let dbname = process.env.DBNAME
let dbhost = process.env.DBHOST
let dbuser = process.env.DBUSER
let dbpassword = process.env.DBPASSWORD
let dbport = process.env.DBPORT;
let dbdailect = process.env.DBDIALECT
module.exports.Sequelize = Sequelize;

let conn = new Sequelize({
    dialect: 'sqlite',
    storage: 'db/database.sqlite',
    logging: false,
    omitNull: true,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});
test();
async function test() {
    logger.info('Server Started ');
    try {
        await conn.authenticate();
        logger.info('Connection is OK ');
        console.log('Connection is good');
    } catch (err) {
        console.log(err)
        console.log('Failed to get a connection');
        logger.error('Failed to get a connection');
        logger.error(err);
    }
}
module.exports.sequelize = conn;
