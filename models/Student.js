"use strict";
module.exports = function (sequelize, DataTypes) {
    var Student = sequelize.define('Student', {
        studentId: {
            type: DataTypes.INTEGER,
            field: 'studentid',
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            field: 'name',
            allowNull: false
        },
        dob: {
            type: DataTypes.DATE,
            field: 'dob'
        },
        aggregate: {
            type: DataTypes.INTEGER,
            field: 'aggregate'
        }
    },
        {
            underscored: true,
            timestamps: false,
            tableName: 'students'
        });
    return Student;
}