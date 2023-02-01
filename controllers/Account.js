const Account = require('../models').Account;
const models = require('../models');
const accountGroupImp = require('../controllers/AccountGroup');
const accountCategoryImp = require('../controllers/AccountCategory');
//const Sequelize = require('sequelize');
const { Op } = require("sequelize");

module.exports = {

    getNextAccountCode: async function (coding) {
        if (!coding) {
            throw new Error('You must provide an accountCategoryCoding');
        }
        let data = await models.Account.findAll({
            attributes: [models.sequelize.fn('max', models.sequelize.col('accountcode'))],
            where: { [Op.like]: [{accountCode: `${coding}%` }] },
            raw: true
        });
        
        let sql = 'select max(accountcode) from billing.account where ' +
            'accountcode like ?;';
        try {
            let newcode;
            let result = await models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT, replacements: [`'${coding}%'`] });

            if (result.length > 0) {
                if (result[0]) {
                    newcode = result[0].max ? result[0].max + 1 : 1;
                }
            } else {
                newcode = 1;
            }
            return `${coding}${newcode.toString().padStart(10 - coding.length, '0')}`;
        } catch (err) {
            console.log(err);
            return Promise.reject(err);
        }
    },

    create: async function (req, res) {
        return models.sequelize.transaction(async (t) => {
            req.body.accountCreationDate = new Date(req.body.accountCreationDate);
            req.body.accountClosureDate = undefined;
            let accCat = await models.AccountCategory.findOne({ where: { accountCategoryId: req.body.accountCategoryId } });
            let accountcode = await module.exports.getNextAccountCode(accCat.accountCategoryCoding);
            req.body.accountCode = accountcode;

            let bridge = await models.AccountBridge.findOne({
                where: {
                    sourceTable: 'billing.account',
                    sourceFieldName: 'accountid',
                    sourceFieldValue: req.body.accountId
                }
            });
            if (!bridge) {
                bridge = await models.AccountBridge.create({
                    sourceTable: 'billing.account',
                    sourceFieldName: 'accountid',
                    sourceFieldValue: req.body.accountId
                });
            }
            let data = await Account.create(req.body);
            return res.json({ success: true, data: data });
        }).then(result => {
            return result;
        }).catch(err => {
            console.log(err);
            return Promise.reject(err);
        });
    },

    createClientAccount: async function (clientid) {
        if (!clientid) {
            throw new Error('You must provide a client ID!');
        }
        let client = await models.Client.findOne({ where: { clientId: clientid } });
        if (!client) {
            throw new Error('Failed to locate client. Cannot create account');
        }
        let bridge = await models.AccountBridge.findOne({ where: { sourceTable: 'client.clients', sourceFieldName: 'clientid' } });
        return models.sequelize.transaction(async (t) => {
            if (!bridge) {
                bridge = await models.AccountBridge.create({
                    sourceTable: 'client.clients',
                    sourceFieldName: 'clientid',
                    sourceFieldValue: client.clientId
                });
            }
            let summaryGroup = await accountGroupImp.getByName('Summary Account');
            if (!summaryGroup) {
                throw new Error('Failed to get Summary Group Account ID');
            }
            let accountCategory = await accountCategoryImp.getByName('Clients');
            if (!accountCategory) {
                throw new Error('Failed to get Account Category ID');
            }
            let accountcode = await models.exports.getNextAccountCode('C');
            await models.Account.create({
                accountCode: accountcode,
                accountBridgeId: bridge.accountBridgeId,
                accountName: [client.firstName, client.lastName].join(' '),
                accountDescription: "Client Accounts",
                accountGroupId: summaryGroup[0].accountGroupId,
                accountCategoryId: accountCategory[0].accountCategoryId,
                displayOnChart: false,
                isActive: true,
                accountCreationDate: new Date()
            });
            return res.json({ success: true, data: data });

        }).then(result => {
            return result;
        }).catch(err => {
            console.log(err);
            return Promise.reject(err);
        });
    },

    updateClientAccount: async function (clientId) {
        return true;
    },

    update: async function (req, res) {
        try {
            let id = req.params.id;
            req.body.id = undefined;
            let updated = await Account.update(req.body, { where: { accountId: id } });
            if (updated) {
                let updatedData = await Account.findOne({ where: { accountId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await Account.findAll(
            {
                include: [
                    models.AccountCategory,
                    models.AccountGroup
                ],
                order: [
                    [models.AccountGroup, 'accountGroupId', 'DESC'],
                    ['accountCode', 'ASC']
                ]
            });
        data.forEach(row => {
            row.dataValues.accountGroupName = row.AccountGroup.accountGroupName;
            row.dataValues.accountCategoryName = row.AccountCategory.accountCategoryName;
        });
        return data;
    },

    getById: async function (id) {
        let data = await Account.findOne({ where: { accountId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await Account.findAll({ where: { accountName: name } });
        if (data) {
            return data;
        }
    },

    getByCode: async function (code) {
        let data = await Account.findAll({ where: { accountCode: code } });
        if (data) {
            return data;
        }
    },

    getByAccountGroupName: async function (accountgroupname) {
        //let accountgroup = await models.AccountGroup.findAll({where: {accountGroupName:accountgroupname}});
        let data = await Account.findAll({ include: [models.AccountGroup] });
        let results = [];
        if (data.length > 0) {
            data.forEach(account => {
                if (account.AccountGroup.accountGroupName === accountgroupname) {
                    results.push(account);
                }
            })
        }
        return results;
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await Account.destroy({ where: { accountId: id } });
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
            if (obj.code) {
                let result = await module.exports.getByCode(obj.code);
                return res.json({ success: true, data: result });
            }
            if (obj.accountgroupname) {
                let result = await module.exports.getByAccountGroupName(obj.accountgroupname);
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