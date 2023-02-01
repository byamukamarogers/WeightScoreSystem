const { Pool, Client } = require('pg');
module.exports.getPgClient = function () {
    client = getPGClient();
    return client;
}
function getPGClient() {
    try {
        const client = new Client({
            user: process.env.DBUSER || 'postgres',
            host: process.env.DBHOST || 'localhost',
            database: process.env.DBNAME || 'ehealth',
            password: process.env.DBPASSWORD || 'rebkam',
            port: process.env.DBPORT || 5433
        });
        return client;
    } catch (err) {
        console.log(err);
    }
}