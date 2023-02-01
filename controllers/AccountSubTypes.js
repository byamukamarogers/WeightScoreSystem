const AccountSubType = require('../models').AccountSubType;
const models = require('../models');
module.exports = {

    create: async function (req, res) {
        try {
            let data = await AccountSubType.create(req.body);
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
            let updated = await AccountSubType.update(req.body, { where: { accountSubTypeId: id } });
            if (updated) {
                let updatedData = await AccountSubType.findOne({ where: { accountSubTypeId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await models.AccountSubType.findAll({
            include: [models.AccountType],
            order: [
                [models.AccountType, 'accountTypeId', 'ASC'],
                ['accountSubTypeId', 'ASC']
            ]
        });
        data.forEach(row => {
            row.dataValues.accountTypeName = row.AccountType.accountTypeName;
        });
        return data;
    },

    getById: async function (id) {
        let data = await AccountSubType.findOne({ where: { accountSubTypeId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await AccountSubType.findAll({ where: { accountSubTypeName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await AccountSubType.destroy({ where: { accountSubTypeId: id } });
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