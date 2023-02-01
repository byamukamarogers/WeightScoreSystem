const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            req.body.billingTypeId = undefined;
            let data = await models.BillingType.create(req.body);
            //return res.status(201).json({ data, }); 
            return res.json({ success: true, data: data }); //This allows us to check the success flag before attempting to read data
        } catch (err) {
            //res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
            res.json({ success: false, error: err });//This can be quickly and easily managed at the client level. In other words, if success is false, check the error object to see what happened
            console.log(err);
        }
    },

    update: async function (req, res) {
        try {
            let id = req.params.id;
            req.body.id = undefined;
            let updated = await models.BillingType.update(req.body, { where: { billingTypeId: id } });
            if (updated) {
                let updatedData = await models.BillingType.findOne({ where: { billingTypeId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await models.BillingType.findAll({
            order: [
                ['billingTypeId', 'ASC']
            ]
        });
        return data;
    },

    getById: async function (id) {
        let data = await models.BillingType.findOne({ where: { billingTypeId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await models.BillingType.findAll({ where: { billingTypeName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await models.BillingType.destroy({ where: { billingTypeId: id } });
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