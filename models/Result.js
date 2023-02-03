"use strict";
module.exports = function (sequelize, DataTypes) {
    var Result = sequelize.define('Result', {
        resultId: {
            type: DataTypes.INTEGER,
            field: 'resultid',
            primaryKey: true,
            autoIncrement: true
        },
        studentId: {
            type: DataTypes.INTEGER,
            field: 'studentid',
            allowNull: false
        },
        subjectId: {
            type: DataTypes.INTEGER,
            field: 'subjectid',
            allowNull: false
        },
        mark: {
            type: DataTypes.DECIMAL,
            field: 'mark',
            defaultValue: 0.0,
            allowNull: true
        },
        grade: {
            type: DataTypes.STRING(10),
            field: 'grade',
            allowNull: false
        },
        gradeValue: {
            type: DataTypes.INTEGER,
            field: 'gradevalue',
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
            tableName: 'subjects'
        });
    return Result;
}