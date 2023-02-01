const AccountBalance = require('../models').AccountBalance;

module.exports = {

    create: async function (req, res) {
        try {
            let data = await AccountBalance.create(req.body);
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
            let updated = await AccountBalance.update(req.body, { where: { accountBalanceId: id } });
            if (updated) {
                let updatedData = await AccountBalance.findOne({ where: { accountBalanceId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await AccountBalance.findAll();
        return data;
    },

    getById: async function (id) {
        let data = await AccountBalance.findOne({ where: { accountBalanceId: id } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await AccountBalance.destroy({ where: { accountBalanceId: id } });
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