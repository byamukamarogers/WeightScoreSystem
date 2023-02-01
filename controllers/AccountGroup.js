const AccountGroup = require('../models').AccountGroup;

module.exports = {

    create: async function (req, res) {
        try {
            let data = await AccountGroup.create(req.body);
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
            let updated = await AccountGroup.update(req.body, { where: { accountGroupId: id } });
            if (updated) {
                let updatedData = await AccountGroup.findOne({ where: { accountGroupId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await AccountGroup.findAll();
        return data;
    },

    getById: async function (id) {
        let data = await AccountGroup.findOne({ where: { accountGroupId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await AccountGroup.findAll({ where: { accountGroupName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await AccountGroup.destroy({ where: { accountGroupId: id } });
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