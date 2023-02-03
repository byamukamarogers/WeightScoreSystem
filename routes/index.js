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

  router.get("/subjects", function (req, res, next) {
    //loader here.
    res.sendFile(path.join(__dirname, "../public/Subject", "Subject.html"));
  });

  router.get("/register", function (req, res, next) {
    //loader here.
    res.sendFile(path.join(__dirname, "../public/student", "student.html"));
  });

  router.get("/addprogram", function (req, res, next) {
    //loader here.
    res.sendFile(path.join(__dirname, "../public/programs", "addprograms.html"));
  });

  router.get("/program", function (req, res, next) {
    //loader here.
    res.sendFile(path.join(__dirname, "../public/programs", "programs.html"));
  });
  router.get("/apply", function (req, res, next) {
    //loader here.
    res.sendFile(path.join(__dirname, "../public/applications", "application.html"));
  });
  router.get("/applications", function (req, res, next) {
    //loader here.
    res.sendFile(path.join(__dirname, "../public/applications", "applicationlist.html"));
  });

  return router;
};
