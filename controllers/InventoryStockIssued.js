const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            req.body.stockIssuedId = undefined;
            let data = await models.InventoryStockIssued.create(req.body);
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
            let updated = await models.InventoryStockIssued.update(req.body, { where: { inventoryId: id } });
            if (updated) {
                let updatedData = await models.InventoryStockIssued.findOne({ where: { inventoryId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await models.InventoryStockIssued.findAll({
            include:[models.Inventory],
            order: [
                ['inventoryId', 'ASC']
            ]
        });
        return data;
    },

    getById: async function (id) {
        let data = await models.InventoryStockIssued.findOne({ where: { stockIssuedId: id } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await models.InventoryStockIssued.destroy({ where: { stockIssuedId: id } });
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