"use strict";
module.exports = function (sequelize, DataTypes) {
    var Subject = sequelize.define('Subject', {
        subjectId: {
            type: DataTypes.INTEGER,
            field: 'subjectid',
            primaryKey: true,
            autoIncrement: true
        },
        subjectName: {
            type: DataTypes.STRING(100),
            field: 'subjectname',
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            field: 'description'
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
            tableName: 'subjects'
        });
    return Subject;
}