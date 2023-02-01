const AccountType = require('./AccountType');
const AccountSubTypes = require('./AccountSubTypes');
const AccountCategory = require('./AccountCategory');
const AccountGroup = require('./AccountGroup');
const Account = require('./Account');
const AccountFootNotes = require('./AccountFootNotes');
const AccountsMapping = require('./AccountsMapping');
const FiscalYear = require('./FiscalYear');
const FinancialPeriod = require('./FinancialPeriod');
const TransactionType = require('./TransactionType');
const Currency = require('./Currency');
const Transaction = require('./Transaction');
const AccountBalance = require('./AccountBalance');
const BillingType = require('./BillingType');
const BillingItem = require('./BillingItem');
const Inventory = require('./Inventory');
const PackagingType = require('./PackagingType');
const ProductSupplier = require('./ProductSupplier');
const ReceivedInventory = require('./ReceivedInventory');
const Supplier = require('./Supplier');
const OrderStatus = require('./OrderStatus');
const InventoryStockIssued = require('./InventoryStockIssued');


const moment = require('moment');
const models = require('../models');

module.exports = {
    AccountType, AccountSubTypes, AccountCategory,
    AccountGroup, AccountFootNotes, AccountsMapping,
    Account, FiscalYear, FinancialPeriod, TransactionType,
    Currency, Transaction, AccountBalance, BillingItem, BillingType,
    Inventory, PackagingType, ProductSupplier,
    ReceivedInventory, Supplier, OrderStatus, InventoryStockIssued,

    addBooking: async function (req, res) {
        let data = req.body;
        try {
            data.bookingDate = moment(data.date);
            data.bookingTime = data.time;
            let result = await models.Booking.create(data);
            res.json({ success: true });
        } catch (err) {
            console.log(err);
            res.json({ success: false, error: err });
        }
    },

    updateBooking: async function (req, res) {
        let data = req.body;
        try {
            data.time = moment(data.time);
            data.bookingDate = moment(data.date);
            data.bookingDate.set('hour', data.time.get('hour'));
            data.bookingDate.set('minute', data.time.get('minute'));
            data.bookingTime = `${data.time.get('hour')}:${data.time.get('minute')}`
            let result = await models.Booking.update(data, { where: { bookingId: data.bookingId } });
            res.json({ success: true });
        } catch (err) {
            console.log(err);
            res.json({ success: false, error: err });
        }
    },

    getBooking: async function (req, res) {
        let bookingid = req.query.bookingid;
        try {
            if (!bookingid) {
                console.log('Booking ID not submitted');
                return res.json({ success: false, error: 'Booking ID not submitted in call' });
            }
            bookingid = parseInt(bookingid);
            let booking = await models.Booking.findOne({ where: { bookingId: bookingid } });
            return res.json({ success: true, data: booking });
        } catch (err) {
            console.log(err);
            res.json({ success: false, error: err });
        }
    },
    getAllBookings: async function (req, res) {
        try {
            let booking = await models.Booking.findAll({
                include: [models.Client, { model: models.ClinicalStaff, include: [{ model: models.Staff, include: [models.Department] }] }]
            });
            return res.send(booking);
        } catch (err) {
            console.log(err);
            res.json({ success: false, error: err });
        }
    },

    getClinicianBookings: async function (req, res) {
        let clinicianid = req.query.clinicianid;
        try {
            if (!clinicianid) {
                console.log('Clinician ID not submitted');
                res.json({ success: false, error: 'Clinician ID not submitted' });
            }
            let startdate = req.query.startdate;
            let enddate = req.query.enddate;
            startdate = moment(new Date(startdate));
            enddate = moment(new Date(enddate));
            clinicianid = parseInt(clinicianid);
            startdate.add(-2, 'days');
            enddate.add(7, 'days');
            let results = await models.Booking.findAll({
                where:
                {
                    clinicianId: clinicianid,
                    bookingDate: { [models.Sequelize.Op.between]: [startdate, enddate] }
                },
                order: ['bookingtime'],
                include: [models.Client, { model: models.ClinicalStaff, include: [models.Staff] }]
            });
            results.forEach(result => {
                result.bookingDate = new Date(result.bookingDate);
                result.dataValues[`${result.bookingDate.getDate()}`] = 'red';
                result.dataValues.color = 'red';
                result.dataValues.clientFullName = `${[result.Client.firstName, result.Client.lastName].join(' ')}`;
                result.dataValues.clinicianFullName = `${[result.ClinicalStaff.Staff.firstName, result.ClinicalStaff.Staff.lastName].join(' ')}`;
            });
            res.json({ success: true, data: results });
        } catch (err) {
            console.log(err);
            res.json({ success: false, error: err });
        }
    }
};