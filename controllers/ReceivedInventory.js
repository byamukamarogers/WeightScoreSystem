const models = require('../models');
const inventoryImpl = require('../controllers/Inventory');

module.exports = {

    create: async function (req, res) {
        req.body.userId = req.session.passport.user.staffId;
        try {
            return models.sequelize.transaction(async (t) => {
                req.body.stockId = undefined;
                req.body.userId = req.session.passport.user.staffId;
                let data = await models.ReceivedInventory.create(req.body, { transaction: t });
                if (!req.body.reOrderLevel) {
                    req.body.reOrderLevel = 90;
                }
                let inventory = await models.Inventory.findOne({
                    where: { productId: data.productId }
                });

                if (inventory) {
                    await models.Inventory.update(
                        {
                            stockId: data.stockId,
                            originalQuantity: inventory.quantityAvailable,
                            quantityAvailable: inventory.quantityAvailable + data.quantityReceived,
                            reOrderLevel: req.body.reOrderLevel,
                            inStock: true
                        },
                        { where: { productId: data.productId } },
                        { transaction: t }
                    );

                } else {
                    await models.Inventory.create({
                        stockId: data.stockId,
                        productId: data.productId,
                        originalQuantity: data.quantityReceived,
                        quantityAvailable: data.quantityReceived,
                        reOrderLevel: req.body.reOrderLevel,
                        inStock: true
                    }, { transaction: t });

                }

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
            return models.sequelize.transaction(async (t) => {
                let id = req.params.id;
                req.body.id = id;
                let receivedItem = await models.ReceivedInventory.findOne({ where: { stockId: req.body.id } }, { transaction: t });
                let updated = await models.ReceivedInventory.update(req.body, { where: { stockId: id } }, { transaction: t });
                if (updated) {
                    let updatedData = await models.ReceivedInventory.findOne({ where: { stockId: id } });
                    let stockLevel = await inventoryImpl.getByStockId(updatedData.stockId);
                    if (!req.body.reOrderLevel) {
                        req.body.reOrderLevel = 90;
                    }
                    if (!stockLevel) {
                        await models.Inventory.create({
                            //inventoryId: undefined,
                            stockId: req.body.id,
                            productId: req.body.productId,
                            originalQuantity: updatedData.quantityReceived,
                            quantityAvailable: updatedData.quantityReceived,
                            reOrderLevel: req.body.reOrderLevel,
                            inStock: true
                        }, { transaction: t });
                    } else {
                         await models.Inventory.update({
                            inventoryId: stockLevel.inventoryId,
                            productId: req.body.productId,
                            stockId: stockLevel.stockId,
                            originalQuantity: updatedData.quantityReceived,
                            quantityAvailable: (stockLevel.quantityAvailable - receivedItem.quantityReceived) + updatedData.quantityReceived,
                            reOrderLevel: req.body.reOrderLevel,
                            inStock: true
                        }, { where: { inventoryId: stockLevel.inventoryId } }, { transaction: t }); 
                    }
                    return res.json({ success: true, data: updatedData });
                }
            }).then(result => {
                return result;
            });
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await models.ReceivedInventory.findAll({
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
            // row.dataValues.supplierName = row.Supplier.supplierName;
        });
        return data;
    },

    getById: async function (id) {
        let data = await models.ReceivedInventory.findOne({ where: { stockId: id } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await models.ReceivedInventory.destroy({ where: { stockId: id } });
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