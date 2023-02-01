const FinancialPeriod = require('../models').FinancialPeriod;
const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            let data = await FinancialPeriod.create(req.body);
            return res.json({ success: true, data: data });
        } catch (err) {
            res.json({ success: false, error: err });
        }
    },

    update: async function (req, res) {
        try {
            let id = req.params.id;
            req.body.id = undefined;
            let updated = await FinancialPeriod.update(req.body, { where: { financialPeriodId: id } });
            if (updated) {
                let updatedData = await FinancialPeriod.findOne({ where: { financialPeriodId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await FinancialPeriod.findAll({include:[models.FiscalYear]});
        data.forEach(row=>{
            row.dataValues.fiscalYearName = row.FiscalYear.fiscalYearName; 
        });
        return data;
    },

    getById: async function (id) {
        let data = await FinancialPeriod.findOne({ where: { financialPeriodId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await FinancialPeriod.findAll({ where: { financialPeriodName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params.id;
            let deleted = await FinancialPeriod.destroy({ where: { financialPeriodId: id } });
            if (deleted) {
                return res.json({ success: true, data: data });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    default: async function (req, res) {
        let obj = req.query;
        try {
            if (obj.name) {
                let result = await module.exports.getByName(obj.name);
                return res.json({ success: true, data: result });
            }
            if (obj.id) {
                let result = await module.exports.getById(obj.id);
                return res.json({ success: true, data: result });
            }
            let result = await module.exports.getAll();
            return res.json({ success: true, data: result });
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }

    }


};