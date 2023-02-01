const Currency = require('../models').Currency;
const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            let data = await Currency.create(req.body);
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
            let updated = await Currency.update(req.body, { where: { currencyId: id } });
            if (updated) {
                let updatedData = await Currency.findOne({ where: { currencyId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await Currency.findAll();
        return data;
    },

    getById: async function (id) {
        let data = await Currency.findOne({ where: { currencyId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await Currency.findAll({ where: { currencyName: name } });
        if (data) {
            return data;
        }
    },

    getBySymbol: async function (symbol) {
        let data = await Currency.findAll({ where: { currencySymbol: symbol } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await Currency.destroy({ where: { currencyId: id } });
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
            if (obj.symbol) {
                let result = await module.exports.getBySymbol(obj.symbol);
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