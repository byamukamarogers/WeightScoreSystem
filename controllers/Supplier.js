const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            req.body.supplierId = undefined;
            req.body.userId = req.session.passport.user.staffId;
            let data = await models.Supplier.create(req.body);
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
            let updated = await models.Supplier.update(req.body, { where: { supplierId: id } });
            if (updated) {
                let updatedData = await models.Supplier.findOne({ where: { supplierId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await models.Supplier.findAll({
            include:[models.Staff],
            order: [
                ['supplierName', 'ASC']
            ]
        });
        return data;
    },

    getById: async function (id) {
        let data = await models.Supplier.findOne({ where: { supplierId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await models.Supplier.findAll({ where: { supplierName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await models.Supplier.destroy({ where: { supplierId: id } });
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