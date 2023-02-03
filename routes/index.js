var express = require("express");
var router = express.Router();
const { logger, logError } = require('../utils/logger');

const models = require("../models");
const moment = require("moment");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const path = require("path");
const auth = require("../utils/authentication");

const multer = require("multer");
fs = require("fs-extra");
const nodemailer = require("nodemailer");

const Flutterwave = require('flutterwave-node-v3');

const flw = new Flutterwave(process.env.FLUTTERWAVE_PUBLIC, process.env.FLUTTERWAVE_SECRET);


var smtpTransport = nodemailer.createTransport({
  pool: true,
  host: "smtp.dreamhost.com",
  port: 465,
  secure: true,
  auth: {
    user: "system@kautharmedicalcentre.com",
    pass: "jX92f6s*"
  }
});

const serverConfig = {
  timeout: 3000, //timeout connecting to each server, each try
  retries: 2, //number of retries to do before failing
  domain: "https://system.kautharmedicalcentre.com", //the domain to check DNS record of
};
/** File Upload Section */
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

var upload = multer({ storage: storage });

//SEQUELIZE TRANSACTION
const config = require("../config");
const { User } = require("../models");
const sequelize = config.sequelize;

//BCRYPT
const bcrypt = require("bcrypt");
const saltRounds = 10;

/* GET home page. */
module.exports = function () {

  router.get("/", function (req, res, next) {
    //loader here.
    res.sendFile(path.join(__dirname, "../public", "index.html"));
  });
  router.get("/subject", function (req, res, next) {
    //loader here.
    res.sendFile(path.join(__dirname, "../public/Subject", "Subject.html"));
  });

  router.get("/purchaseorders", auth.authenticate, async function (req, res) {
    let obj = req.query;
    try {
      if (obj.purchaseOrderId) {
        let result = await models.PurchaseOrder.findOne({ where: { purchaseOrderId: obj.purchaseOrderId } });
        return res.json({ success: true, data: result });
      }
      let data = await models.PurchaseOrder.findAll({
        include: [models.Supplier, models.Department, models.Staff, models.OrderStatus],
        order: [
          [models.Supplier, 'supplierName', 'ASC']
        ]
      });
      data.forEach(row => {
        row.dataValues.staffName = row.dataValues.firstName + " " + row.dataValues.lastName;
        row.dataValues.departmentName = row.Department.departmentName;
        row.dataValues.supplierName = row.Supplier.supplierName;
        row.dataValues.statusName = row.OrderStatus.statusName;
      });
      return res.json({ success: true, data: data });
    } catch (err) {
      res.json({ success: false, error: err });
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/purchaseorderitems", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    try {
      if (rawdata.purchaseOrderItemId) {
        let id = req.params.id;
        req.body.id = undefined;
        let updated = await models.PurchaseOrderItem.update(req.body, { where: { purchaseOrderItemId: id } });
        if (updated) {
          let updatedData = await models.PurchaseOrderItem.findOne({ where: { purchaseOrderItemId: id } });
          return res.json({ success: true, data: updatedData });
        }
      } else {
        req.body.purchaseOrderItemId = undefined;
        let data = await models.PurchaseOrderItem.create(req.body);
        return res.json({ success: true, data: data });
      }
    } catch (err) {
      res.json({ success: false, error: err });
      console.log(err);
      logError(err, req)
    }
  });
  router.get("/purchaseorderitems", auth.authenticate, async function (req, res) {
    let obj = req.query;
    try {
      if (obj.purchaseOrderItemId) {
        let result = await models.PurchaseOrderItem.findOne({ where: { purchaseOrderItemId: obj.purchaseOrderItemId } });;
        return res.json({ success: true, data: result });
      }
      if (obj.purchaseOrderId) {
        let data = await models.PurchaseOrderItem.findAll({
          include: [models.PurchaseOrder, models.Product, models.OrderStatus],
          where: { purchaseOrderId: obj.purchaseOrderId },
          order: [[models.PurchaseOrder, 'orderDate', 'DESC']]
        });
        if (data) {
          data.forEach(row => {
            row.dataValues.productName = row.Product.productName;
            row.dataValues.statusName = row.OrderStatus.statusName;
          });
        }
        return res.json({ success: true, data: data });
      }
      let result = await models.PurchaseOrderItem.findAll({
        include: [models.PurchaseOrder, models.Product],
        order: [
          [models.PurchaseOrder, 'orderDate', 'DESC']
        ]
      });
      return res.json({ success: true, data: result });
    } catch (err) {
      res.json({ success: false, error: err });
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/receivedinventory", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.healthUnitId = req.session.passport.user.healthUnitId;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      data.unitCost = data.totalCost / data.quantityReceived;
      if (data.stockId) {//TO BE FIXED
        rawdata.updatedBy = req.session.passport.user.staffId;
        console.log("UPDATE BEGAN")
        result = models.sequelize.transaction(async (t) => {
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
                productId: req.body.productId,
                quantityAvailable: updatedData.quantityReceived,
                reOrderLevel: req.body.reOrderLevel,
                inStock: true
              }, { transaction: t });
            } else {
              await models.Inventory.update({
                productId: req.body.productId,
                stockId: stockLevel.stockId,
                originalQuantity: updatedData.quantityReceived,
                quantityAvailable: (stockLevel.quantityAvailable - receivedItem.quantityReceived) + updatedData.quantityReceived,
                reOrderLevel: req.body.reOrderLevel,
                inStock: true
              }, { where: { inventoryId: stockLevel.inventoryId } }, { transaction: t });
            }
          }
        });

      } else {
        //COMPLETED
        data.createdBy = req.session.passport.user.staffId;
        data.receivedBy = req.session.passport.user.fullName;
        result = await models.sequelize.transaction(async (t) => {
          data.stockId = undefined;
          data.userId = req.session.passport.user.staffId;
          let receivedData = await models.ReceivedInventory.create(data, { transaction: t });
          let inventory = await models.Inventory.findOne({
            where: { productId: data.productId }
          });
          let product = await models.Product.findOne({ where: { productId: data.productId } });

          await models.Expense.create({
            expenseTypeId: 1,//PURCHASE OF DRUGS
            expenseSource: '',
            amountSpent: data.totalCost,
            description: 'STOCK FOR ' + product.productName + ' :: (' + product.description + ')',
            dateSpent: data.dateReceived || new Date(),
            spentBy: req.session.passport.user.fullName,
            createdBy: data.createdBy,
            dateRecorded: new Date()
          }, { transaction: t });

          if (inventory) {
            await models.Inventory.update(
              {
                originalQuantity: inventory.quantityAvailable,
                quantityAvailable: inventory.quantityAvailable + data.quantityReceived,
                reOrderLevel: data.reOrderLevel,
                inStock: true
              },
              { where: { productId: data.productId } },
              { transaction: t }
            );
            await models.InventoryMovement.create({
              stockId: receivedData.stockId,
              productId: receivedData.productId,
              quantityAvailable: inventory.quantityAvailable + data.quantityReceived,
              openingStock: inventory.quantityAvailable,
              inStock: true,
              stockIn: data.quantityReceived,
              stockOut: 0,
              closingStock: inventory.quantityAvailable + data.quantityReceived,
              dateRecorded: new Date(),
              staffId: data.userId
            }, { transaction: t });

          } else {
            let newInventory = await models.Inventory.create({
              productId: data.productId,
              quantityAvailable: data.quantityReceived,
              reOrderLevel: data.reOrderLevel,
              inStock: true
            }, { transaction: t });
            if (newInventory) {
              await models.InventoryMovement.create({
                stockId: receivedData.stockId,
                productId: receivedData.productId,
                quantityAvailable: data.quantityReceived,
                openingStock: 0,
                inStock: true,
                stockIn: data.quantityReceived,
                stockOut: 0,
                closingStock: data.quantityReceived,
                dateRecorded: new Date(),
                staffId: data.userId
              }, { transaction: t });
            }
          }
        });
      }
      res.send({ status: "OK" });
    } catch (err) {
      res.status(400).json({ success: false, message: "Error, Try Again or Contact Support." });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/stockmovement", auth.authenticate, async function (req, res) {
    let stockId = req.query.stockId
    let data;
    try {
      if (parseInt(stockId)) {
        data = await models.InventoryMovement.findOne({
          where: { stockId: stockId },
          include: [{ model: models.Product, include: [models.ProductCategory, models.ProductType] }, models.ReceivedInventory],
          order: [['dateRecorded', 'ASC']]
        });
      } else {
        data = await models.InventoryMovement.findAll({
          include: [{ model: models.Product, include: [models.ProductCategory, models.ProductType] }, models.ReceivedInventory],
          order: [['dateRecorded', 'ASC']]
        });
      }
      return res.send(data);
    } catch (err) {
      console.log(err);
      logError(err, req)
      res.json({ success: false, error: err });
    }
  });
  router.get("/receivedinventory", auth.authenticate, async function (req, res) {
    let stockId = req.query.stockId
    let data;
    try {
      if (parseInt(stockId)) {
        data = await models.ReceivedInventory.findOne({
          where: { stockId: stockId },
          include: [{ model: models.Product, include: [models.ProductCategory, models.ProductType] }, models.Staff],
          order: [['dateReceived', 'DESC']]
        });
      } else {
        data = await models.ReceivedInventory.findAll({
          include: [{ model: models.Product, include: [models.ProductCategory, models.ProductType] }, models.Staff],
          order: [['dateReceived', 'DESC']]
        });
      }
      return res.send(data);
    } catch (err) {
      console.log(err);
      logError(err, req)
      res.json({ success: false, error: err });
    }
  });

  router.post("/stockrequests", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    let result;
    try {
      if (rawdata.requestId) { //update
        result = models.sequelize.transaction(async (t) => {
          let id = req.params.id;
          rawdata.id = undefined;
          let status = await models.OrderStatus.findOne({ where: { statusName: rawdata.requestStatus } });
          if (!status) throw new Error('Failed to get Request Status');
          rawdata.requestStatusId = status.dataValues.statusId;
          rawdata.requeststatusid = rawdata.requestStatusId;
          let requestItems = rawdata.productItems;
          rawdata.approvedBy = req.session.passport.user.staffId;
          rawdata.branchId = req.session.passport.user.branchId;
          rawdata.approvalDate = new Date();
          let updated = await models.StockRequest.update(rawdata, { where: { requestId: rawdata.requestId } }, { transaction: t });
          if (updated) {
            let updatedData = await models.StockRequest.findOne({ where: { requestId: rawdata.requestId } });
            if (requestItems == null) {
              throw new Error('Failed to get Request Items');
            }
            for (let item of requestItems) {
              if (!item.stockRequestItemId) {
                let itemStatus = await models.OrderStatus.findOne({ where: { statusName: 'Requested' } });
                if (!itemStatus) throw new Error('Failed to get Request Item Status');
                item.requestItemStatusId = itemStatus.dataValues.statusId;
                await models.StockRequestItem.create({
                  requestId: updatedData.requestId,
                  productId: item.productId,
                  requestQuantity: item.requestQuantity,
                  quantityApproved: 0,
                  quantityIssued: 0,
                  requestItemStatusId: item.requestItemStatusId
                }, { transaction: t });
              } else {
                let itemStatus = await models.OrderStatus.findOne({ where: { statusName: item.statusName } });
                if (!itemStatus) throw new Error('Failed to get Request Item Status');
                item.requestItemStatusId = itemStatus.dataValues.statusId;
                await models.StockRequestItem.update({
                  stockRequestItemId: item.stockRequestItemId,
                  requestId: item.requestId,
                  productId: item.productId,
                  requestQuantity: item.requestQuantity,
                  quantityApproved: item.quantityApproved,
                  quantityIssued: item.quantityIssued,
                  requestItemStatusId: item.requestItemStatusId
                }, { where: { stockRequestItemId: item.stockRequestItemId } }, { transaction: t });
              }
            }
          }
        });
      } else {
        result = models.sequelize.transaction(async (t) => {
          rawdata.requestedBy = req.session.passport.user.staffId;
          rawdata.branchId = req.session.passport.user.branchId;
          rawdata.departmentId = req.session.passport.user.departmentId;
          let status = await models.OrderStatus.findOne({ where: { statusName: 'Submitted' } });
          if (!status) throw new Error('Failed to get Request Status');
          rawdata.requestStatusId = status.dataValues.statusId;
          let requestItems = rawdata.productItems;
          let data = await models.StockRequest.create(rawdata, { transaction: t });
          if (requestItems == null) {
            throw new Error('Failed to get Request Items');
          }
          for (let item of requestItems) {
            let itemStatus = await models.OrderStatus.findOne({ where: { statusName: 'Requested' } });
            if (!itemStatus) throw new Error('Failed to get Request Item Status');
            item.requestItemStatusId = itemStatus.dataValues.statusId;
            await models.StockRequestItem.create({
              requestId: data.requestId,
              productId: item.productId,
              requestQuantity: item.requestQuantity,
              quantityApproved: 0,
              quantityIssued: 0,
              requestItemStatusId: item.requestItemStatusId
            }, { transaction: t });
          }
        });
      }
      return res.json({ success: true, data: result });
    } catch (err) {
      res.json({ success: false, error: err });
      console.log(err);
      logError(err, req)
    }

  });
  router.post("/issuestockrequest", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    try {
      return models.sequelize.transaction(async (t) => {
        let requestId = req.body.requestId;
        let status = await models.OrderStatus.findOne({ where: { statusName: req.body.statusName } });
        if (!status) throw new Error('Failed to get Request Status');
        req.body.requestStatusId = status.dataValues.statusId;
        req.body.requeststatusid = req.body.requestStatusId;
        let issuedItems = req.body.issuedItems;
        req.body.issuedOutBy = req.session.passport.user.staffId;
        req.body.issuedoutby = req.body.issuedOutBy;
        req.body.dateIssued = new Date();
        let updated = await models.StockRequest.update(req.body, { where: { requestId: requestId } }, { transaction: t });
        if (updated) {
          let updatedData = await models.StockRequest.findOne({ where: { requestId: requestId } });
          if (issuedItems == null) {
            throw new Error('Failed to get Issued Items');
          }
          for (let item of issuedItems) {
            if (item.stockRequestItemId) {
              let itemStatus = await models.OrderStatus.findOne({ where: { statusName: item.OrderStatus.statusName } });
              if (!itemStatus) throw new Error('Failed to get Issued Item Status');
              item.requestItemStatusId = itemStatus.dataValues.statusId;
              await models.StockRequestItem.update({
                requestId: item.requestId,
                productId: item.productId,
                requestQuantity: item.requestQuantity,
                quantityApproved: item.quantityApproved,
                quantityIssued: item.quantityIssued,
                requestItemStatusId: item.requestItemStatusId
              }, { where: { stockRequestItemId: item.stockRequestItemId } }, { transaction: t });

              await models.InventoryStockIssued.create({
                stockIssuedId: undefined,
                productId: item.productId,
                quantityIssued: item.quantityIssued,
                stockRequestItemId: item.stockRequestItemId,
                batchNumber: item.batchNumber
              }, { transaction: t });

              if (item.inventoryId) {
                item.quantityAvailable -= item.quantityIssued;
                item.inStock = (item.quantityAvailable == 0) ? false : true;
                await models.Inventory.update({
                  inventoryId: item.inventoryId,
                  quantityAvailable: item.quantityAvailable,
                  inStock: item.inStock
                }, { where: { inventoryId: item.inventoryId } }, { transaction: t });
              }
            }
          }
          return res.json({ success: true, data: updatedData });
        }
      }).then(result => {
        return result;
      });
    } catch (err) {
      res.json({ success: false, error: err });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/stockrequests", auth.authenticate, async function (req, res) {
    let obj = req.query;
    let result;
    try {
      if (!isNaN(obj.id)) {
        result = await models.StockRequest.findOne({ where: { requestId: obj.id } });
        return res.json({ success: true, data: result });
      }
      if (obj.departmentId) {
        let data = await models.StockRequest.findAll({
          include: [models.Department, models.Staff, models.OrderStatus],
          where: { departmentId: obj.departmentId },
          order: [
            ['requestDate', 'ASC']
          ]
        });
        data.forEach(row => {
          row.dataValues.staffName = row.dataValues.firstName + " " + row.dataValues.lastName;
          row.dataValues.departmentName = row.Department.departmentName;
          row.dataValues.statusName = row.OrderStatus.statusName;
        });;
        return res.json({ success: true, data: data });
      }
      if (obj.userId) {
        let userId = req.session.passport.user.staffId;
        let data = await models.StockRequest.findAll({
          include: [models.Department, models.Staff, models.OrderStatus],
          where: { requestedBy: obj.userId },
          order: [
            ['requestDate', 'ASC']
          ]
        });
        data.forEach(row => {
          row.dataValues.staffName = row.dataValues.firstName + " " + row.dataValues.lastName;
          row.dataValues.departmentName = row.Department.departmentName;
          row.dataValues.statusName = row.OrderStatus.statusName;
        });
        return res.json({ success: true, data: data });
      }
      let data = await models.StockRequest.findAll({
        include: [
          models.Department, models.Staff, models.OrderStatus,
          { model: models.StockRequestItem, include: [models.ReceivedPharmacyStock] }],
        order: [
          ['requestid', 'ASC']
        ]
      });

      for (let i = 0; i < data.length; i++) {
        //Inventory Check 
        for (let j = 0; j < data[i].dataValues.StockRequestItems.length; j++) {
          if (data[i].dataValues.StockRequestItems[j].dataValues) {
            let prodId = data[i].dataValues.StockRequestItems[j].dataValues.productId;
            let inv = await models.Inventory.findOne({ where: { productId: prodId } });
            if (inv) {
              if (inv.inStock) {
                data[i].dataValues.StockRequestItems[j].dataValues.stockAvailabe = true
              } else {
                data[i].dataValues.StockRequestItems[j].dataValues.stockAvailabe = false
              }
            } else {
              data[i].dataValues.StockRequestItems[j].dataValues.stockAvailabe = false
            }
          }
        }
      }
      data.forEach(row => {
        row.dataValues.staffName = row.dataValues.firstName + " " + row.dataValues.lastName;
        row.dataValues.departmentName = row.Department.departmentName;
        row.dataValues.statusName = row.OrderStatus.statusName;
      });
      return res.json({ success: true, data: data });
    } catch (err) {
      res.json({ success: false, error: err });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/userstockrequests", auth.authenticate, async function (req, res) {
    try {
      let userId = req.session.passport.user.staffId;
      let data = await models.StockRequest.findAll({
        include: [models.Department, models.Staff, models.OrderStatus],
        where: { requestedBy: userId },
        order: [
          ['requestDate', 'ASC']
        ]
      });
      data.forEach(row => {
        row.dataValues.staffName = row.dataValues.firstName + " " + row.dataValues.lastName;
        row.dataValues.departmentName = row.Department.departmentName;
        row.dataValues.statusName = row.OrderStatus.statusName;
      });
      return res.json({ success: true, data: data });
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/stockrequestitems", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    try {
      if (rawdata.stockRequestItemId) {
        let id = rawdata.stockRequestItemId;
        let updated = await models.StockRequestItem.update(req.body, { where: { stockRequestItemId: id } });
        if (updated) {
          let updatedData = await models.StockRequestItem.findOne({ where: { stockRequestItemId: id } });
          return res.json({ success: true, data: updatedData });
        }
      } else {
        let data = await models.StockRequestItem.create(req.body);
        return res.json({ success: true, data: data });
      }
    } catch (err) {
      res.json({ success: false, error: err });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/stockrequestitems", auth.authenticate, async function (req, res) {
    let obj = req.query;
    try {
      if (obj.id) {
        let result = await models.StockRequestItem.findOne({ where: { stockRequestItemId: obj.id } });
        return res.json({ success: true, data: result });
      }
      if (obj.requestId) {
        let data = await models.StockRequestItem.findAll({
          include: [models.StockRequest, models.Product, models.OrderStatus, models.ReceivedPharmacyStock],
          where: { requestId: obj.requestId },
          order: [[models.StockRequest, 'requestDate', 'DESC']]
        });

        if (data) {
          for (let i = 0; i < data.length; i++) {
            data[i].dataValues.productName = data[i].dataValues.Product.productName;
            data[i].dataValues.statusName = data[i].dataValues.OrderStatus.statusName
            let Inventory = await models.Inventory.findOne({ where: { productId: data[i].productId } });
            data[i].dataValues.Inventory = {};
            if (Inventory) {
              data[i].dataValues.Inventory = Inventory.dataValues;
            }
          }
        };
        return res.json({ success: true, data: data });
      }
      let result = await models.StockRequestItem.findAll({
        include: [{ model: models.StockRequest, include: [models.Staff, models.Department] }, models.Product, models.OrderStatus],
        order: [
          [models.StockRequest, 'requestId', 'ASC']
        ]
      });
      return res.json({ success: true, data: result });
    } catch (err) {
      res.json({ success: false, error: err });
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/suppliers", auth.authenticate, controllers.Supplier.create);
  router.put("/suppliers/:id", auth.authenticate, controllers.Supplier.update);
  router.get("/suppliers", auth.authenticate, controllers.Supplier.default);
  router.delete("/suppliers/:id", auth.authenticate, controllers.Supplier.delete);

  router.post("/orderstatuses", auth.authenticate, controllers.OrderStatus.create);
  router.put("/orderstatuses/:id", auth.authenticate, controllers.OrderStatus.update);
  router.get("/orderstatuses", auth.authenticate, controllers.OrderStatus.default);
  router.delete("/orderstatuses/:id", auth.authenticate, controllers.OrderStatus.delete);

  //---------END OF INVENTORY ROUTES---------------------

  router.get("/clinicianbookings", controllers.getClinicianBookings);
  router.put("/booking", auth.authenticate, controllers.updateBooking);
  router.post("/booking", auth.authenticate, controllers.addBooking);

  router.get("/appointments", auth.authenticate, async function (req, res) {
    let clinicianId = req.query.clinicianId
    try {
      let data;
      if (parseInt(clinicianId)) {
        data = await models.Booking.findAll({
          where: { clinicianId: clinicianId },
          order: [['bookingdate', 'ASC'], ['bookingtime', 'ASC']],
          include: [models.Client, { model: models.ClinicalStaff, include: [{ model: models.Staff, include: [models.Department] }] }]
        });
      } else {
        data = await models.Booking.findAll({
          order: [['bookingdate', 'ASC'], ['bookingtime', 'ASC']],
          include: [models.Client, { model: models.ClinicalStaff, include: [{ model: models.Staff, include: [models.Department] }] }]
        });

      }
      return res.send(data);
    } catch (err) {
      console.log(err);
      logError(err, req)
      res.json({ success: false, error: err });
    }
  });

  router.post("/appointments", auth.authenticate, async function (req, res) {
    let data = req.body;
    try {
      data.healthUnitId = req.session.passport.user.healthUnitId;
      data.clinicianId = data.staffId;
      let client = await models.Client.findOne({ where: { clientId: data.clientId } });
      let clientFullName = client.dataValues.firstName + " " + client.dataValues.lastName + " " + client.dataValues.otherName;
      let staff = await models.Staff.findOne({ where: { staffId: data.staffId } });
      let staffFullName = staff.dataValues.firstName + " " + staff.dataValues.lastName;
      data.startTime = moment(data.bookingDate).format('L').toString() + " " + moment(data.bookingTime).format('LT').toString();
      data.endTime = moment(data.startTime).add(data.appointmentDuration, 'h');

      function getIcalObjectInstance(starttime, endtime, summary, description, location, url, name, email) {
        const cal = ical({ domain: "kautharmedicalcentre.com", name: 'APPOINTMENTS CALENDAR' });
        //cal.domain("mytestwebsite.com");
        let alarmtime = moment(starttime).subtract(10, 'm');
        cal.createEvent({
          start: new Date(starttime),
          end: new Date(endtime),
          summary: summary,
          description: description,
          location: location,
          url: url,
          organizer: {
            name: name,
            email: email
          },
          alarms: [
            {
              type: 'display',
              trigger: alarmtime,
              repeat: 2,
              interval: 5
            }
          ]
        });
        return cal;
      }

      async function sendemail(sendto, subject, htmlbody, calendarObj = null) {
        mailOptions = {
          from: "system@kautharmedicalcentre.com",
          to: sendto,
          subject: subject,
          html: htmlbody
        }
        if (calendarObj) {
          let alternatives = {
            "Content-Type": "text/calendar",
            "method": "REQUEST",
            "content": new Buffer(calendarObj.toString()),
            "component": "VEVENT",
            "Content-Class": "urn:content-classes:calendarmessage"
          }
          mailOptions['alternatives'] = alternatives;
          mailOptions['alternatives']['contentType'] = 'text/calendar'
          mailOptions['alternatives']['content'] = new Buffer(calendarObj.toString())
        }
        smtpTransport.sendMail(mailOptions, function (error, response) {
          if (error) {
            console.log(error);
            logError(error, req)
          } else {
            console.log("Message sent: ", response);
          }
        })
      }
      var emailObj = getIcalObjectInstance(moment(data.startTime), moment(data.endTime), "Doctor's Appointment", data.notes, "location", "https://twixconsult.ug", staffFullName, staff.email);
      sendemail([client.email, staff.email], "Doctor's Appointment", "<h1>Doctor's Appointment</h1>", emailObj);

      data.bookingTime = moment(data.bookingTime).format('LT');
      data.bookingDate = moment(data.bookingDate).format('L');
      if (data.bookingId) {
        data.updatedBy = req.session.passport.user.staffId;
        data.dateUpdated = new Date();
        let result = await models.Booking.update(data, { where: { bookingId: data.bookingId } });
        res.json({ success: true });
      } else {
        data.createdBy = req.session.passport.user.staffId;
        data.createdDate = new Date();
        data.endTime = moment(data.endTime).format('LT');
        let result = await models.Booking.create(data);
        res.json({ success: true });
      }
    } catch (err) {
      res.status(400).json({ success: false, message: "Error, Try Again or Contact Support." });
      console.log(err);
      logError(err, req);
    }
  });

  router.get("/admissiontypes", auth.authenticate, async function (req, res) {
    try {
      let admissiontypes = await models.AdmissionType.findAll();
      res.send(admissiontypes);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/countries", auth.authenticate, async function (req, res) {
    try {
      let countries = await models.Country.findAll();
      res.send(countries);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/districts", auth.authenticate, async function (req, res) {
    try {
      let districts = await models.District.findAll();
      res.send(districts);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/subcounty", auth.authenticate, async function (req, res) {
    try {
      let id = req.query.id;
      if (id) {
        let data = await models.Subcounty.findAll({ where: { districtid: id } });
        res.send(data);
      }
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/cliniciantypes", auth.authenticate, async function (req, res) {
    try {
      let cliniciantypes = await models.ClinicianType.findAll();
      res.send(cliniciantypes);
    } catch (error) {
      logError(error, req);
    }
  });

  router.get("/stafftypes", auth.authenticate, async function (req, res) {
    try {
      let stafftypes = await models.StaffType.findAll();
      res.send(stafftypes);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/departments", auth.authenticate, async function (req, res) {
    try {
      let departments = await models.Department.findAll({
        include: [models.Branch],
      });
      res.send(departments);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/billers", auth.authenticate, async function (req, res) {
    try {
      let billers = await models.Biller.findAll();
      res.send(billers);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/billertypes", auth.authenticate, async function (req, res) {
    try {
      let billertypes = await models.BillerType.findAll();
      res.send(billertypes);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/staff", auth.authenticate, async function (req, res) {
    let staffid = req.query.staffid;
    let data;
    try {
      if (staffid) {
        if (isNaN(staffid)) {
          return res.status(500).send("Staff ID must be a number");
        }
        staffid = parseInt(staffid);
        data = await models.Staff.findAll({
          where: { staffid: staffid },
          include: [models.Department, models.StaffType],
        });
      } else {
        data = await models.Staff.findAll({
          include: [models.Department, models.StaffType]
        });
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  //Modified to join Users to Staff
  router.get("/users", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let data;
    try {
      if (!isNaN(id)) {
        data = await models.User.findAll({
          include: [
            {
              model: models.Staff,
              where: { healthUnitId: id },
              include: [models.StaffType]
            }
          ]
        });
      } else {
        data = await models.User.findAll({ include: [models.Staff] });
      }
      let results = [];
      data.forEach((dataitem) => {
        dataitem.dataValues.staffFullName =
          dataitem.Staff.firstName + ", " + dataitem.Staff.lastName;
        dataitem.dataValues.lastName = dataitem.Staff.lastName;
        dataitem.dataValues.firstName = dataitem.Staff.firstName;
        dataitem.dataValues.email = dataitem.Staff.email;
        dataitem.dataValues.departmentId = dataitem.Staff.departmentId;
        dataitem.dataValues.phone1 = dataitem.Staff.phone1;
        dataitem.dataValues.userId = dataitem.userId;
        dataitem.dataValues.healthUnitId = dataitem.Staff.healthUnitId;
        dataitem.dataValues.password = ''
        //results.push({ ...dataitem.get({ flat: true }) });
      });
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/usersearch", auth.authenticate, async function (req, res) {
    let searchText = req.query.searchText;
    let val = req.query.val;
    let data;
    try {

      if (searchText) {
        data = await models.User.findAll({
          include: [
            {
              model: models.Staff,
              where: {
                [Op.or]: [
                  { firstName: { [Op.iLike]: val + "%" } },
                  { lastName: { [Op.iLike]: val + "%" } }
                ]
              }
            }
          ]
        });
      } else {
        data = await models.User.findAll({
          include: [{ model: models.Staff }]
        });
      }
      data.forEach((user) => {
        user.dataValues.firstName = user.dataValues.Staff.firstName;
        user.dataValues.lastName = user.dataValues.Staff.lastName;
        user.dataValues.staffId = user.dataValues.Staff.staffId;
        user.dataValues.password = null;
      });
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/userroles", auth.authenticate, async function (req, res) {
    try {
      let userroles = await models.UserRole.findAll();
      res.send(userroles);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/userpermissions", auth.authenticate, async function (req, res) {
    let data = req.body;
    let records = data.permissions;
    let result;
    try {
      result = await sequelize.transaction(async (t) => {
        records.forEach(async (record) => {
          if (record.userPermissionId) {
            await models.UserPermission.update(
              {
                //userPermissionId: ,
                staffId: data.staffId,
                roleId: record.roleId,
                readOnly: record.readOnly,
                write: record.write,
                edit: record.edit,
                updateDate: new Date(),
                updatedBy: req.session.passport.user.userId,
              },
              {
                where: {
                  staffId: data.staffId,
                  userPermissionId: record.userPermissionId,
                },
              },
              { transaction: t }
            );
          } else {
            await models.UserPermission.create(
              {
                //userPermissionId: ,
                staffId: data.staffId,
                roleId: record.roleId,
                readOnly: record.readOnly,
                write: record.write,
                edit: record.edit,
                createdDate: data.createdDate,
                createdBy: req.session.passport.user.userId,
              },
              { transaction: t }
            );
          }
        });
        let newUser = await models.User.findOne({
          where: { userId: data.email },
        });
        if (newUser) {
          if (data.password) {
            data.password = await bcrypt.hash(
              data.password,
              await bcrypt.genSalt(saltRounds)
            );
          }
          await models.User.update(
            {
              staffId: data.staffId,
              userId: data.email,
              password: data.password,
              isActive: data.isActive,
            },
            { where: { userId: data.email } },
            { transaction: t }
          );
        } else {
          data.password = await bcrypt.hash(data.password, await bcrypt.genSalt(saltRounds));
          await models.User.create(
            {
              staffId: data.staffId,
              userId: data.email,
              password: data.password,
              isActive: data.isActive,
              createdDate: data.createdDate,
              createdBy: req.session.passport.user.userId,
            },
            { transaction: t }
          );
        }
      });
      res.send({ success: true, status: "OK", data: result });
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
      logError(err, req)
    }
  });

  /*
   * Used to load up permissions. If they are missing for a user, add all permission types with defaults
   */
  router.get("/userpermissions", auth.authenticate, async function (req, res) {
    try {
      if (req.query.staffid) {
        let currentuser = await models.User.findOne({
          where: { userId: req.session.passport.user.userId },
        });
        if (!currentuser) return res.send([]);
        let staffid = parseInt(req.query.staffid);
        let userpermissions = await models.UserPermission.findAll({
          where: { staffId: staffid },
          include: [models.UserRole],
        });
        if (userpermissions.length === 0) {
          let user = await models.User.findOne({ where: { staffId: staffid } });
          let userroles = await models.UserRole.findAll();
          if (user) {
            userroles.forEach(async (role) => {
              let userpermission = await models.UserPermission.create({
                staffId: staffid,
                roleId: role.roleId,
                roleName: role.roleName,
                readOnly: false,
                write: false,
                edit: false,
                createdDate: new Date(),
                createdBy: currentuser.staffId,
              });
              userpermissions.push(userpermission);
            });
          } else {
            userpermissions = userroles;
          }
        } else {
          userpermissions = userpermissions.map((item) => {
            item.dataValues.roleName = item.Role.roleName;
            return item;
          });
        }
        if (req.query.staffid === undefined) {
          console.log("undefined");
        }
        res.send(userpermissions);
      }
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/clinicians", auth.authenticate, async function (req, res) {
    let userid = req.session.passport.user.userId;
    let departmentid = req.query.departmentid;
    let data;
    try {
      if (isNaN(departmentid)) {
        data = await models.ClinicalStaff.findAll({
          include: [
            { model: models.Staff, include: [models.Department] },
            models.ClinicianType,
          ],
        });
      } else {
        departmentid = parseInt(departmentid);
        data = await models.ClinicalStaff.findAll({
          include: [
            { model: models.Staff, where: { departmentId: departmentid } },
          ],
        });
      }
      data.forEach((dataitem) => {
        dataitem.dataValues.firstName = dataitem.Staff.firstName;
        dataitem.dataValues.lastName = dataitem.Staff.lastName;
        dataitem.dataValues.staffFullName =
          dataitem.Staff.firstName + ", " + dataitem.Staff.lastName;
        dataitem.dataValues.clinicianFullName =
          dataitem.Staff.firstName + " " + dataitem.Staff.lastName;
      });
      res.send(data);
    } catch (err) {
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/staffmember", async function (req, res) {
    let rawdata = req.body;
    rawdata.healthUnitId = req.session.passport.user.healthUnitId;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }

      let result;
      if (rawdata.staffId) {
        data.updatedBy = req.session.passport.user.staffId;
        result = await models.Staff.update(data, {
          where: { staffId: data.staffId }
        });
      } else {
        data.createdBy = req.session.passport.user.staffId;
        result = await models.Staff.create(data);
        data.staffId = result.staffId;
      }
      let stafftype = await models.StaffType.findOne({
        where: { staffTypeName: "CLINICIAN" },
      });
      if (stafftype) {
        if (data.staffTypeId === stafftype.staffTypeId) {
          let clinicalstaff = await models.ClinicalStaff.findOne({
            where: { staffId: data.staffId },
          });
          if (!clinicalstaff) {
            await models.ClinicalStaff.create({
              staffId: data.staffId,
              clinicianTypeId: data.clinicianTypeId,
            });
          }
        }
      }
      res.status(200).json({
        success: true,
        status: "OK",
        data: result,
        message: "DATA SAVED SUCCESSFULLY."
      });
    } catch (err) {
      res.status(400).json({ success: false, message: "Error, Try Again or Contact Support." });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/productcategory", auth.authenticate, async function (req, res) {
    let data;
    try {
      data = await models.ProductCategory.findAll();
      res.send(data);
    } catch (err) {
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/productcategory", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.healthUnitId = req.session.passport.user.healthUnitId;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      if (data.productCategoryId) {
        result = await models.ProductCategory.update(data, {
          where: { productCategoryId: data.productCategoryId }
        });
      } else {
        result = await models.ProductCategory.create(data);
      }
      res.send({ status: "OK" });

    } catch (err) {
      res.status(400).json({
        success: false,
        message: "Error, Try Again or Contact Support."
      });
      console.log(err);
      logger.err(err);
    }
  });

  router.get("/staffmember", auth.authenticate, async function (req, res) {
    let staffid = req.query.staffid;
    try {
      if (!staffid) {
        return res.status(400).send("Please supply a staff id");
      }
      staffid = parseInt(staffid);
      let staffMember = await models.Staff.findOne({
        where: { staffId: staffid },
      });
      res.send(staffMember);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/taxrecords", auth.authenticate, async function (req, res) {
    try {
      let result = await models.Tax.findAll();
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/taxrecords", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      if (rawdata.taxId) {
        data.updatedBy = req.session.passport.user.staffId;
        data.dateUpdated = new Date();
        result = await models.Tax.update(data, {
          where: { taxId: data.taxId },
        });
      } else {
        data.createdBy = req.session.passport.user.staffId;
        result = await models.Tax.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: "Error, Try Again or Contact Support." });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/clientrelationshiptypes", auth.authenticate, async function (req, res) {
    try {
      let clientrelationshiptypes = await models.ClientRelationshipType.findAll();
      res.send(clientrelationshiptypes);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/client", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    let data = {};
    let photo = req.file;
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      function imageToDataURL(imagePath) {
        // read the binary data of the image
        const imageData = fs.readFileSync(imagePath);

        // convert the image data to a base64 string
        const imageBase64 = imageData.toString('base64');

        // get the MIME type of the image
        const mimeType = imagePath.match(/\.([^.]+)$/)[1];

        // return the data URL
        return `data:image/${mimeType};base64,${imageBase64}`;
      }
      if (photo) {
        const dataURL = imageToDataURL(photo.path);
        data.profilePhoto = dataURL
      }

      let dob = data.dob ? new Date(data.dob) : null;
      let age = data.age ? parseInt(data.age) : null;
      let agetype = data.ageType ? data.ageType : null;
      data.birthDateEstimated = false;

      if (dob === null && age !== null) {
        dob = moment().subtract(age, agetype.toLowerCase());
        data.birthDateEstimated = true;
      }
      data.dob = dob;
      let result;
      if (rawdata.clientId) {
        data.branchId = data.branchId || req.session.passport.user.branchId
        data.updatedBy = req.session.passport.user.staffId;
        result = await models.Client.update(data, {
          where: { clientId: data.clientId }
        });
      } else {
        data.branchId = data.branchId || req.session.passport.user.branchId
        data.createdBy = req.session.passport.user.staffId;
        result = await models.Client.create(data);
      }
      res.status(200).json({ success: true, status: "OK", data: result, message: "DATA SAVED SUCCESSFULLY." });
    } catch (err) {
      res.status(400).json({ success: false, message: "Error, Try Again or Contact Support." });
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/setbranch", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (data.branchId) {
        req.session.passport.user.branchId = data.branchId;
        req.session.passport.user.Branch = await models.Branch.findOne({ where: { branchId: data.branchId } });
      }
      res.send({ status: "OK" });
    } catch (err) {
      res.status(400).json({ success: false, message: "Error, Try Again or Contact Support." });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/client", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let data;
    try {
      let accounttype = req.query.accountType;
      if (accounttype) {
        let result = await models.Client.findOne({
          where: { accountType: accounttype, branchId: req.session.passport.user.branchId }
        })
        res.send(result);
        return;
      }
      if (id) {
        if (isNaN(id)) {
          return res.status(500).send("Client ID must be a number");
        }
        id = parseInt(id);
        data = await models.Client.findOne({
          where: { clientid: id },
          include: [models.District, models.Subcounty]
        });
      } else {
        data = await models.Client.findAll();
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.delete("/clientrelations", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    try {
      rawdata.createdBy = req.session.passport.user.staffId;
      let data;
      if (id) {
        if (isNaN(id)) {
          return res.status(500).send("Client ID must be a number");
        }
        id = parseInt(id);
        data = await models.NextOfkin.destroy({
          where: { relationId: id },
        });
      }
      res.send({ status: "OK", data: data });
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/clientrelations", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let data;
    try {
      if (id) {
        if (isNaN(id)) {
          return res.status(500).send("Client ID must be a number");
        }
        id = parseInt(id);
        data = await models.NextOfkin.findAll({ where: { clientId: id } });
      } else {
        data = await models.NextOfkin.findAll();
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/testroute", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: "Error, Try Again or Contact Support." });
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/clientrelations", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      if (rawdata.relationId) {
        result = await models.NextOfkin.update(data, {
          where: { relationId: data.relationId },
        });
      } else {
        result = await models.NextOfkin.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: "Error, Try Again or Contact Support." });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/clients", auth.authenticate, async function (req, res) {
    try {
      let data = await models.Client.findAll({
        include: [models.NextOfkin, models.Allergy, models.Country]
      });
      data.forEach((dataitem) => {
        dataitem.dataValues.clientFullName = dataitem.dataValues.firstName + ' ' + dataitem.dataValues.lastName;
        dataitem.dataValues.clientId = dataitem.dataValues.clientId;
      });
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/clientsearch", auth.authenticate, async function (req, res) {
    let searchtype = req.query.searchtype;
    let val = req.query.val;
    let data;
    try {
      switch (searchtype) {
        case "id":
          data = await models.Client.findOne({
            where: { clientid: val },
            include: [models.NextOfkin, models.Allergy, models.Country]
          });
          break;
        case "name":
          data = await models.Client.findAll({
            where: {
              [Op.or]: [
                { firstname: { [Op.iLike]: val + "%" } },
                { lastname: { [Op.iLike]: val + "%" } },
              ],
            },
            include: [models.NextOfkin, models.Allergy, models.Country]
          });
          break;
        case "nationalid":
          data = await models.Client.findAll({ where: { nationalidno: val } });
          break;
        case "phoneno":
          data = await models.Client.findAll({
            where: {
              [Op.or]: [
                { phone1: { [Op.iLike]: val + "%" } },
                { phone2: { [Op.iLike]: val + "%" } },
              ],
            },
          });
          break;
        case "membershipno":
          data = await models.Client.findAll({ where: { membershipno: val } });
          break;
        default:
          return res.status(500).send("Invalid search parameters");
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/clientvisit", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let data;
    try {
      if (!isNaN(id)) {
        if (isNaN(id)) {
          return res.status(500).send("Client ID must be a number");
        }
        id = parseInt(id);
        data = await models.Visit.findAll({
          where: { clientid: id },
          include: [
            models.Client,
            models.ClientBill,
            models.Department,
            models.Branch,
            { model: models.ClinicalStaff, include: [models.Staff] },
            models.VisitReason,
          ],
          order: [["visitId", "DESC"]],
        });
        data.forEach((dataitem) => {
          dataitem.dataValues.clientFullName = dataitem.Client.firstName + ", " + dataitem.Client.lastName;
          dataitem.Staff == null ? (dataitem.dataValues.clinicianFullName = " ") : (dataitem.dataValues.clinicianFullName = dataitem.Staff.firstName + ", " + dataitem.Staff.lastName);
          dataitem.dataValues.department = dataitem.Department.departmentName;
        });
      } else {
        data = await models.Visit.findAll({
          include: [
            models.Client,
            { model: models.ClinicalStaff, include: [models.Staff] },
            models.Department,
            models.Branch,
          ],
        });

        data.forEach((dataitem) => {
          dataitem.dataValues.clientFullName = dataitem.Client.firstName + ", " + dataitem.Client.lastName;
          dataitem.Staff == null
            ? (dataitem.dataValues.clinicianFullName = " ")
            : (dataitem.dataValues.clinicianFullName = dataitem.Staff.firstName + ", " + dataitem.Staff.lastName);
          dataitem.dataValues.department = dataitem.Department.departmentName;
        });
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/clientvisit", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    rawdata.healthUnitId = req.session.passport.user.healthUnitId;
    rawdata.branchId = req.session.passport.user.branchId;
    let data = {};
    let result;
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      console.log(data)
      if (data.visitReasonId === 1) {
        //Follow up visit
        result = await sequelize.transaction(async (t) => {
          let visit = await models.Visit.create(data, { transaction: t });
          await models.ClientBill.create(
            {
              clientId: data.clientId,
              visitId: visit.visitId,
              isCleared: false,
            },
            { transaction: t }
          );
        });
      } else if (rawdata.visitReasonId === 2) {
        //Consultation Visit
        //Consultation fee
        result = await sequelize.transaction(async (t) => {
          let visit = await models.Visit.create(data, { transaction: t });
          let bill = await models.ClientBill.create(
            {
              clientId: data.clientId,
              visitId: visit.visitId,
              isCleared: false,
            },
            { transaction: t }
          );
          let billItem = await models.ClientBillItem.create(
            {
              billId: bill.billId,
              quantity: 1,
              amount: rawdata.consultationFee,
              billItemName: "Consultation Fee",
              billNote: "Consultation",
              createdBy: rawdata.createdBy,
            },
            { transaction: t }
          );
          t.afterCommit(async () => {
            await models.Visit.update(
              { billItemId: billItem.billItemId },
              { where: { visitId: visit.visitId } }
            );
          });
        });
      } else if (rawdata.visitReasonId === 3) {
        //Direct Lab Test
        result = await sequelize.transaction(async (t) => {
          let visit = await models.Visit.create(data, { transaction: t });
          let bill = await models.ClientBill.create(
            {
              clientId: data.clientId,
              visitId: visit.visitId,
              isCleared: false,
            },
            { transaction: t }
          );
          for (let i = 0; i < rawdata.selectedLabTests.length; i++) {
            rawdata.selectedLabTests[i].billId = bill.billId;
            rawdata.selectedLabTests[i].clientId = data.clientId;
            rawdata.selectedLabTests[i].visitId = visit.visitId;
            await models.ClientBillItem.create(
              {
                billId: bill.billId,
                quantity: 1,
                amount: rawdata.selectedLabTests[i].price,
                billItemName: rawdata.selectedLabTests[i].testName,
                billNote: "Lab Test",
                createdBy: rawdata.createdBy,
              },
              { transaction: t }
            );
            await models.LabTestOrder.create(rawdata.selectedLabTests[i], { transaction: t });
          }
        });
      } else if (rawdata.visitReasonId === 4) {
        //Radiology And Or Imaging Test
        result = await sequelize.transaction(async (t) => {
          let visit = await models.Visit.create(data, { transaction: t });
          let bill = await models.ClientBill.create(
            {
              clientId: data.clientId,
              visitId: visit.visitId,
              isCleared: false,
            },
            { transaction: t }
          );
          for (let i = 0; i < rawdata.selectedRadiologyTests.length; i++) {
            rawdata.selectedRadiologyTests[i].billId = bill.billId;
            rawdata.selectedRadiologyTests[i].clientId = data.clientId;
            rawdata.selectedRadiologyTests[i].visitId = visit.visitId;
            await models.ClientBillItem.create(
              {
                billId: bill.billId,
                quantity: 1,
                amount: rawdata.selectedRadiologyTests[i].price,
                billItemName: rawdata.selectedRadiologyTests[i].testName,
                billNote: "Radiology & Imaging Test",
                createdBy: rawdata.createdBy,
              },
              { transaction: t }
            );
            await models.RadiologyTestOrder.create(rawdata.selectedRadiologyTests[i], { transaction: t });
          }
        });
      } else {
        //UNLESS OTHERWISE
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: "Error, Try Again or Contact Support."
      });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/healthunitcategory", auth.authenticate, async function (req, res) {
    let searchText = req.query.searchText;
    let data;
    try {
      if (searchText !== "undefined") {
        data = await models.HealthUnitCategory.findAll({
          where: {
            [Op.or]: [
              {
                categoryName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
            ],
          },
        });
      } else {
        data = await models.HealthUnitCategory.findAll();
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/healthunitcategory", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    let result;
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.healthUnitCategoryId) {
        result = await models.HealthUnitCategory.update(data, {
          where: { healthUnitCategoryId: data.healthUnitCategoryId },
        });
      } else {
        result = await models.HealthUnitCategory.create(data);
      }
      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/healthunittypes", auth.authenticate, async function (req, res) {
    let searchText = req.query.searchText;
    let data;
    try {
      if (searchText !== "undefined") {
        data = await models.HealthUnitType.findAll({
          where: {
            [Op.or]: [
              {
                typeName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
            ],
          },
        });
      } else {
        data = await models.HealthUnitType.findAll();
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });
  router.post("/healthunittype", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      if (rawdata.healthUnitTypeId) {
        result = await models.HealthUnitType.update(data, {
          where: { healthUnitTypeId: data.healthUnitTypeId },
        });
      } else {
        result = await models.HealthUnitType.create(data);
      }
      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/healthunits", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let searchText = req.query.searchText;
    let data;
    try {
      if (id) {
        data = await models.HealthUnit.findOne({
          where: { healthUnitId: id },
        });
      }
      if (searchText !== "undefined") {
        data = await models.HealthUnit.findAll({
          where: {
            [Op.or]: [
              {
                healthUnitName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                shortName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                locationAddress: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                contactNumber2: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                contactNumber1: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                email: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
            ],
          },
          include: [
            models.HealthUnitCategory,
            models.HealthUnitType,
            models.Country,
          ],
        });
      } else {
        data = await models.HealthUnit.findAll({
          include: [
            models.HealthUnitCategory,
            models.HealthUnitType,
            models.Country,
          ],
        });
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });


  router.post("/clientvitals", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    rawdata.healthUnitId = req.session.passport.user.healthUnitId;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      console.log(rawdata);
      //data.id = undefined;
      let result = {}; //await models.ClientVitals.create(data);
      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).json({
        success: false,
        message: "Error, Try Again or Contact Support."
      });
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/clientvitals", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let data;
    try {
      if (id) {
        data = await models.ClientVitals.findOne({ where: { visitId: id } });
        res.send(data);
      }
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/clinicianqueue", auth.authenticate, async function (req, res) {
    let id = req.session.passport.user.staffId;
    let data;
    try {
      if (id) {
        if (isNaN(id)) { return res.status(500).send("Clinician ID must be a number"); }
        id = parseInt(id);
        data = await models.Visit.findAll({
          where: { [Op.and]: [{ clinicianId: id }, { isActive: true }] },
          include: [
            models.Client,
            models.Department,
            models.ClientBillItem,
            models.Branch,
            { model: models.ClinicalStaff, include: [models.Staff] }
          ],
          order: [["visitDate", "DESC"]]
        });
      } else {
        data = await models.Visit.findAll({
          where: { [Op.and]: [{ isActive: true }] },
          include: [
            models.Client,
            models.Department,
            models.ClientBillItem,
            models.Branch,
            { model: models.ClinicalStaff, include: [models.Staff] }
          ],
          order: [["visitDate", "DESC"]]
        });
      }
      data.forEach((dataitem) => {
        dataitem.dataValues.clientFullName = dataitem.Client.firstName + ", " + dataitem.Client.lastName;
        dataitem.dataValues.gender = dataitem.Client.gender;
        dataitem.dataValues.spokenLanguages = dataitem.Client.spokenLanguages;
        //dataitem.dataValues.statusProgress  = dataitem.Visit.statusProgress;
      });
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/visits", auth.authenticate, async function (req, res) {
    let branchId = req.session.passport.user.branchId;
    let report = req.query.report;
    let data;
    try {
      branchId = parseInt(branchId);
      data = await models.Visit.findAll({
        where: { branchId: branchId },
        include: [
          models.VisitReason,
          models.Client,
          models.Department,
          models.ClientBillItem,
          models.Branch,
          { model: models.ClinicalStaff, include: [models.Staff] }
        ],
        order: [["visitDate", "DESC"]]
      });
      if (report === true) {
        data = await models.Visit.findAll({
          where: { branchId: branchId },
          include: [
            models.VisitReason,
            models.Client,
            models.Department,
            models.ClientBillItem,
            models.Branch,
            { model: models.ClinicalStaff, include: [models.Staff] }
          ],
          order: [["visitDate", "DESC"]]
        });
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/labvisit", auth.authenticate, async function (req, res) {
    let visitId = req.query.visitId;
    let data;
    try {
      visitId = parseInt(visitId);
      if (!isNaN(visitId)) {
        data = await models.Visit.findAll({
          where: { visitId: visitId },
          include: [
            models.VisitReason,
            models.Client,
            { model: models.ClinicalStaff, include: [models.Staff] }
          ],
          order: [["visitDate", "DESC"]]
        });
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/clientvisits", auth.authenticate, async function (req, res) {
    let clientId = req.query.clientId;
    let searchText = req.query.clientName;
    let data;
    clientId = parseInt(clientId);
    try {
      if (!isNaN(clientId)) {
        data = await models.Visit.findAll({
          where: { clientId: clientId },
          include: [
            models.VisitReason, { model: models.ClinicalStaff, include: [models.Staff] }
          ],
          order: [["visitDate", "DESC"]]
        });
      }
      if (searchText) {
        data = await models.Visit.findAll({
          include: [
            {
              model: models.Client,
              where: {
                [Op.or]: [
                  { firstName: { [Op.iLike]: `%${searchText}%` } },
                  { lastName: { [Op.iLike]: `%${searchText}%` } }
                ]
              }
            },
            {
              model: models.VisitReason
            },
            {
              model: models.ClinicalStaff,
              include: [models.Staff]
            }
          ],
          order: [["visitDate", "DESC"]]
        });
        /*  data = await models.Client.findAll({
            where: {
              [Op.or]: [
                { firstName: { [Op.iLike]: `%${searchText}%` } },
                { lastName: { [Op.iLike]: `%${searchText}%` } }
              ]
            },
            include: [
              {
                model: models.Visit,
                right: true,
                order: [["visitDate", "DESC"]],
                include: [models.VisitReason, { model: models.ClinicalStaff, include: [models.Staff] }]
              }
            ]
          }); */
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  //CLIENT VISITS
  router.get("/dispenseclient", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText === "undefined") {
        result = await models.Client.findAll({
          attributes: ["clientId", "firstName", "lastName"],
          include: [
            {
              model: models.Visit,
              right: true,
              where: { isActive: true },
              attributes: ["clientId", "visitId"],
              include: [{ model: models.ClinicalStaff, include: [models.Staff] }]
            }
          ],
          order: [["clientId", "ASC"]]
        });
      } else if (searchText) {
        result = await models.Client.findAll({
          attributes: ["clientId", "firstName", "lastName"],
          where: {
            [Op.or]: [
              {
                firstName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                lastName: {
                  [Op.iLike]: `%${searchText}%`,
                }
              }
            ]
          },
          include: [
            {
              model: models.Visit,
              where: { isActive: true },
              attributes: ["clientId", "visitId"],
              include: [{ model: models.ClinicalStaff, include: [models.Staff] }]
            }
          ],
          order: [["clientId", "ASC"]]
        });
      } else {
        result = await models.Client.findAll({
          attributes: ["clientId", "firstName", "lastName"],
          include: [
            {
              model: models.Visit,
              right: true,
              where: { isActive: true },
              attributes: ["clientId", "visitId"],
              include: [{ model: models.ClinicalStaff, include: [models.Staff] }]
            }
          ],
          order: [["clientId", "ASC"]]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/clientallergies", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let data;
    try {
      if (!isNaN(parseInt(id))) {
        data = await models.Allergy.findAll({ where: { clientId: id } });
        res.send(data);
      }
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/clientallergies", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;

    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      let recordExists = await models.Allergy.findOne({ where: { clientId: rawdata.clientId } });

      if (recordExists) {
        result = await models.Allergy.update(data, {
          where: { clientId: data.clientId },
        });
      } else {
        result = await models.Allergy.create(data);
      }

      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/transfertoclinician", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    //rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      result = await models.Visit.update(
        {
          clinicianId: data.clinicianId
        },
        { where: { visitId: data.visitId } }
      );

      res.send({ status: "OK", data: result });

    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      logError(err, req)
    }
  });

  router.get("/medicalconditions", auth.authenticate, async function (req, res) {
    try {
      let data = await models.MedicalCondition.findAll({
        order: [["MedicalConditionName", "ASC"]],
      });
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/medicalconditions", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;

    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }

      let result = await models.MedicalCondition.create(data);
      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/clientmedicalhistory", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let data;
    try {
      if (id) {
        data = await models.MedicalHistory.findAll({ where: { clientId: id } });
        res.send(data);
      }
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/diagnosis", auth.authenticate, async function (req, res) {
    let visitid = req.query.VisitId;
    let result;
    try {
      if (!isNaN(visitid)) {
        result = await models.Diagnosis.findOne({
          where: { visitId: visitid },
          include: [{ model: models.ShortDiagnosis }],
        });
      } else {
        result = await models.Diagnosis.findAll({
          include: [{ model: models.ShortDiagnosis }],
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });
  router.post("/diagnosis", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      if (data.diagnosisId) {
        rawdata.updatedBy = req.session.passport.user.staffId;
        result = await models.Diagnosis.update(data, {
          where: { diagnosisId: data.diagnosisId },
        });
      } else {
        rawdata.createdBy = req.session.passport.user.staffId;
        result = await models.Diagnosis.create(data);
      }
      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/shortdiagnosis", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;

    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      if (data.shortDiagnosisId) {
        result = await models.ShortDiagnosis.update(data, {
          where: { shortDiagnosisId: data.shortDiagnosisId },
        });
      } else {
        result = await models.ShortDiagnosis.create(data);
      }
      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/shortdiagnosis", auth.authenticate, async function (req, res) {
    let result;
    try {
      result = await models.ShortDiagnosis.findAll();
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  /**Method can only be called if authenticated */
  router.post("/clientmedicalhistory", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    let staffid = req.session.passport.user.staffId;
    rawdata.forEach((row) => {
      row.createdBy = staffid;
    });
    try {
      let result;
      result = await models.MedicalHistory.destroy({
        where: { clientId: rawdata[0].clientId },
      });
      result = await models.MedicalHistory.bulkCreate(rawdata);

      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  //lab
  router.get("/labtesttypes", auth.authenticate, async function (req, res) {
    try {
      let testTypes = await models.LabTestType.findAll();
      //let staffid = req.session.passport.user.staffId;
      res.send(testTypes);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/labtesttypes", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    //rawdata.createdBy = req.session.passport.user.staffId;

    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }

      let result = await models.LabTestType.create(data);
      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/labtests", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let data;
    try {
      if (parseInt(id)) {
        data = await models.LabTest.findAll({
          where: { testTypeId: id },
          include: [models.LabTestType]
        });
      } else {
        data = await models.LabTest.findAll(
          {
            include: [models.LabTestType]
          }
        );
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/labtests", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;

    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }

      let result = await models.LabTest.create(data);
      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/laborders", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    try {
      if (id) {
        let testorder = await models.LabTestOrder.findAll({
          where: { isComplete: id },
        });
        res.send(testorder);
      }
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/laborders", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    //NEEDS TO BE FIXED
    let data = {};
    try {
      rawdata.forEach((order) => {
        order.clinicianId = req.session.passport.user.staffId;
        order.createdBy = req.session.passport.user.staffId;
        order.createdBy = req.session.passport.user.staffId;
        order.healthUnitId = req.session.passport.user.healthUnitId;
        order.branchId = req.session.passport.user.branchId;
        order.clinicianId = (req.session.passport.user.Staff.ClinicalStaff) ? req.session.passport.user.Staff.ClinicalStaff.clinicianId : null;
        order.departmentId = (req.session.passport.user) ? req.session.passport.user.departmentId : null;
        //NEEDS TO BE FIXED
      });
      for (key in rawdata) { if (rawdata[key] !== "") { data[key] = rawdata[key]; } }
      let result;
      result = await sequelize.transaction(async (t) => {
        if (!rawdata[0].visitId) {
          rawdata.clientId = rawdata[0].clientId
          //CREATE A VISIT
          let visit = await models.Visit.create({
            clientId: rawdata.clientId,
            branchId: rawdata.branchId,
            healthUnitId: rawdata.healthUnitId,
            createdBy: rawdata.createdBy,
            clinicianId: rawdata.clinicianId,
            departmentId: rawdata.departmentId
          }, { transaction: t });
          let bill = await models.ClientBill.create(
            {
              clientId: rawdata.clientId,
              visitId: visit.visitId,
              isCleared: false,
            },
            { transaction: t }
          );
          console.log(bill)
          for (let i = 0; i < rawdata.length; i++) {
            rawdata[i].visitId = visit.visitId;
            rawdata[i].newOrderBillId = bill.billId
          }
        }

        function getUniqueObjects(arr) {
          let uniqueObjects = new Set();
          arr.forEach((item) => {
            uniqueObjects.add(JSON.stringify(item.TestType));
          });
          return Array.from(uniqueObjects).map(JSON.parse);
        }
        let uniqueObjects = getUniqueObjects(rawdata)
        for (let i = 0; i < uniqueObjects.length; i++) {
          let billRecord = await models.ClientBill.findOne(
            {
              where: {
                [Op.and]: [
                  { clientId: rawdata[0].clientId },
                  { visitId: rawdata[0].visitId },
                ]
              }
            },
            { transaction: t }
          );
          let billItem = await models.ClientBillItem.create(
            {
              billId: billRecord.billId,
              quantity: 1,
              amount: uniqueObjects[i].price,
              billItemName: uniqueObjects[i].testTypeName,
              billNote: "LAB TEST",
              createdBy: req.session.passport.user.staffId,
            },
            { transaction: t }
          );

          for (j = 0; j < rawdata.length; j++) {
            if (data[j].testTypeId === uniqueObjects[i].testTypeId) {
              let order = rawdata[j];
              order.billItemId = billItem.billItemId;
              let laborder = await models.LabTestOrder.create(order, {
                transaction: t,
              });
            }
          }
        }
        /* for (let i = 0; i < rawdata.length; i++) {
           let order = rawdata[i];
           console.log(order)
           let billRecord = await models.ClientBill.findOne(
             {
               where: {
                 [Op.and]: [
                   { clientId: order.clietId },
                   { visitId: order.visitId },
                 ]
               }
             },
             { transaction: t }
           );
           console.log(billRecord)
           if (!billRecord) {
             let billRecord = {}
             billRecord.billId = order.newOrderBillId;
           }
           console.log(billRecord)
           let billItem = await models.ClientBillItem.create(
             {
               billId: billRecord.billId,
               quantity: 1,
               amount: order.price,
               billItemName: order.testName,
               billNote: "LAB TEST",
               createdBy: order.createdBy,
             },
             { transaction: t }
           );
           order.billItemId = billItem.billItemId;
           let laborder = await models.LabTestOrder.create(order, {
             transaction: t,
           });
         }*/
      });
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/labresults", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let testresults;
    try {
      if (!isNaN(id)) {
        testresults = await models.LabTestResult.findAll({
          include: {
            model: models.LabTestOrder,
            where: { visitId: id },
            include: [models.LabTest, models.Client],
          },
          order: [["createDate", "DESC"]],
        });
      } else if (id === "undefined") {
        testresults = await models.LabTestResult.findAll({
          include: [
            {
              model: models.LabTestOrder,
              include: [models.LabTest, models.Client],
            },
          ],
          order: [["createDate", "DESC"]],
        });
      } else {
        testresults = await models.LabTestResult.findAll({
          include: [
            {
              model: models.LabTestOrder,
              include: [models.LabTest, models.Client],
            },
          ],
          order: [["createDate", "DESC"]],
        });
      }
      res.send(testresults);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/testResultEntry", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.clinicianId = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      await sequelize.transaction(async (t) => {
        for (let i = 0; i < data.labresults.length; i++) {
          console.log(data.labresults[i])
          data.labresults[i].createdBy = req.session.passport.user.staffId;
          if (data.labresults[i].resultId) {
            await models.LabTestResult.update(
              data.labresults[i],
              { where: { resultId: data.labresults[i].resultId } },
              { transaction: t }
            );
            await models.LabTestOrder.update(
              { isComplete: true, labOrderStatusId: 2 },//LAB STATUS SET MANUALLY
              { where: { orderId: data.labresults[i].orderId } },
              { transaction: t }
            );
          } else {
            await models.LabTestResult.create(data.labresults[i], { transaction: t });
            await models.LabTestOrder.update(
              { isComplete: true, labOrderStatusId: 2 },//LAB STATUS SET MANUALLY
              { where: { orderId: data.labresults[i].orderId } },
              { transaction: t }
            );
          }
        }
      });
      res.send({ status: "OK", data: "result" });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req);
    }
  }
  );
  router.post("/labresults", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.clinicianId = req.session.passport.user.staffId;

    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }

      let result = await models.LabTestResult.create(data);
      if (result) {
        res.send({ status: "OK", data: result });
      }
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });

  //Imaging
  router.get("/imagingtests", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let data;
    try {
      if (isNaN(id)) {
        data = await models.RadiologyTest.findAll();
      } else {
        data = await models.RadiologyTest.findAll({ where: { visitId: id } });
      }
      res.send(data);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/imagingtests", async function (req, res) {
    let rawdata = req.body;
    rawdata.clinicianId = req.session.passport.user.staffId;

    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
    } catch (err) {
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/updatelabradiologyorder", auth.authenticate, async function (req, res) {
    let data = req.body;
    let visitId = req.body.visitId
    let result;
    try {
      if (data.radiology) {
        if (!isNaN(parseInt(visitId))) {
          result = await models.RadiologyTestOrder.update(
            {
              labOrderStatusId: data.labOrderStatusId,
              dateUpdated: new Date(),
              updatedBy: req.session.passport.user.staffId
            },
            {
              where: { orderId: data.orderId }
            })
        }
      }
      if (data.lab) {
        if (!isNaN(parseInt(visitId))) {
          for (let i = 0; i < data.LabOrders.length; i++) {
            let record = data.LabOrders[i]
            result = await models.LabTestOrder.update(
              {
                labOrderStatusId: data.labOrderStatusId,
                dateUpdated: new Date(),
                updatedBy: req.session.passport.user.staffId
              },
              {
                where: { orderId: record.orderId }
              });
          }
        }

      }
      res.send({ status: "OK", data: result });
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/imagingorders", auth.authenticate, async function (req, res) {
    let id = req.query.id;
    let testorder;
    try {
      if (id) {
        testorder = await models.RadiologyTestOrder.findAll({
          where: { isComplete: id },
          include: [models.Client, models.Visit, models.RadiologyTest, models.LabOrderStatus]
        });
      } else {
        testorder = await models.RadiologyTestOrder.findAll(
          {
            include: [models.Client, models.Visit, models.RadiologyTest, models.LabOrderStatus]
          }
        );
      }
      res.send(testorder);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/imagingorders", auth.authenticate, async function (req, res) {
    let rawdata = req.body;
    rawdata.forEach((order) => {
      order.clinicianId = req.session.passport.user.staffId;
      order.createdBy = req.session.passport.user.staffId;
    });

    let data = {};
    try {
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let result;
      result = await sequelize.transaction(async (t) => {
        for (let order of rawdata) {
          let billRecord = await models.ClientBill.findOne(
            {
              where: {
                [Op.and]: [
                  { clientId: order.clientId },
                  { visitId: order.visitId },
                ],
              },
            },
            { transaction: t }
          );
          let billItem = await models.ClientBillItem.create(
            {
              billId: billRecord.billId,
              quantity: 1,
              amount: order.price,
              billItemName: order.testName,
              billNote: "Radiology Test",
              createdBy: order.createdBy,
            },
            { transaction: t }
          );
          order.billItemId = billItem.billItemId;
          await models.RadiologyTestOrder.create(order, { transaction: t });
        }
      });
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin");
      console.log(err);
      logError(err, req)
    }
  });
  //admissions
  router.get("/Wards", auth.authenticate, async function (req, res, next) {
    let searchItem = req.query.wardName;
    let wards;
    try {
      if (searchItem) {
        wards = await models.Ward.findAll({
          where: { wardName: { [Op.iLike]: `%${searchItem}%` } },
          include: [models.Room],
        });
      } else {
        wards = await models.Ward.findAll({ include: [models.Room] });
      }
      res.send(wards);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/loadLabTestOrder", auth.authenticate, async function (req, res, next) {
    let id = req.query.testId;
    let labTestOrder;
    try {
      if (id) {
        labTestOrder = await models.LabTestOrder.findAll({
          include: { model: models.LabTest, where: { testId: id } },
        });
      } else if (id === "undefined") {
        labTestOrder = await models.LabTestOrder.findAll({
          include: { model: models.LabTest },
        });
      } else {
        labTestOrder = await models.LabTestOrder.findAll({
          include: { model: models.LabTest },
        });
      }
      res.send(labTestOrder);
    } catch (error) {
      logError(err, req)
    }
  });

  router.get("/loadTestResults", auth.authenticate, async function (req, res, next) {
    let searchItem = req.query.searchText;
    let id = req.query.visitId;
    let testresults;
    try {
      if (id) {
        testresults = await models.LabTestResult.findAll({
          include: { model: models.LabTestOrder, where: { visitId: id } },
        });
      } else if (id === "undefined") {
        testresults = await models.LabTestResult.findAll({
          include: { model: models.LabTestOrder },
        });
      } else {
        testresults = await models.LabTestResult.findAll({
          include: { model: models.LabTestOrder },
        });
      }
      res.send(testresults);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/Ward", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.wardId) {
        result = await models.Ward.update(data, {
          where: { wardId: rawdata.wardId },
        });
      } else {
        result = await models.Ward.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/loadBeds", auth.authenticate, async function (req, res, next) {
    let beds;
    let id = req.query.roomId;
    try {
      if (id === "undefined") {
        beds = await models.Bed.findAll({
          include: [models.BedType, models.Room],
        });
      } else if (id) {
        beds = await models.Bed.findAll({
          where: { roomId: id },
          include: [models.BedType, models.Room],
        });
      } else {
        beds = await models.Bed.findAll({
          include: [models.BedType, models.Room],
        });
      }
      res.send(beds);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/createBed", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.bedId) {
        result = await models.Bed.update(data, {
          where: { bedId: rawdata.bedId },
        });
      } else {
        let roomRecord = await models.Room.findOne({
          where: { roomId: rawdata.roomId },
        });
        if (
          roomRecord.numberOfBeds < roomRecord.maxNumberOfBeds &&
          roomRecord.isActive === true &&
          roomRecord.isOccupied === false
        ) {
          (result = await models.Bed.create(data)),
            await models.Room.increment("numberofbeds", {
              by: 1,
              where: { roomId: rawdata.roomId },
            });
        }
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/rooms", auth.authenticate, async function (req, res, next) {
    let id = req.query.wardId;

    let searchItem = req.query.searchText;
    let rooms;
    try {
      if (searchItem) {
        rooms = await models.Room.findAll({
          where: { roomName: { [Op.iLike]: `%${searchItem}%` } },
          include: [models.Ward],
        });
      } else {
        if (id === "undefined") {
          rooms = await models.Room.findAll({ include: [models.Ward] });
        } else if (id) {
          rooms = await models.Room.findAll({
            where: { wardId: id },
            include: [models.Ward],
          });
        } else {
          rooms = await models.Room.findAll({ include: [models.Ward] });
        }
      }
      res.send(rooms);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/room", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.roomId) {
        result = await models.Room.update(data, {
          where: { roomId: rawdata.roomId },
        });
      } else {
        result = await models.Room.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req);
    }
  });

  router.get("/bedTypes", auth.authenticate, async function (req, res, next) {
    try {
      let bedTypes = await models.BedType.findAll();
      res.send(bedTypes);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/BedType", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.bedTypeId) {
        result = await models.BedType.update(data, {
          where: { bedTypeId: rawdata.bedTypeId },
        });
      } else {
        result = await models.BedType.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/admittedclients", auth.authenticate, async function (req, res, next) {
    let discharged = req.query.isDischarged;
    let result;
    try {
      if (discharged) {
        result = await models.Admission.findAll({
          where: { isDischarged: discharged },
          include: [models.Client, models.Ward, models.Room, models.Bed],
          order: [["dateDischarged", "DESC"]],
        });
        result.forEach((dataitem) => {
          dataitem.dataValues.clientFullName =
            dataitem.Client.firstName + ", " + dataitem.Client.lastName;
          dataitem.dataValues.wardName = dataitem.Ward.wardName;
          dataitem.dataValues.roomName = dataitem.Room.roomName;
        });
      } else if (discharged === "undefined") {
        result = await models.Admission.findAll({
          include: [models.Client, models.Ward, models.Room, models.Bed],
          order: [["dateDischarged", "DESC"]],
        });
      } else {
        result = await models.Admission.findAll({
          include: [models.Client, models.Ward, models.Room, models.Bed],
          order: [["dateAdmitted", "DESC"]],
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/admittedclientscheck", async function (req, res, next) {
    let visitId = req.query.visitId;
    let result;
    try {
      if (!isNaN(visitId)) {
        result = await models.Admission.findOne({
          where: { visitId: visitId },
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/loadTestResults", auth.authenticate, async function (req, res, next) {
    let searchItem = req.query.searchText;
    let id = req.query.visitId;
    let testresults;
    try {
      if (!isNan(id)) {
        testresults = await models.LabTestResult.findAll({
          include: { model: models.LabTestOrder, where: { visitId: id } },
        });
      } else if (id === "undefined") {
        testresults = await models.LabTestResult.findAll({
          include: { model: models.LabTestOrder },
        });
      } else {
        testresults = await models.LabTestResult.findAll({
          include: { model: models.LabTestOrder },
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/admitClient", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.admissionId) {
        result = await sequelize.transaction(async (t) => {
          await models.Admission.update(
            {
              dischargeNote: data.dischargeNote,
              dischargedBy: data.createdBy,
              isDischarged: true,
              dateDischarged: Date.now(),
            },
            { where: { admissionId: rawdata.admissionId } },
            { transaction: t }
          );
          await models.Bed.update(
            { isOccupied: false },
            { where: { bedId: data.bedId } },
            { transaction: t }
          );
          await models.Room.decrement("occupiedbeds", {
            by: 1,
            where: { roomId: data.roomId },
          });
          let roomCheck = await models.Room.findOne(
            {
              where: { roomId: data.roomId },
            },
            { transaction: t }
          );
          if (roomCheck.numberOfBeds == roomCheck.occupiedBeds) {
            await models.Room.update(
              { isOccupied: true },
              { where: { roomId: data.roomId } },
              { transaction: t }
            );
          } else {
            await models.Room.update(
              { isOccupied: false },
              { where: { roomId: data.roomId } },
              { transaction: t }
            );
          }
          //Admission Bill
          let record = await models.Room.findOne(
            { where: { roomId: rawdata.roomId } },
            { transaction: t }
          );
          let bedRecord = await models.Bed.findOne(
            { where: { bedId: rawdata.bedId } },
            { transaction: t }
          );
          let billRecord = await models.ClientBill.findOne(
            {
              where: {
                [Op.and]: [
                  { clientId: data.clientId },
                  { visitId: data.visitId },
                ],
              },
            },
            { transaction: t }
          );
          await models.ClientBillItem.create(
            {
              billId: billRecord.billId,
              quantity: 1,
              amount: record.bedPrice,
              billItemName: record.roomName + "/" + bedRecord.bedNumber,
              billNote: "Patient admission",
              createdBy: data.createdBy,
            },
            { transaction: t }
          );
        });
      } else {
        result = await sequelize.transaction(async (t) => {
          await models.Admission.create(data, { transaction: t });
          await models.Bed.update(
            { isOccupied: true, clientId: rawdata.clientId },
            { where: { bedId: rawdata.bedId } },
            { transaction: t }
          );
          await models.Room.increment(
            "occupiedbeds",
            { by: 1, where: { roomId: rawdata.roomId } },
            { transaction: t }
          );
          let record = await models.Room.findOne(
            { where: { roomId: rawdata.roomId } },
            { transaction: t }
          );
          let bedRecord = await models.Bed.findOne(
            { where: { bedId: rawdata.bedId } },
            { transaction: t }
          );
          if (record.numberOfBeds === record.occupiedBeds) {
            await models.Room.update(
              { isOccupied: true },
              { where: { roomId: rawdata.roomId } },
              { transaction: t }
            );
          }
          let billRecord = await models.ClientBill.findOne(
            {
              where: {
                [Op.and]: [
                  { clientId: data.clientId },
                  { visitId: data.visitId },
                ]
              }
            },
            { transaction: t }
          );
          //Admission bill
          await models.ClientBillItem.create(
            {
              billId: billRecord.billId,
              quantity: 1,
              amount: record.bedPrice,
              billItemName: record.roomName + "/" + bedRecord.bedNumber,
              billNote: "Patient admission",
              createdBy: data.createdBy,
            },
            { transaction: t }
          );
        });
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });
  //end admissions

  /* Records Module Begins Here */
  router.get("/loadReferralRecords", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.Referral.findAll({
          include: {},
          include: [
            {
              model: models.Client,
              right: true,
              where: {
                [Op.or]: [
                  {
                    firstName: { [Op.iLike]: `%${searchText}%` }
                  },
                  {
                    lastName: { [Op.iLike]: `%${searchText}%` },
                  }
                ]
              }
            },
            {
              model: models.HealthUnit,
            },
          ],
        });
      } else {
        result = await models.Referral.findAll({
          include: [{ model: models.Client }, { model: models.HealthUnit }],
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/clientReferral", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.referralNo) {
        result = await models.Referral.update(data, {
          where: { referralNo: rawdata.referralNo },
        });
      } else {
        result = await models.Referral.create(data).then(async function () {
          if (rawdata.visitId) {
            result = await models.DischargeClient.create({
              clientId: rawdata.clientId,
              visitId: rawdata.visitId,
              dischargeNote: rawdata.reasonForReferral,
            }).then(async function () {
              if (rawdata.admissionId) {
                await models.Admission.update(
                  { isDischarged: true, dischargedBy: rawdata.referredBy },
                  { where: { admissionId: rawdata.admissionId } }
                ).then(async function () {
                  await models.Bed.update(
                    { isOccupied: false, clientId: null },
                    { where: { bedId: rawdata.bedId } }
                  ).then(async function () {
                    await models.Room.decrement("occupiedbeds", {
                      by: 1,
                      where: { roomId: rawdata.roomId },
                    }).then(async function () {
                      let record = await models.Room.findOne({
                        where: { roomId: rawdata.roomId },
                      });
                      if (record.numberOfBeds < record.occupiedBeds) {
                        await models.Room.update(
                          { isOccupied: false },
                          { where: { roomId: rawdata.roomId } }
                        );
                      }
                    });
                  });
                });
              }
            });
          }
        });
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/loadDeathRecords", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.DeathRecord.findAll({
          include: {
            model: models.Client,
            right: true,
            where: {
              [Op.or]: [
                { firstName: { [Op.iLike]: `%${searchText}%` } },
                { lastName: { [Op.iLike]: `%${searchText}%` } }
              ]
            }
          }
        });
      } else {
        result = await models.DeathRecord.findAll({ include: [models.Client] });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/addDeathRecord", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.deathRecordNo) {
        result = await models.DeathRecord.update(data, {
          where: { deathRecordNo: rawdata.deathRecordNo },
        });
      } else {
        result = await models.DeathRecord.create(data).then(
          async function () {
            if (rawdata.visitId) {
              result = await models.DischargeClient.create({
                clientId: rawdata.clientId,
                visitId: rawdata.visitId,
                dischargeNote: rawdata.postmotemNotes,
              }).then(async function () {
                if (rawdata.admissionId) {
                  await models.Admission.update(
                    { isDischarged: true, dischargedBy: rawdata.referredBy },
                    { where: { admissionId: rawdata.admissionId } }
                  ).then(async function () {
                    await models.Bed.update(
                      { isOccupied: false, clientId: null },
                      { where: { bedId: rawdata.bedId } }
                    ).then(async function () {
                      await models.Room.decrement("occupiedbeds", {
                        by: 1,
                        where: { roomId: rawdata.roomId },
                      }).then(async function () {
                        let record = await models.Room.findOne({
                          where: { roomId: rawdata.roomId },
                        });
                        if (record.numberOfBeds < record.occupiedBeds) {
                          await models.Room.update(
                            { isOccupied: false },
                            { where: { roomId: rawdata.roomId } }
                          );
                        }
                      });
                    });
                  });
                }
              });
            }
          }
        );
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  }
  );

  router.get("/loadBirthRecords", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.BirthRecord.findAll({
          where: {
            [Op.or]: [
              {
                firstName: { [Op.iLike]: `%${searchText}%` }
              },
              {
                otherName: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          },
          include: { model: models.Client, right: true },
        });
      } else {
        result = await models.BirthRecord.findAll({ include: [models.Client] });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/createBirthRecord", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    console.log(rawdata);
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.birthNo) {
        result = await models.BirthRecord.update(data, {
          where: { birthNo: rawdata.birthNo },
        });
      } else {
        result = await models.BirthRecord.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  }
  );

  router.get("/loadHealthUnits", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.HealthUnit.findAll({
          where: {
            [Op.or]: [
              {
                healthUnitName: { [Op.iLike]: `%${searchText}%` }
              },
              {
                locationAddress: { [Op.iLike]: `%${searchText}%` }
              },
              {
                contactNumber1: { [Op.iLike]: `%${searchText}%` }
              },
              {
                contactNumber2: { [Op.iLike]: `%${searchText}%` }
              },
              {
                email: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          }
        });
      } else {
        result = await models.HealthUnit.findAll();
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  /* Records Module Ends Here */

  /* Pharmacy End Point */

  //BILLING TYPES TO BE CHANGED TO THE ORIGINAL
  router.get("/billingType", auth.authenticate, async function (req, res, next) {
    let result;
    try {
      result = await models.BillingType.findAll({
        order: [["billingTypeId", "ASC"]],
      });
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/prescription", auth.authenticate, async function (req, res, next) {
    let visitNo = req.query.visitId;
    let dispense = req.query.dispense;
    let result;
    try {

      if (!isNaN(visitNo) && dispense === "true") {
        result = await models.Prescription.findAll({
          where: { visitId: visitNo },
          include: [
            {
              model: models.Product,
              include:
                [models.ProductType, models.PharmacyStock, models.ItemPrice, models.Inventory]
            }
          ],
          order: [["createDate", "DESC"]],
        });
      } else if (!isNaN(visitNo)) {
        result = await models.Prescription.findAll({
          where: { visitId: visitNo },
          include: [
            {
              model: models.Product,
              include:
                [models.ProductType, models.PharmacyStock, models.ItemPrice, models.Inventory]
            }
          ],
          order: [["createDate", "DESC"]],
        });
      } else {
        result = await models.Prescription.findAll({
          include: [
            {
              model: models.Product,
              include:
                [models.ProductType, models.PharmacyStock, models.ItemPrice, models.Inventory]
            }
          ],
        });
      }
      res.send(result);
    } catch (error) {
      console.log(error);
      logError(error, req)
    }
  });

  router.post("/drugprescription", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    try {
      let result;
      let drugs = rawdata.prescribedDrugs;
      rawdata.createdBy = req.session.passport.user.staffId;
      rawdata.prescribedBy = req.session.passport.user.fullName;
      for (i = 0; i < drugs.length; i++) {
        let prescriptionInfo = drugs[i];
        result = await models.Prescription.create({
          clientId: rawdata.clientId,
          visitId: rawdata.visitId,
          productId: prescriptionInfo.productId, //changed drugId to productId
          quantityPrescribed: prescriptionInfo.quantityPrescribed,
          prescriptionDosage: prescriptionInfo.prescriptionDosage,
          createdBy: rawdata.createdBy,
          whenToTake: prescriptionInfo.whenToTake,
          refill: prescriptionInfo.refill,
          duration: prescriptionInfo.duration,
          prescribedBy: rawdata.prescribedBy
        });
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req);
    }
  });

  router.get("/dispense", auth.authenticate, async function (req, res, next) {
    let visitNo = req.query.visitNo;
    let result;
    try {
      if (!isNaN(visitNo)) {
        result = await models.Dispense.findAll({
          where: { visitId: visitNo },
          include: {
            model: models.PharmacyStock,
            include: { model: models.Product },
          },
          order: [["dispenseId", "ASC"]],
          limit: 20,
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req);
    }
  });
  /*
  END POINT TO RETURN RECEIPT INFORMATION WHEN A RECEIPT NO IS ENTERED
  */
  router.get("/getreceipt", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let receiptNo = req.query.receiptNo;
    //UNCOMMENT IN PRODUCTION
    //rawdata.createdBy = req.session.passport.user.staffId;
    let result;
    try {
      if (parseInt(receiptNo)) {
        result = await models.ClientBillPaymentReceipt.findOne({
          where: { receiptId: receiptNo },
          include: [
            {
              model: models.ClientBillPayment,
              include: [models.ClientBillItem]
            },
            {
              model: models.Staff
            }
          ]
        });
        if (result !== null) {
          res.status(200).json({
            success: true,
            status: "OK",
            data: result,
            message: "SUCCESS."
          });
          return;
        } else {
          res.status(404).json({
            success: false,
            status: "FAILED",
            data: result,
            message: "RECEIPT NOT FOUND."
          });
        }
      } else {
        res.status(404).json({
          success: false,
          status: "FAILED",
          data: result,
          message: "RECEIPT NOT FOUND."
        });
      }

    } catch (error) {
      res.status(400).json({
        success: false,
        status: "FAILED",
        data: result,
        message: "AN ERROR OCCURED, YOUR REQUEST NOT UNDERSTOOD"
      });
      console.log(error)
      logError(error, req)
    }
  });

  router.get("/productsales", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      result = await models.ProductSales.findAll({
        include: [
          {
            model: models.PharmacyStock,
            include: [
              {
                model: models.Product,
                include: { model: models.ProductType }
              }
            ]
          },
          { model: models.ProductSalesReceipt }
        ],
        order: [["createDate", "DESC"]],
      });
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/ProductSales", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    try {
      let resData = [];
      let totalAmount = 0;
      let balanceAmount = 0;

      await sequelize.transaction(async (t) => {
        let receipt = await models.ProductSalesReceipt.create(rawdata, { transaction: t });
        rawdata.productSalesReceiptId = receipt.productSalesReceiptId;
        let products = rawdata.selectedProducts;
        for (i = 0; i < products.length; i++) {
          let prodInfo = products[i];
          if (!prodInfo.quantityBought) { prodInfo.quantityBought = 1; }
          let result;
          let stockCheck = await models.PharmacyStock.findOne(
            { where: { stockId: prodInfo.stockId } },
            { transaction: t }
          );
          if (stockCheck.quantityAvailable > prodInfo.quantityBought) {
            totalAmount += prodInfo.quantityBought * prodInfo.price;
            result = await models.ProductSales.create(
              {
                stockId: prodInfo.stockId,
                productSalesReceiptId: rawdata.productSalesReceiptId,
                batchNumber: prodInfo.batchNumber,
                quantityBought: prodInfo.quantityBought,
                price: prodInfo.price,
                totalAmount: prodInfo.quantityBought * prodInfo.price,
                paymentMethodName: rawdata.paymentMethodName,
                dateSold: rawdata.dateSold,
                createdBy: rawdata.createdBy,
              },
              { transaction: t }
            );
            await models.Income.create({
              incomeTypeId: 1,//DRUG INCOME 
              incomeSource: 'PHARMACY',
              amountReceieved: prodInfo.quantityBought * prodInfo.price,
              description: prodInfo.quantityBought + ' - ' + prodInfo.productName,
              dateRecieved: new Date(),
              dateRecorded: new Date(),
              receivedBy: req.session.passport.user.fullName,
              createdBy: req.session.passport.user.staffId
            }, { transaction: t });
            await models.PharmacyStock.update(
              {
                quantityAvailable: stockCheck.quantityAvailable - prodInfo.quantityBought,
                updatedBy: rawdata.createdBy,
              },
              { where: { stockId: prodInfo.stockId } },
              { transaction: t }
            );
            /*  let receivedPharmacyStock = await models.ReceivedPharmacyStock.findOne(
               { where: { batchNumber: prodInfo.batchNumber } }
             );
              await models.ReceivedPharmacyStock.update(
                 {
                   quantityAvailable: receivedPharmacyStock.quantityAvailable - prodInfo.quantityBought
                 },
                 {
                   where: { batchNumber: receivedPharmacyStock.batchNumber }
                 },
                 { transaction: t }
               );*/
            let productDetails = await models.PharmacyStock.findOne(
              {
                where: { stockId: result.stockId },
                include: [
                  {
                    model: models.Product,
                    include: [{ model: models.ProductType }],
                  }
                ]
              },
              { transaction: t }
            );
            let outData = {};
            outData.result = result;
            outData.Product = productDetails.Product;
            resData.push(outData);
          }
        }
      });

      let rcp = await models.ProductSalesReceipt.update(
        { totalAmount: totalAmount },
        { where: { productSalesReceiptId: rawdata.productSalesReceiptId } }
      );
      res.send({ status: "OK", data: resData });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req);
    }
  });

  router.post("/drugdispense", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    try {
      let result;
      let drugs = rawdata.selectedDrugs;
      let dispInfo = rawdata.dispenseInfo;
      for (i = 0; i < drugs.length; i++) {
        let drugInfo = drugs[i];
        result = await sequelize.transaction(async (t) => {
          let billRecord = await models.ClientBill.findOne(
            {
              where: {
                [Op.and]: [
                  { clientId: dispInfo.clientId },
                  { visitId: dispInfo.visitId },
                ]
              }
            },
            { transaction: t }
          );
          await models.ClientBillItem.create(
            {
              billId: billRecord.billId,
              quantity: drugInfo.quantityPrescribed,
              amount: drugInfo.quantityPrescribed * drugInfo.price,
              billItemName: drugInfo.Product.productName,
              billNote: "Drug Dispense",
              createdBy: rawdata.createdBy,
            },
            { transaction: t }
          );
          await models.Dispense.create(
            {
              dispenseTypeId: dispInfo.dispenseTypeId,
              clientId: dispInfo.clientId,
              visitId: dispInfo.visitId,
              createdBy: rawdata.createdBy,
              stockId: drugInfo.Product.PharmacyStock.stockId,
              quantity: drugInfo.quantityPrescribed,
              billingTypeId: dispInfo.billingTypeId,
              amount: drugInfo.quantityPrescribed * drugInfo.price,
            },
            { transaction: t }
          );
          let stockCheck = await models.PharmacyStock.findOne(
            {
              where: { stockId: drugInfo.Product.PharmacyStock.stockId }
            },
            { transaction: t }
          );
          if (stockCheck.quantityAvailable > drugInfo.quantityPrescribed) {
            await models.PharmacyStock.update(
              {
                quantityAvailable: stockCheck.quantityAvailable - drugInfo.quantityPrescribed,
                updatedBy: rawdata.createdBy,
              },
              {
                where: { stockId: drugInfo.Product.PharmacyStock.stockId }
              },
              { transaction: t }
            );
          }
        });
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/DrugDispenseTypes", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText === "undefined") {
        result = await models.DispenseType.findAll({ order: [["dispenseTypeId", "ASC"]] });
      } else if (searchText) {
        result = await models.DispenseType.findAll({
          where: {
            [Op.or]: [
              {
                dispenseCode: { [Op.iLike]: `%${searchText}%` }
              },
              {
                dispenseType: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          },
          order: [["dispenseTypeId", "ASC"]]
        });
      } else {
        result = await models.DispenseType.findAll({
          order: [["dispenseTypeId", "ASC"]]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/DrugDispenseType", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.dispenseTypeId) {
        result = await models.DispenseType.update(data, {
          where: { dispenseTypeId: data.dispenseTypeId },
        });
      } else {
        result = await models.DispenseType.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/DrugSupplier", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText === "undefined") {
        result = await models.Supplier.findAll({
          order: [["supplierId", "ASC"]]
        });
      } else if (searchText) {
        result = await models.Supplier.findAll({
          where: {
            [Op.or]: [
              {
                supplierName: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          },
          order: [["supplierId", "ASC"]]
        });
      } else {
        result = await models.Supplier.findAll({
          order: [["supplierId", "ASC"]]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/DrugSupplier", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.supplierId) {
        result = await models.Supplier.update(data, {
          where: { supplierId: data.supplierId },
        });
      } else {
        result = await models.Supplier.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  }
  );

  router.get("/DrugManufacturer", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText === "undefined") {
        result = await models.Manufacturer.findAll({
          order: [["manufacturerId", "ASC"]]
        });
      } else if (searchText) {
        result = await models.Manufacturer.findAll({
          where: {
            [Op.or]: [
              { manufacturerName: { [Op.iLike]: `%${searchText}%` } }
            ]
          },
          order: [["manufacturerId", "ASC"]]
        });
      } else {
        result = await models.Manufacturer.findAll({
          order: [["manufacturerId", "ASC"]]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req);
    }
  }
  );
  router.post("/DrugManufacturer", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.manufacturerId) {
        result = await models.Manufacturer.update(data, {
          where: { manufacturerId: data.manufacturerId },
        });
      } else {
        result = await models.Manufacturer.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/DrugCategory", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText === "undefined") {
        result = await models.DrugCategroy.findAll({
          order: [["productCategoryId", "ASC"]],
          limit: 20,
        });
      } else if (searchText) {
        result = await models.DrugCategroy.findAll({
          where: {
            [Op.or]: [
              {
                categoryName: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          },
          order: [["productCategoryId", "ASC"]],
          limit: 20,
        });
      } else {
        result = await models.DrugCategroy.findAll({
          order: [["productCategoryId", "ASC"]],
          limit: 20,
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/DrugCategory", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.productCategoryId) {
        result = await models.DrugCategroy.update(data, {
          where: { productCategoryId: data.productCategoryId },
        });
      } else {
        result = await models.DrugCategroy.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/DrugRoutes", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText === "undefined") {
        result = await models.DrugRoute.findAll({
          order: [["drugRouteId", "ASC"]],
          limit: 20,
        });
      } else if (searchText) {
        result = await models.DrugRoute.findAll({
          where: {
            [Op.or]: [
              { drugRouteName: { [Op.iLike]: `%${searchText}%` } }
            ]
          },
          order: [["drugRouteId", "ASC"]]
        });
      } else {
        result = await models.DrugRoute.findAll({
          order: [["drugRouteId", "ASC"]]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });
  router.post("/DrugRoute", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.drugRouteId) {
        result = await models.DrugRoute.update(data, {
          where: { drugRouteId: data.drugRouteId },
        });
      } else {
        result = await models.DrugRoute.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/Drug", auth.authenticate, async function (req, res, next) {
    let drugId = req.query.drugId;
    let result;
    try {
      if (!isNaN(drugId)) {
        result = await models.Drug.findOne({ where: { drugId: drugId } });
      } else {
        result = await models.Drug.findAll({
          include: [
            models.DrugCategroy,
            models.Manufacturer,
            models.Supplier,
            models.DrugRoute,
          ],
          order: [["drugId", "ASC"]],
          limit: 20,
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/druglist", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let drugId = req.query.drugId;
    let result;
    try {
      if (searchText === "undefined") {
        result = await models.Product.findAll({
          where: { isForSale: true },
          include: [
            { model: models.ProductCategory },
            { model: models.ItemPrice },
            { model: models.Inventory },
            { model: models.PharmacyStock },
          ],
          order: [["productId", "ASC"]]
        });
      } else if (searchText) {
        result = await models.Drug.findAll({
          where: {
            [Op.or]: [
              {
                drugName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                genericName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                nationalDrugCode: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                countryOfOrigin: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                description: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                packaging: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                drugStrength: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
            ],
          },
          include: [
            {
              model: models.DrugCategroy,
              where: {
                [Op.or]: [
                  {
                    categoryName: {
                      [Op.iLike]: `%${searchText}%`,
                    },
                  },
                ],
              },
            },
            models.Manufacturer,
            models.Supplier,
            models.DrugRoute,
            {
              model: models.PharmacyStock,
              include: [models.ItemPrice, models.Inventory],
            },
          ],
          order: [["drugId", "ASC"]],
          limit: 100,
        });
      } else {
        result = await models.Drug.findAll({
          include: [
            {
              model: models.DrugCategroy,
            },
            models.Manufacturer,
            models.Supplier,
            models.DrugRoute,
            {
              model: models.PharmacyStock,
              include: [models.ItemPrice, models.Inventory],
            },
          ],
          order: [["drugId", "ASC"]],
        });
      }
      res.send(result);
    } catch (error) {
      console.log(error)
      logError(error, req)
    }
  });

  router.post("/Drug", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.drugId) {
        result = await models.Drug.update(data, {
          where: { drugId: rawdata.drugId },
        });
      } else {
        result = await models.Drug.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/pharmacystock", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText === "undefined") {
        result = await models.PharmacyStock.findAll({
          include: [{ model: models.Product, include: [models.ProductType] }, models.ItemPrice],
          left: true,
          order: [["quantityAvailable", "ASC"]]
        });
      } else if (searchText) {
        result = await models.PharmacyStock.findAll({
          include: [
            {
              model: models.Product,
              left: true,
              where: {
                [Op.or]: [
                  {
                    productName: { [Op.iLike]: `%${searchText}%` }
                  }
                ]
              },
              include: [models.ProductType]
            },
            {
              model: models.ItemPrice
            }
          ],
          order: [["stockId", "ASC"]],
        });
      } else {
        result = await models.PharmacyStock.findAll({
          include: [models.Product, models.ItemPrice],
          order: [["stockId", "ASC"]],
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/DrugStock", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    let productTypeId = parseInt(1);
    try {
      if (searchText === "undefined") {
        result = await models.PharmacyStock.findAll({
          include: [
            {
              model: models.Product,
              where: { isForSale: true }
            },
            {
              model: models.DrugProduct,
              include: [
                { model: models.Drug, include: [{ model: models.DrugCategroy }] },
              ]
            }
          ],
          order: [["stockId", "ASC"]],
        });
      } else if (searchText) {
        result = await models.PharmacyStock.findAll({
          include: [
            {
              model: models.DrugProduct,
              right: true,
              include: [
                {
                  model: models.Drug,
                  where: {
                    [Op.or]: [
                      {
                        drugName: {
                          [Op.iLike]: `%${searchText}%`,
                        },
                      },
                      {
                        genericName: {
                          [Op.iLike]: `%${searchText}%`,
                        },
                      },
                      {
                        nationalDrugCode: {
                          [Op.iLike]: `%${searchText}%`,
                        },
                      },
                      {
                        countryOfOrigin: {
                          [Op.iLike]: `%${searchText}%`,
                        },
                      },
                      {
                        description: {
                          [Op.iLike]: `%${searchText}%`,
                        },
                      },
                      {
                        packaging: {
                          [Op.iLike]: `%${searchText}%`,
                        },
                      },
                      {
                        drugStrength: {
                          [Op.iLike]: `%${searchText}%`,
                        }
                      }
                    ]
                  }
                }
              ]
            },
            {
              model: models.Product,
              where: { isForSale: true },
            }
          ],
          order: [["stockId", "ASC"]],
        });
      } else {
        result = await models.PharmacyStock.findAll({
          include: [
            {
              model: models.Product,
              where: { isForSale: true }
            },
            {
              model: models.DrugProduct,
              include: [{ model: models.Drug }]
            }
          ]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });
  //WE WANT THIS
  router.get("/expiredstock", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      result = await models.ReceivedPharmacyStock.findAll({
        include: [{ model: models.Product, include: [models.ProductType] }],
        order: [["createDate", "DESC"]]
      });
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/receivedpharmacystock", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText === "undefined") {
        result = await models.ReceivedPharmacyStock.findAll({
          include: [models.Product],
          order: [["createDate", "DESC"]]
        });
      } else if (searchText) {
        result = await models.ReceivedPharmacyStock.findAll({
          include: [{ model: models.Product }],
          order: [["createDate", "DESC"]]
        });
      } else {
        result = await models.ReceivedPharmacyStock.findAll({
          include: [models.Product],
          order: [["createDate", "DESC"]]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/receivedpharmacystock", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      for (let i = 0; i < data.productItems.length; i++) {
        product = data.productItems[i];
        if (rawdata.receivedStockId) {
          result = await models.ReceivedPharmacyStock.update(product, {
            where: { receivedStockId: rawdata.receivedStockId },
          });
        } else {
          result = await sequelize.transaction(async (t) => {
            await models.ReceivedPharmacyStock.create(
              {
                batchNumber: product.batchNumber,
                productId: product.productId,
                stockRequestItemId: product.stockRequestItemId,
                quantityReceived: product.quantityReceived,
                quantityAvailable: product.quantityReceived,
                createdBy: data.createdBy,
              },
              { transaction: t }
            );
            let stock = await models.PharmacyStock.findOne({
              where: { productId: product.productId },
            });
            if (stock) {
              await models.PharmacyStock.update(
                {
                  batchNumber: product.batchNumber,
                  quantityAvailable: stock.quantityAvailable + product.quantityReceived,
                  updatedBy: data.createdBy,
                },
                {
                  where: { productId: product.productId },
                },
                { transaction: t }
              );
            } else {
              await models.PharmacyStock.create(
                {
                  batchNumber: product.batchNumber,
                  quantityAvailable: product.quantityReceived,
                  createdBy: data.createdBy,
                  createDate: new Date(),
                  productId: product.productId,
                  needsReorder: false,
                },
                { transaction: t }
              );
            }
          });
        }
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  }
  );
  /* Pharmacy End Point */

  //INCOME
  router.get("/income", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.Income.findAll({
          where: {
            description: {
              [Op.iLike]: `%${searchText}%`,
            },
          },
          include: [models.IncomeType],
          order: [["dateRecieved", "DESC"]]
        });
      } else {
        result = await models.Income.findAll({
          include: [models.IncomeType],
          order: [["dateRecieved", "DESC"]]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req);
    }
  });

  router.post("/income", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (data.incomeId) {
        data.updatedBy = req.session.passport.user.staffId;
        result = await models.Income.update(data, {
          where: { incomeId: data.incomeId },
        });
      } else {
        data.createdBy = req.session.passport.user.staffId;
        data.receivedBy = req.session.passport.user.fullName;
        data.dateRecorded = new Date();
        result = await models.Income.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/incometypes", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.IncomeType.findAll({
          where: {
            incomeTypeName: {
              [Op.iLike]: `%${searchText}%`,
            },
          },
        });
      } else {
        result = await models.IncomeType.findAll();
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/incometypes", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (data.incomeTypeId) {
        result = await models.IncomeType.update(data, {
          where: { incomeTypeId: data.incomeTypeId },
        });
      } else {
        result = await models.IncomeType.create(data);
      }

      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  //EXPENDITURE
  router.get("/expense", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.findAll({
          where: {
            description: {
              [Op.iLike]: `%${searchText}%`,
            },
          },
          include: [models.ExpenseType],
          order: [["dateSpent", "DESC"]]
        });
      } else {
        result = await models.Expense.findAll({
          include: [models.ExpenseType],
          order: [["dateSpent", "DESC"]]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/expense", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      console.log(data);
      if (rawdata.expenseId) {
        data.updatedBy = req.session.passport.user.staffId;
        data.dateUpdated = new Date();
        result = await models.Expense.update(data, {
          where: { expenseId: data.expenseId },
        });
      } else {
        data.createdBy = req.session.passport.user.staffId;
        result = await models.Expense.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/expensetypes", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.ExpenseType.findAll({
          where: { expenseTypeName: { [Op.iLike]: `%${searchText}%` } }
        });
      } else {
        result = await models.ExpenseType.findAll();
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/expensetypes", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.expenseTypeId) {
        result = await models.ExpenseType.update(data, {
          where: { testId: rawdata.expenseTypeId },
        });
      } else {
        result = await models.ExpenseType.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/radiologytests", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.RadiologyTest.findAll({
          where: { testName: { [Op.iLike]: `%${searchText}%` } }
        });
      } else {
        result = await models.RadiologyTest.findAll();
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/createRadiologyTest", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.testId) {
        result = await models.RadiologyTest.update(data, {
          where: { testId: rawdata.testId },
        });
      } else {
        result = await models.RadiologyTest.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/loadRadiologyTestOrders", auth.authenticate, async function (req, res, next) {
    let id = req.query.clientId;
    let result;
    try {
      if (!isNaN(id)) {
        result = await models.RadiologyTestOrder.findAll({
          include: [
            models.Client,
            models.RadiologyTest,
            models.ClientBillItem,
            {
              model: models.RadiologyTestResult,
              include: [{ model: models.Staff }],
            },
          ],
          where: { clientId: id },
        });
      } else {
        result = await models.RadiologyTestOrder.findAll({
          include: [
            models.Client,
            models.RadiologyTest,
            models.ClientBillItem,
            {
              model: models.RadiologyTestResult,
              include: [{ model: models.Staff }]
            }
          ]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/loadRadiologyTestOrderClients", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.Client.findAll({
          include: {
            model: models.RadiologyTestOrder,
            right: true,
            include: [
              { model: models.ClientBillItem },
              { model: models.Visit }
            ]
          },
          where: {
            [Op.or]: [
              {
                firstName: { [Op.iLike]: `%${searchText}%` }
              },
              {
                lastName: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          }
        });
      } else {
        result = await models.Client.findAll({
          include: {
            model: models.RadiologyTestOrder,
            right: true,
            include: [
              { model: models.ClientBillItem },
              {
                model: models.Visit,
              },
            ],
          },
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/radiologyresults", auth.authenticate, async function (req, res, next) {
    let searchItem = req.query.searchText;
    let id = req.query.orderId;
    let visitId = req.query.visitId;
    let result;
    try {
      if (!isNaN(id)) {
        result = await models.RadiologyTestResult.findOne({
          include: {
            model: models.RadiologyTestOrder,
            where: { orderId: id },
            include: [models.RadiologyTest, models.Client],
          },
          order: [["createDate", "DESC"]],
        });
      } else if (!isNaN(visitId)) {
        result = await models.RadiologyTestResult.findAll({
          include: {
            model: models.RadiologyTestOrder,
            where: { visitId: visitId },
            include: [models.RadiologyTest, models.Client],
          },
          order: [["createDate", "DESC"]],
        });
      } else {
        result = await models.RadiologyTestResult.findAll({
          include: [
            {
              model: models.RadiologyTestOrder,
              include: [models.RadiologyTest, models.Client],
            },
          ],
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/radiologyresult", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      result = await sequelize.transaction(async (t) => {
        if (rawdata.resultId) {
          await models.RadiologyTestResult.update(
            data,
            { where: { resultId: rawdata.resultId } },
            { transaction: t }
          );
          await models.RadiologyTestOrder.update(
            { isComplete: true },
            { where: { orderId: rawdata.orderId } },
            { transaction: t }
          );
        } else {
          await models.RadiologyTestResult.create(data, { transaction: t });
          await models.RadiologyTestOrder.update(
            { isComplete: true },
            { where: { orderId: rawdata.orderId } },
            { transaction: t }
          );
        }
      });
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });
  /* Radiology End Point */
  router.get("/loadLabTestOrders", auth.authenticate, async function (req, res, next) {
    let id = req.query.clientId;
    let labTestOrder;
    try {
      if (id === "undefined") {
        labTestOrder = await models.LabTestOrder.findAll({
          include: [{ model: models.LabTest, include: [models.LabTestType] }, models.Client, models.ClientBillItem, models.ClinicalStaff, models.LabOrderStatus],
        });
      } else if (id) {
        labTestOrder = await models.LabTestOrder.findAll({
          include: [models.Client, { model: models.LabTest, include: [models.LabTestType] }, models.ClientBillItem, models.ClinicalStaff, models.LabOrderStatus],
          where: { clientId: id },
        });
      } else {
        labTestOrder = await models.LabTestOrder.findAll({
          include: [{ model: models.LabTest, include: [models.LabTestType] }, models.Client, models.ClientBillItem, models.ClinicalStaff, models.LabOrderStatus],
        });
      }
      res.send(labTestOrder);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/loadLabTestOrderClients", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let labTestOrderClient;
    try {
      if (searchText !== "undefined") {
        labTestOrderClient = await models.Client.findAll({
          include: {
            model: models.LabTestOrder,
            right: true,
            include: [models.ClientBillItem],
          },
          where: {
            [Op.or]: [
              {
                firstName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                lastName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
            ],
          },
        });
      } else {
        labTestOrderClient = await models.Client.findAll({
          include: {
            model: models.LabTestOrder,
            right: true,
            include: [models.ClientBillItem],
          },
        });
      }
      res.send(labTestOrderClient);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/loadLabTestResults", auth.authenticate, async function (req, res, next) {
    let searchItem = req.query.searchText;
    let id = req.query.orderId;
    let testresults;
    try {
      if (id) {
        testresults = await models.LabTestResult.findOne({
          include: {
            model: models.LabTestOrder,
            where: { orderId: id },
            include: [models.LabTest, models.Client],
          },
        });
      } else if (id === "undefined") {
        testresults = await models.LabTestResult.findAll({
          include: [
            {
              model: models.LabTestOrder,
              include: [models.LabTest, models.Client],
            },
          ],
        });
      } else {
        testresults = await models.LabTestResult.findAll({
          include: [
            {
              model: models.LabTestOrder,
              include: [models.LabTest, models.Client],
            },
          ],
        });
      }
      res.send(testresults);
    } catch (error) {
      logError(error, req);
    }
  });

  router.get("/loadLabTestTypes", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let labtesttypes;
    try {
      if (searchText === "undefined") {
        labtesttypes = await models.LabTestType.findAll();
      } else if (searchText) {
        labtesttypes = await models.LabTestType.findAll({
          where: {
            [Op.or]: [
              {
                testTypeName: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          }
        });
      } else {
        labtesttypes = await models.LabTestType.findAll();
      }
      res.send(labtesttypes);
    } catch (error) {
      logError(error, req)
    }
  });
  router.post("/createLabTestType", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) { if (rawdata[key] !== "") { data[key] = rawdata[key]; } }
      if (rawdata.testTypeId) {
        result = await models.LabTestType.update(data, {
          where: { testTypeId: rawdata.testTypeId },
        });
      } else {
        result = await models.LabTestType.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req);
    }
  });
  router.get("/laborderstatus", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let labtesttypes;
    try {
      if (searchText === "undefined") {
        labtesttypes = await models.LabOrderStatus.findAll();
      } else if (searchText) {
        labtesttypes = await models.LabOrderStatus.findAll({
          where: {
            [Op.or]: [
              {
                status: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          }
        });
      } else {
        labtesttypes = await models.LabOrderStatus.findAll();
      }
      res.send(labtesttypes);
    } catch (error) {
      logError(error, req);
    }
  });
  router.post("/laborderstatus", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (data.labOrderStatusId) {
        result = await models.LabOrderStatus.update(data, {
          where: { labOrderStatusId: data.labOrderStatusId },
        });
      } else {
        result = await models.LabOrderStatus.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/loadLabTests", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let labtests;
    try {
      if (searchText === "undefined") {
        labtests = await models.LabTest.findAll({
          include: [models.LabTestType]
        });
      } else if (searchText) {
        labtests = await models.LabTest.findAll({
          where: {
            [Op.or]: [
              {
                testName: { [Op.iLike]: `%${searchText}%` }
              },
              {
                testContent: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          },
          include: [models.LabTestType]
        });
      } else {
        labtests = await models.LabTest.findAll({ include: [models.LabTestType] });
      }
      res.send(labtests);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/createLabTest", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.testId) {
        result = await models.LabTest.update(data, {
          where: { testId: rawdata.testId },
        });
      } else {
        result = await models.LabTest.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/clinicalservice", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let id = req.query.id;
    let results;
    try {
      if (!isNaN(id)) {
        results = await models.ClinicalService.findAll({
          where: { clinicalAreaId: id },
        });
      } else if (searchText !== "undefined") {
        results = await models.ClinicalService.findAll({
          where: {
            [Op.or]: [
              {
                clinicalServiceName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
            ],
          },
          include: [models.ClinicalArea],
        });
      } else {
        results = await models.ClinicalService.findAll({
          include: [models.ClinicalArea],
        });
      }
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/clinicalservice", async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) { if (rawdata[key] !== "") { data[key] = rawdata[key]; } }
      if (rawdata.clinicalServiceId) {
        result = await models.ClinicalService.update(data, {
          where: { clinicalServiceId: rawdata.clinicalServiceId },
        });
      } else {
        result = await models.ClinicalService.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });
  router.get("/clinicalservicecategory", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let results;
    try {
      if (searchText !== "undefined") {
        results = await models.ClinicalServiceCategory.findAll({
          where: {
            [Op.or]: [
              {
                serviceCategoryName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
            ],
          },
        });
      } else {
        results = await models.ClinicalServiceCategory.findAll();
      }
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  }
  );
  router.post("/clinicalservicecategory", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.clinicalServiceCategoryId) {
        result = await models.ClinicalServiceCategory.update(data, {
          where: {
            clinicalServiceCategoryId: rawdata.clinicalServiceCategoryId,
          },
        });
      } else {
        result = await models.ClinicalServiceCategory.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  }
  );
  router.get("/clinicalservicearea", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let id = req.query.id;
    let results;
    try {
      if (!isNaN(id)) {
        results = await models.ClinicalArea.findAll({
          where: { clinicalAreaId: id },
        });
      } else if (searchText !== "undefined") {
        results = await models.ClinicalArea.findAll({
          where: {
            [Op.or]: [
              {
                clinicalAreaName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
            ],
          },
          include: [models.ClinicalServiceCategory],
        });
      } else {
        results = await models.ClinicalArea.findAll({ include: [models.ClinicalServiceCategory] });
      }
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  });
  router.post("/clinicalservicearea", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.clinicalAreaId) {
        result = await models.ClinicalArea.update(data, {
          where: { clinicalAreaId: rawdata.clinicalAreaId },
        });
      } else {
        result = await models.ClinicalArea.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });
  router.post("/clinicalsupportservice", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      for (i = 0; i < rawdata.selectedServices.length; i++) {
        let selected = rawdata.selectedServices[i];
        result = await sequelize.transaction(async (t) => {
          await models.ClinicalSupportService.create(
            {
              clinicalServiceId: selected.clinicalServiceId,
              clientId: rawdata.data.clientId,
              visitId: rawdata.data.visitId,
              clinicalNotes: rawdata.data.clinicalNotes,
              createdBy: rawdata.createdBy,
            },
            { transaction: t }
          );

          let clinicalServiceRecord = await models.ClinicalService.findOne(
            { where: { clinicalServiceId: selected.clinicalServiceId } },
            { transaction: t }
          );
          let clinicalAreaRecord = await models.ClinicalArea.findOne(
            {
              where: { clinicalAreaId: clinicalServiceRecord.clinicalAreaId },
            },
            { transaction: t }
          );
          let billRecord = await models.ClientBill.findOne(
            {
              where: {
                [Op.and]: [
                  { clientId: rawdata.data.clientId },
                  { visitId: rawdata.data.visitId },
                ],
              },
            },
            { transaction: t }
          );
          await models.ClientBillItem.create(
            {
              billId: billRecord.billId,
              quantity: 1,
              amount: clinicalServiceRecord.serviceFee,
              billItemName:
                clinicalAreaRecord.clinicalAreaName +
                "/" +
                clinicalServiceRecord.clinicalServiceName,
              billNote: "Clinical Support Services",
              createdBy: rawdata.createdBy,
            },
            { transaction: t }
          );
        });
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      logError(err, req)
    }
  });

  //PRICING
  router.get("/pricedcategory", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let results;
    try {
      let category = parseInt(req.query.category);
      if (category === 'Service') {
        results = await models.Service.findAll();
      } else if (category === 'Product') {
        results = await models.Product.findAll({
          where: { isForSale: true },
          include: [{ model: models.ProductType }]
        });
      } else if (category === 'Package') {
        results = await models.Package.findAll();
      } else if (category === 'Other') {
        results = {}
      }
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/priceditems", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let results;
    try {
      let typeId = parseInt(req.query.typeId);
      if (typeId) {
        results = await models.Product.findAll({
          where: { productTypeId: typeId },
          include: [
            { model: models.ProductType }
          ]
        });
      }
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/itemprice", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let results;
    try {
      if (searchText !== "undefined") {
        results = await models.ItemPrice.findAll({
          include: [
            {
              model: models.ProductType,
              left: true,
              where: { isForSale: true },
              include: [models.ProductType]
            },
            {
              model: models.Product,
              where: {
                [Op.or]: [
                  {
                    productName: { [Op.iLike]: `%${searchText}%` }
                  },
                  {
                    description: { [Op.iLike]: `%${searchText}%` }
                  }
                ]
              }
            },
            {
              model: models.Service
            }
          ]
        });
      } else {
        results = await models.ItemPrice.findAll({
          include: [
            {
              model: models.ProductType,
              left: true
            },
            {
              model: models.Product,
              where: { isForSale: true },
              include: [models.ProductType]
            },
            {
              model: models.Service
            }
          ]
        });
      }
      res.send(results);
    } catch (error) {
      logError(error, req);
    }
  });

  router.post("/itemprice", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") { data[key] = rawdata[key]; }
      }
      if (rawdata.priceId) {
        result = await models.ItemPrice.update(
          {
            price: data.price,
            productId: data.productId,
            productTypeId: data.productTypeId,
            updateDate: new Date(),
            updatedBy: data.createdBy,
          },
          { where: { priceId: data.priceId } }
        );
      } else {
        result = await models.ItemPrice.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  //CLIENT BILLING
  router.get("/billedclients", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let results;
    try {
      if (searchText !== "undefined") {
        results = await models.Client.findAll({
          include: [{ model: models.ClientBill, right: true }],
          where: {
            [Op.or]: [
              {
                firstName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
              {
                lastName: {
                  [Op.iLike]: `%${searchText}%`,
                },
              },
            ],
          },
        });
      } else {
        results = await models.Client.findAll({
          include: [
            {
              model: models.ClientBill,
            },
          ],
        });
      }
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  });
  router.get("/clientbill", auth.authenticate, async function (req, res, next) {
    try {
      let clientId = parseInt(req.query.clientId);
      let billId = parseInt(req.query.billId);
      let billRecordId = parseInt(req.query.billRecordId);
      let results;
      if (!isNaN(clientId)) {
        results = await models.ClientBill.findAll({
          where: { clientId: clientId },
          include: [
            models.Client,
            { model: models.ClientBillItem, include: [models.ClientBillPayment] },
          ],
          order: [['createDate', 'DESC']]
        });
      } else {
        results = await models.ClientBill.findAll({
          include: [
            { model: models.Client },
            { model: models.ClientBillItem, include: [models.ClientBillPayment] },
            { model: models.Visit }
          ],
          order: [['createDate', 'DESC']]
        });
      }
      if (!isNaN(billId)) {
        results = await models.ClientBillItem.findAll({
          where: { billId: billId },
          include: [models.ClientBillPayment],
          order: [['createDate', 'DESC']]
        });
      }
      if (!isNaN(billRecordId)) {
        results = await models.ClientBill.findOne({
          where: { billId: billRecordId },
          include: [
            { model: models.ClientBillItem, include: [models.ClientBillPayment] }
          ]
        });
      }
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/clientbill", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      rawdata.createdBy = req.session.passport.user.staffId;
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.billId) {
        result = await models.ClientBill.update(
          {
            //itemType: data.itemType
          },
          { where: { billId: data.billId } }
        ); //PENDING
      } else {
        result = await models.ClientBill.create(data);
      }
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send(
        "Sorry. Something happened on the server. Contact System Admin. "
      );
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/clientbillitem", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let results;
    try {
      if (searchText !== "undefined") {
        results = await models.ClientBillItem.findAll();
      } else {
        results = await models.ClientBillItem.findAll();
      }
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  }
  );
  router.post("/clientbillitem", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      if (rawdata.billItemId) {
        result = await models.ClientBillItem.update(
          {
            //itemType: data.itemType
          },
          { where: { billItemId: data.billItemId } }
        ); //PENDING
      } else {
        result = await models.ClientBillItem.create(data);
      }

      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req);
    }
  });

  router.get("/clientbillpayment", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let results;
    try {
      results = await models.ClientBillPayment.findAll();
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  });
  router.post("/clientbillpayment", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      let receiptRecord = {};
      receiptRecord.data = rawdata;
      result = await sequelize.transaction(async (t) => {
        let amountReceived = rawdata.amountReceived;
        let billId = rawdata.selectedBills[0].billId;
        let receipt = await models.ClientBillPaymentReceipt.create(
          {
            billId: billId,
            amountReceived: rawdata.amountReceived,
            createdBy: data.createdBy
          },
          { transaction: t }
        );
        receiptRecord.receipt = receipt.dataValues;
        receiptRecord.receipt.Staff = await models.Staff.findOne({
          where: { staffId: rawdata.createdBy },
        });
        for (let i = 0; i < rawdata.selectedBills.length; i++) {
          let billRecord = rawdata.selectedBills[i];
          //console.log(billRecord);
          let receivedAmount;
          let balanceAmount;
          if (billRecord.balanceAmount <= amountReceived) {
            receivedAmount = billRecord.balanceAmount;
            amountReceived -= billRecord.balanceAmount;
            balanceAmount = 0;
          } else {
            receivedAmount = amountReceived;
            balanceAmount = billRecord.balanceAmount - amountReceived;
          }
          if (billRecord.ClientBillPayment !== null) {
            await models.ClientBillPayment.update(
              {
                amountReceived: receivedAmount + billRecord.ClientBillPayment.amountReceived,
                billBalance: balanceAmount,
                receiptId: receipt.receiptId
              },
              {
                where: { billpaymentId: billRecord.ClientBillPayment.billpaymentId }
              },
              { transaction: t }
            ); //PENDING
          } else {
            await models.ClientBillPayment.create(
              {
                billItemId: billRecord.billItemId,
                receiptId: receipt.receiptId,
                paymentMethodId: rawdata.paymentMethodId,
                amountReceived: receivedAmount,
                billBalance: balanceAmount,
                createdBy: rawdata.createdBy,
                paidBy: rawdata.paidBy,
              },
              { transaction: t }
            );
            await models.Income.create(
              {
                incomeTypeId: 5,//CLIENT BILLS
                incomeSource: 'CLIENT BILL PAYMENT',
                amountReceieved: receivedAmount,
                description: billRecord.quantity + ' ' + billRecord.billNote,
                dateRecieved: new Date(),
                dateRecorded: new Date(),
                receivedBy: req.session.passport.user.fullName,
                createdBy: req.session.passport.user.staffId
              },
              { transaction: t }
            );
          }
          if (balanceAmount <= 0) {
            await models.ClientBillItem.update(
              { isPaid: true, updatedBy: rawdata.createdBy },
              { where: { billItemId: billRecord.billItemId } },
              { transaction: t }
            );
          }
        }
      });
      console.log(data);
      res.send({ status: "OK", data: receiptRecord });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/visitreason", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let results;
    try {

      results = await models.VisitReason.findAll();
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  }
  );
  router.post("/visitreason", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      result = await sequelize.transaction(async (t) => {
        if (data.visitReasonId) {
          rawdata.updatedBy = req.session.passport.user.staffId;
          await models.VisitReason.update(
            data,
            { where: { visitReasonId: data.visitReasonId } },
            { transaction: t }
          );
        } else {
          rawdata.createdBy = req.session.passport.user.staffId;
          await models.VisitReason.create(data, { transaction: t });
        }
      });
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  }
  );

  router.get("/paymentmethod", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let results;
    try {
      results = await models.PaymentMethod.findAll();
      res.send(results);
    } catch (error) {
      logError(error, req)
    }
  });
  router.post("/paymentmethod", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      result = await sequelize.transaction(async (t) => {
        if (data.visitReasonId) {
          await models.PaymentMethod.update(
            data,
            { where: { paymentMethodId: data.paymentMethodId } },
            { transaction: t }
          );
        } else {
          await models.PaymentMethod.create(data, { transaction: t });
        }
      });
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.post("/endvisit", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    rawdata.createdBy = req.session.passport.user.staffId;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      result = await sequelize.transaction(async (t) => {
        await models.Visit.update(
          { isActive: false },
          { where: { visitId: data.visitId } },
          { transaction: t }
        );
      });
      res.send({ status: "OK", data: result });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/branch", auth.authenticate, async function (req, res) {
    try {
      let userData = req.session.passport.user;
      let branch = await models.Branch.findAll({ where: { healthUnitId: userData.healthUnitId } });
      res.send(branch);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/branch", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let userData = req.session.passport.user;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") { data[key] = rawdata[key]; }
      }
      data.healthUnitId = req.session.passport.user.healthUnitId;
      result = await sequelize.transaction(async (t) => {
        if (data.branchId) {
          await models.Branch.update(
            data,
            {
              where: {
                branchId: data.branchId,
                healthUnitId: data.healthUnitId,
              },
            },
            { transaction: t }
          );
        } else {
          await models.Branch.create(data, { transaction: t });
        }
      });
      res.send({ status: "OK" });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req);
    }
  });

  router.get("/clinicalexamination", auth.authenticate, async function (req, res) {
    let visitId = req.query.VisitId;
    let result;
    try {
      let userData = req.session.passport.user;
      if (!isNaN(parseInt(visitId))) {
        result = await models.ClinicalExamination.findOne({
          where: { visitId: visitId }
        });
      } else {
        result = await models.ClinicalExamination.findAll();
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.post("/clinicalexamination", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let userData = req.session.passport.user;
    let data = {};
    try {
      let result;
      for (key in rawdata) { if (rawdata[key] !== "") { data[key] = rawdata[key]; } }
      data.healthUnitId = req.session.passport.user.healthUnitId;
      result = await sequelize.transaction(async (t) => {
        if (data.examinationId) {
          await models.ClinicalExamination.update(
            data,
            {
              where: {
                examinationId: data.examinationId,
                visitId: data.visitId,
              }
            },
            { transaction: t }
          );
        } else {
          await models.ClinicalExamination.create(data, { transaction: t });
        }
      });
      res.send({ status: "OK" });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req);
    }
  });

  router.post("/department", auth.authenticate, async function (req, res, next) {
    let rawdata = req.body;
    let userData = req.session.passport.user;
    let data = {};
    try {
      let result;
      for (key in rawdata) {
        if (rawdata[key] !== "") {
          data[key] = rawdata[key];
        }
      }
      data.healthUnitId = userData.healthUnitId;
      result = await sequelize.transaction(async (t) => {
        if (data.departmentId) {
          await models.Department.update(
            data,
            {
              where: {
                departmentId: data.departmentId,
                branchId: data.branchId,
              },
            },
            { transaction: t }
          );
        } else {
          await models.Department.create(data, { transaction: t });
        }
      });
      res.send({ status: "OK" });
    } catch (err) {
      res.status(400).send("Sorry. Something happened on the server. Contact System Admin. ");
      console.log(err);
      logError(err, req)
    }
  });

  router.get("/clientvisithistory", auth.authenticate, async function (req, res, next) {
    let searchText = req.query.searchText;
    let result;
    try {
      if (searchText !== "undefined") {
        result = await models.Client.findAll({
          attributes: ["clientId", "firstName", "lastName"],
          where: {
            [Op.or]: [
              {
                firstName: { [Op.iLike]: `%${searchText}%` }
              },
              {
                lastName: { [Op.iLike]: `%${searchText}%` }
              }
            ]
          },
          include: [
            {
              model: models.Visit,
              right: true,
              where: { isActive: false },
            },
          ],
        });
      } else {
        result = await models.Client.findAll({
          attributes: ["clientId", "firstName", "lastName"],
          include: [
            {
              model: models.Visit,
              right: true,
              where: { isActive: true },
            }
          ]
        });
      }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  router.get("/visit", auth.authenticate, async function (req, res, next) {
    let id = req.query.visitId;
    let result;
    try {
      if (!isNaN(id)) {
        result = await models.Visit.findOne({
          where: { visitId: id, },
          include: [
            {
              model: models.Branch,
            },
            {
              model: models.VisitReason,
            },
            {
              model: models.LabTestOrder,
              include: [
                { model: models.LabTestResult, include: [models.Staff] },
                models.LabTest, models.Staff],
            },
            {
              model: models.RadiologyTestOrder,
              include: [models.RadiologyTest, models.RadiologyTestResult],
            },
            {
              model: models.Diagnosis,
              include: [models.ShortDiagnosis],
            },
            {
              model: models.ClinicalExamination
            },
            {
              model: models.ClientVitals,
            },
            {
              model: models.Prescription,
              include: [models.Product],
            }
          ]
        });
      } else { result = await models.Visit.findAll(); }
      res.send(result);
    } catch (error) {
      logError(error, req)
    }
  });

  return router;
};
