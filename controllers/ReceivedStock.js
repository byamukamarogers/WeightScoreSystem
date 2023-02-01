const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            return models.sequelize.transaction(async (t) => {
                req.body.stockId = undefined;
                req.body.userId = req.session.passport.user.staffId;
                let data = await models.ReceivedStock.create(req.body, { transaction: t });
                if (req.body.reOrderLevel < 0) {
                    throw new Error('Stock Level can not be below zero');
                }
                await models.Inventory.create({
                    inventoryId: undefined,
                    stockId: data.stockId,
                    originalQuantity: data.quantityReceived,
                    quantityAvailable: data.quantityReceived,
                    reOrderLevel: req.body.reOrderLevel,
                    status: 'In Stock'
                }, { transaction: t });
                return res.json({ success: true, data: data });
            }).then(result => {
                return result;
            });
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    update: async function (req, res) {
        try {
            let id = req.params.id;
            req.body.id = undefined;
            let updated = await models.ReceivedStock.update(req.body, { where: { stockId: id } });
            if (updated) {
                let updatedData = await models.ReceivedStock.findOne({ where: { stockId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await models.ReceivedStock.findAll({
            include: [models.Product,
            models.Staff, models.Supplier,
            models.PackagingType
            ],
            order: [
                ['dateReceived', 'ASC']
            ]
        });
        data.forEach(row => {
            row.dataValues.productName = row.Product.productName;
            row.dataValues.packagingTypeName = row.PackagingType.packagingTypeName;
            row.dataValues.supplierName = row.Supplier.supplierName;
        });
        return data;
    },

    getById: async function (id) {
        let data = await models.ReceivedStock.findOne({ where: { stockId: id } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await models.ReceivedStock.destroy({ where: { stockId: id } });
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