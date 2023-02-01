const Transaction = require('../models').Transaction;

module.exports = {

    create: async function (req, res) {
        try {
            let data = await Transaction.create(req.body);
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
            let updated = await Transaction.update(req.body, { where: { transactionId: id } });
            if (updated) {
                let updatedData = await Transaction.findOne({ where: { transactionId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await Transaction.findAll();
        return data;
    },

    getById: async function (id) {
        let data = await Transaction.findOne({ where: { transactionId: id } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params.id;
            let deleted = await Transaction.destroy({ where: { transactionId: id } });
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