const AccountCategory = require('../models').AccountCategory;
const models = require('../models');
const accountImp = require('../controllers/Account');
const accountGroupImp = require('../controllers/AccountGroup');

module.exports = {

    create: async function (req, res) {
        try {
            return models.sequelize.transaction(async (t) => {
                let data = await AccountCategory.create(req.body, { transaction: t });
                let summaryGroup = await accountGroupImp.getByName('Summary Account');
                if (!summaryGroup) {
                    throw new Error('Failed to get Summary Group Account ID');
                }
                let accountcode = await accountImp.getNextAccountCode(data.accountCategoryCoding);
                await models.Account.create({
                    accountCode: accountcode,
                    accountName: data.accountCategoryName,
                    accountDescription: data.accountCategoryDescription,
                    accountGroupId: summaryGroup[0].accountGroupId,
                    accountCategoryId: data.accountCategoryId,
                    displayOnChart: false,
                    isActive: true,
                    accountCreationDate: new Date(),
                    accountBridged: ''
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
            let oldCategory = await module.exports.getById(req.body.accountCategoryId);
            let categoryAccount = await accountImp.getByName(oldCategory.accountCategoryName);
            return models.sequelize.transaction(async (t) => {
                let updated = await AccountCategory.update(req.body, { where: { accountCategoryId: id }, transaction: t });
                if (updated) {
                    let updatedData = await AccountCategory.findOne({ where: { accountCategoryId: id } });
                    let bridge = await models.AccountBridge.findOne({
                        where: {
                            sourceTable: 'billing.accountcategory',
                            sourceFieldName: 'accountcategoryid',
                            sourceFieldValue: req.body.accountCategoryId
                        }
                    });
                    if (!bridge) {
                        bridge = await models.AccountBridge.create({
                            sourceTable: 'billing.accountcategory',
                            sourceFieldName: 'accountcategoryid',
                            sourceFieldValue: req.body.accountCategoryId
                        });
                    }
                    if (categoryAccount.length === 0) {
                        let summaryGroup = await accountGroupImp.getByName('Summary Account');
                        if (!summaryGroup) {
                            throw new Error('Failed to get Summary Group Account ID');
                        }
                        let accountcode = await accountImp.getNextAccountCode(updatedData.accountCategoryCoding);
                        await models.Account.create({
                            accountCode: accountcode,
                            accountName: updatedData.accountCategoryName,
                            accountDescription: updatedData.accountCategoryDescription,
                            accountGroupId: summaryGroup[0].accountGroupId,
                            accountCategoryId: updatedData.accountCategoryId,
                            displayOnChart: false,
                            isActive: true,
                            accountCreationDate: new Date(),
                            accountBridgeId: bridge.accountBridgeId
                        }, { transaction: t });
                    } else {
                        let id = categoryAccount[0].accountId;
                        await models.Account.update({
                            accountName: req.body.accountCategoryName,
                            accountDescription: req.body.accountCategoryDescription,
                            accountBridgeId: bridge.accountBridgeId
                        }, { where: { accountId: id }, transaction: t });
                    }
                    return updatedData;
                }
            }).then(result => {
                return res.json({ success: true, data: result });
            }).catch(err => {
                console.log(err);
                return Promise.reject(err);
            });
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await AccountCategory.findAll({
            include: [models.AccountSubType],
            order: [
                [models.AccountSubType, 'accountSubTypeId', 'ASC'],
                ['accountCategoryCoding', 'ASC']
            ]
        });
        data.forEach(row => {
            row.dataValues.accountSubTypeName = row.AccountSubType.accountSubTypeName;
        });
        return data;
    },

    getById: async function (id) {
        let data = await AccountCategory.findOne({ where: { accountCategoryId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await AccountCategory.findAll({ where: { accountCategoryName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await AccountCategory.destroy({ where: { accountCategoryId: id } });
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