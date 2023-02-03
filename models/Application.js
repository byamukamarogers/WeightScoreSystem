"use strict";
module.exports = function (sequelize, DataTypes) {
    var Application = sequelize.define('Application', {
        applicationId: {
            type: DataTypes.INTEGER,
            field: 'applicationid',
            primaryKey: true,
            autoIncrement: true
        },
        studentId: {
            type: DataTypes.INTEGER,
            field: 'studentid',
            allowNull: false
        },
        programId: {
            type: DataTypes.INTEGER,
            field: 'programid',
            allowNull: false
        },
        dateReceived: {
            type: DataTypes.DATE,
            field: 'datereceived',
            defaultValue: new Date(),
            allowNull: true
        },
        createdBy: {
            type: DataTypes.INTEGER,
            field: 'createdby',
            allowNull: true
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            field: 'updatedby'
        }
    },
        {
            underscored: true,
            timestamps: true,
            tableName: 'applications'
        });
    return Application;
}