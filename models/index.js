const config = require('../config');
const sequelize = config.sequelize;

//const Sequelize = require ('sequelize');
const db = {};
db.sequelize = sequelize;
db.Sequelize = config.Sequelize;

db.Client = sequelize.import('./Client');
db.School = sequelize.import('./School');
db.Student = sequelize.import('./Student');
db.Choice = sequelize.import('./Choice');
db.AdmissionList = sequelize.import('./AdmissionList');


/*sequelize.sync({ alter: true })
    .then(() => {
        console.log(`Tables Altered!`)
    })*/
module.exports = db;

