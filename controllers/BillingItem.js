const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            req.body.billingItemId = undefined;
            let data = await models.BillingItem.create(req.body);
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
            let updated = await models.BillingItem.update(req.body, { where: { billingItemId: id } });
            if (updated) {
                let updatedData = await models.BillingItem.findOne({ where: { billingItemId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await models.BillingItem.findAll({
            include: models.BillingType,
            order: [
                [models.BillingType, 'billingTypeName', 'ASC'],
                ['billingItemName', 'ASC']
            ]
        });
        data.forEach(row => {
            row.dataValues.billingTypeName = row.BillingType.billingTypeName;
        });
        return data;
    },

    getById: async function (id) {
        let data = await models.BillingItem.findOne({ where: { billingItemId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await models.BillingItem.findAll({ where: { billingItemName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await models.BillingItem.destroy({ where: { billingItemId: id } });
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