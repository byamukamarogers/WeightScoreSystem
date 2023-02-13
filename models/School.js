"use strict";
module.exports = function (sequelize, DataTypes) {
    var School = sequelize.define('School', {
        schoolId: {
            type: DataTypes.INTEGER,
            field: 'schoolid',
            primaryKey: true,
            autoIncrement: true
        },
        schoolName: {
            type: DataTypes.STRING(100),
            field: 'schoolname',
            allowNull: false
        },
        cutOffPoints: {
            type: DataTypes.INTEGER,
            field: 'cutoffpoints',
            allowNull: false
        },
        noOfStudents: {
            type: DataTypes.INTEGER,
            field: 'noofstudent',
            allowNull: false
        }
    },
        {
            underscored: true,
            timestamps: false,
            tableName: 'schools'
        });
    return School;
}