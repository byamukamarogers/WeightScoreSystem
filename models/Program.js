"use strict";
module.exports = function (sequelize, DataTypes) {
    var Program = sequelize.define('Program', {
        programId: {
            type: DataTypes.INTEGER,
            field: 'programid',
            primaryKey: true,
            autoIncrement: true
        },
        programName: {
            type: DataTypes.STRING(100),
            field: 'programName',
            allowNull: false
        },

        description: {
            type: DataTypes.TEXT,
            field: 'description'
        },
        maxWeights: {
            type: DataTypes.DECIMAL,
            field: 'maxweights',
            allowNull: false
        },
        maxNoOfStudents: {
            type: DataTypes.INTEGER,
            field: 'maxnoofstudents',
            defaultValue: 10,
            allowNull: false
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
            tableName: 'programs'
        });
    return Program;
}