const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            req.body.packagingTypeId = undefined;
            let data = await models.PackagingType.create(req.body);
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
            let updated = await models.PackagingType.update(req.body, { where: { packagingTypeId: id } });
            if (updated) {
                let updatedData = await models.PackagingType.findOne({ where: { packagingTypeId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await models.PackagingType.findAll({
            order: [
                ['packagingTypeName', 'ASC']
            ]
        });
        return data;
    },

    getById: async function (id) {
        let data = await models.PackagingType.findOne({ where: { packagingTypeId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await models.PackagingType.findAll({ where: { packagingTypeName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await models.PackagingType.destroy({ where: { packagingTypeId: id } });
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