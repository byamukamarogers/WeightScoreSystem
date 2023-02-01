const FiscalYear = require('../models').FiscalYear;

module.exports = {

    create: async function (req, res) {
        try {
            let data = await FiscalYear.create(req.body);
            return res.json({ success: true, data: data });
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    update: async function (req, res) {
        try {
            let id = req.params.id;
            req.body.id = undefined;
            let updated = await FiscalYear.update(req.body, { where: { fiscalYearId: id } });
            if (updated) {
                let updatedData = await FiscalYear.findOne({ where: { fiscalYearId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await FiscalYear.findAll();
        return data;
    },

    getById: async function (id) {
        let data = await FiscalYear.findOne({ where: { fiscalYearId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await FiscalYear.findAll({ where: { fiscalYearName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params.id;
            let deleted = await FiscalYear.destroy({ where: { fiscalYearId: id } });
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