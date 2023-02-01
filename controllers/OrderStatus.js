const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            req.body.statusId = undefined;
            let data = await models.OrderStatus.create(req.body);
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
            let updated = await models.OrderStatus.update(req.body, { where: { statusId: id } });
            if (updated) {
                let updatedData = await models.OrderStatus.findOne({ where: { statusId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await models.OrderStatus.findAll();
        return data;
    },

    getById: async function (id) {
        let data = await models.OrderStatus.findOne({ where: { statusId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await models.OrderStatus.findAll({ where: { statusName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await models.OrderStatus.destroy({ where: { statusId: id } });
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
                let result = await module.exports.getById(obj.name);
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