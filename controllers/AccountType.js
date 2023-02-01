const AccountType = require('../models').AccountType;

module.exports = {

    create: async function (req, res) {
        try {
            req.body.accountTypeId = undefined;
            let data = await AccountType.create(req.body);
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
            let updated = await AccountType.update(req.body, { where: { accountTypeId: id } });
            if (updated) {
                let updatedData = await AccountType.findOne({ where: { accountTypeId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await AccountType.findAll({
            order: [
                ['accountTypeId', 'ASC']
            ]
        });
        return data;
    },

    getById: async function (id) {
        let data = await AccountType.findOne({ where: { accountTypeId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await AccountType.findAll({ where: { accountTypeName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await AccountType.destroy({ where: { accountTypeId: id } });
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