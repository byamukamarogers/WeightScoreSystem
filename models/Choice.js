"use strict";
module.exports = function (sequelize, DataTypes) {
    var Choice = sequelize.define('Choice', {
        choiceId: {
            type: DataTypes.INTEGER,
            field: 'choiceid',
            primaryKey: true,
            autoIncrement: true
        },
        studentId: {
            type: DataTypes.INTEGER,
            field: 'studentid'
        },
        schoolId: {
            type: DataTypes.INTEGER,
            field: 'schoolid'
        },
        choiceLevel: {
            type: DataTypes.INTEGER,
            field: 'choicelevel'
        }
    },
        {
            underscored: true,
            timestamps: false,
            tableName: 'choices'
        });
    return Choice;
}