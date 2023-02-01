const accountFootNotes = require('../models').AccountFootNotes;
const models = require('../models');

module.exports = {

    create: async function (req, res) {
        try {
            let data = await accountFootNotes.create(req.body);
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
            let updated = await accountFootNotes.update(req.body, { where: { footNotesId: id } });
            if (updated) {
                let updatedData = await accountFootNotes.findOne({ where: { footNotesId: id } });
                return res.json({ success: true, data: updatedData });
            }
        } catch (err) {
            res.json({ success: false, error: err });
            console.log(err);
        }
    },

    getAll: async function () {
        let data = await accountFootNotes.findAll();
        return data;
    },

    getById: async function (id) {
        let data = await accountFootNotes.findOne({ where: { footNotesId: id } });
        if (data) {
            return data;
        }
    },

    getByName: async function (name) {
        let data = await accountFootNotes.findAll({ where: { footNotesName: name } });
        if (data) {
            return data;
        }
    },

    delete: async function (req, res) {
        try {
            let id = req.params;
            let deleted = await accountFootNotes.destroy({ where: { footNotesId: id } });
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