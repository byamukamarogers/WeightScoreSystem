"use strict";
module.exports = function (sequelize, DataTypes) {
    var Student = sequelize.define('Student', {
        studentId: {
            type: DataTypes.INTEGER,
            field: 'studentId',
            primaryKey: true,
            autoIncrement: true
        },
        firstName: {
            type: DataTypes.STRING(100),
            field: 'firstname',
            allowNull: false
        },
        lastName: {
            type: DataTypes.STRING(100),
            field: 'lastname'
        },
        otherName: {
            type: DataTypes.STRING(100),
            field: 'othername'
        },
        gender: {
            type: DataTypes.STRING(100),
            field: 'gender'
        },
        maritalStatus: {
            type: DataTypes.STRING(100),
            field: 'maritalstatus'
        },
        nationality: {
            type: DataTypes.INTEGER,
            field: 'nationality'
        },
        occupation: {
            type: DataTypes.STRING(100),
            field: 'occupation'
        },
        dob: {
            type: DataTypes.DATE,
            field: 'dob'
        },
        nationalId: {
            type: DataTypes.STRING(20),
            field: 'nationalidno'
        },
        spokenLanguages: {
            type: DataTypes.STRING(250),
            field: 'languages'
        },
        address: {
            type: DataTypes.TEXT,
            field: 'address',
            defualtValue: ''
        },
        phone1: {
            type: DataTypes.STRING(15),
            field: 'phone1'
        },
        email: {
            type: DataTypes.STRING(70),
            field: 'email'
        },
        district: {
            type: DataTypes.STRING(20),
            field: 'district'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            field: 'createdby',
            allowNull: false
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            field: 'updatedby'
        }
    },
        {
            underscored: true,
            timestamps: false,
            tableName: 'students'
        });
    return Student;
}