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

//SEQUELIZE TRANSACTION
const config = require("../config");
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

  return router;
};
