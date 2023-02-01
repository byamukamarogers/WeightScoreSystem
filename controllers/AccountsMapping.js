const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            req.body.fullName = undefined;
            let data = await models.AccountsMapping.create(req.body);
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
            let updated = await models.AccountsMapping.update(req.body, { where: { mappingId: id } });
            if (updated) {
                let updatedData = await models.AccountsMapping.findOne({ where: { mappingId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let sql = `SELECT accountsmappingid accountsMappingId, a.accountid controlAccountId,a.accountname ControlAccount, 
        b.accountid summaryAccountId, b.accountname SummaryAccount, footnotesname
        FROM billing.account a INNER JOIN billing.accountsmapping m
        ON a.accountid = m.controlaccountid
        INNER JOIN billing.account b ON b.accountid = m.summaryaccountid
        INNER JOIN billing.accountfootnotes f ON f.footnotesid = m.footnotesid
        ORDER BY m.controlaccountid ASC;`;
        try {
            let data = await models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT });
            for (let i = 0; i < data.length; i++) {
                data[i].summaryAccount = data[i].summaryaccount;
                data[i].controlAccount = data[i].controlaccount;
                data[i].footNotesName = data[i].footnotesname;
            };
            return data;
        } catch (err) {
            console.log(err);
            return Promise.reject(err);
        }

    },

    getById: async function (id) {
        let sql = `SELECT accountsmappingid accountsMappingId, a.accountid controlAccountId,a.accountname ControlAccount, 
        b.accountid summaryAccountId, b.accountname SummaryAccount, footnotesname
        FROM billing.account a INNER JOIN billing.accountsmapping m
        ON a.accountid = m.controlaccountid
        INNER JOIN billing.account b ON b.accountid = m.summaryaccountid
        INNER JOIN billing.accountfootnotes f ON f.footnotesid = m.footnotesid 
        WHERE accountsmappingid = ? 
        ORDER BY m.controlaccountid ASC;`;
        try {
            let data = await models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT, replacements: [`'${id}'`] });
            if (data) {
                data[0].summaryAccount = data[0].summaryaccount;
                data[0].controlAccount = data[0].controlaccount;
                data[0].footNotesName = data[0].footnotesname;
            };
            return data;
        } catch (err) {
            console.log(err);
            return Promise.reject(err);
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await models.AccountsMapping.destroy({ where: { mappingId: id } });
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