"use strict";
module.exports = function (sequelize, DataTypes) {
    var Client = sequelize.define('Client', {
        clientId: {
            type: DataTypes.INTEGER,
            field: 'clientid',
            primaryKey: true
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
        title: {
            type: DataTypes.STRING(100),
            field: 'title'
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
        bloodGroup: {
            type: DataTypes.STRING(5),
            field: 'bloodgroup'
        },
        occupation: {
            type: DataTypes.STRING(100),
            field: 'occupation'
        },
        dob: {
            type: DataTypes.DATE,
            field: 'dob'
        },
        birthDateEstimated: {
            type: DataTypes.STRING(5),
            field: 'birthdateestimated'
        },
        nationalId: {
            type: DataTypes.STRING(20),
            field: 'nationalidno'
        },
        branchId: {
            type: DataTypes.INTEGER,
            field: 'branchid',
            allowNull: false,
            defualtValue: 1
        },
        spokenLanguages: {
            type: DataTypes.STRING(250),
            field: 'languages'
        },
        //contact info
        homeArea: {
            type: DataTypes.STRING(15),
            field: 'homearea'
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
        phone2: {
            type: DataTypes.STRING(15),
            field: 'phone2'
        },
        profilePhoto: {
            type: DataTypes.TEXT,
            field: 'profilephoto',
            allowNull: true
        },
        accountType: {
            type: DataTypes.STRING(15),
            field: 'accounttype',
            defaultValue: 'clientaccount',
            allowNull: true
        },
        districtId: {
            type: DataTypes.STRING(20),
            field: 'districtid'
        },
        subcountyId: {
            type: DataTypes.STRING(20),
            field: 'subcountyid'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            field: 'createdby',
            allowNull: false
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            field: 'updatedby'
        },

    },
        {
            underscored: true,
            timestamps: false,
            tableName: 'clients'
        });
    return Client;
}