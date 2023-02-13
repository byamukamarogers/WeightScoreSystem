"use strict";
module.exports = function (sequelize, DataTypes) {
    var AdmissionList = sequelize.define('AdmissionList', {
        admissionId: {
            type: DataTypes.INTEGER,
            field: 'admissionid',
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
        admitted: {
            type: DataTypes.BOOLEAN,
            field: 'admited',
            defualtValue: false
        }
    },
        {
            underscored: true,
            timestamps: false,
            tableName: 'admissionlist'
        });
    return AdmissionList;
}