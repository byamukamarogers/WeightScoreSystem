const dao = require('./dao');
const bcrypt = require('bcrypt');
const path = require('path');
const models = require('../models');
const LocalStrategy = require('passport-local').Strategy;
const Sequelize = require("sequelize");
const { logError } = require('./logger');
const Op = Sequelize.Op;

module.exports = init;
module.exports.authenticate = function (req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/login');
        //next();
    }
}
function init(passport) {
    passport.use('local', new LocalStrategy({
        passReqToCallback: true
    }, async function (req, userid, password, done) {
        try {
            let user = await models.User.findOne({
                where: { userId: userid },
                include: [{
                    model: models.Staff,
                    include: [{ model: models.UserPermission, include: models.UserRole }, models.ClinicalStaff]
                }]
            });
            //check if user is active
            if (user) {
                let isValid = bcrypt.compareSync(password, user.password);
                if (isValid) {
                    user.password = undefined;
                    let staff = await models.Staff.findOne({ where: { staffId: user.staffId } });
                    if (staff) {
                        user.fullName = [staff.firstName, staff.lastName, staff.otherName].join(' ');
                        user.healthUnitId = staff.healthUnitId;
                        //user.HealthUnit = await models.HealthUnit.findOne({where: {healthUnitId: user.healthUnitId}, include:[models.HealthUnitCategory, models.HealthUnitType]})
                        user.departmentId = staff.departmentId;
                    }
                    done(null, user.get({ flat: true }));
                } else {
                    done(null, false);
                }
            } else {
                return done(null, false);
            }
        } catch (err) {
            console.log(err);
            logError(err, req)
        }
    }
    ));

    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(async function (user, done) {
        //let user = await models.User.findOne({ where: { userId: user.userid } });
        if (user) {
            user.password = null;
            //let roles = await models.Roles.findAll({ where: { userId: userid } });
            //user.roles = roles;
            let staff = await models.Staff.findOne({ where: { staffId: user.staffId } });
            if (staff) {
                user.fullName = [staff.firstName, staff.lastName].join(' ');
                user.healthUnitId = staff.healthUnitId;
                user.HealthUnit = await models.HealthUnit.findOne({ where: { healthUnitId: user.healthUnitId }, include: [models.HealthUnitCategory, models.HealthUnitType, models.Country] });
                user.Branch = await models.Branch.findOne({ where: { healthUnitId: user.healthUnitId } });
                user = { ...user, ...user.Branch }
                user.departmentId = staff.departmentId;
            }
            return done(null, user);
        }
        return done('Failed to deserialize User stuff', false);
    });
}
