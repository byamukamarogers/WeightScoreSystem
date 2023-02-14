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

  router.get("/schoollist", function (req, res, next) {
    //loader here.
    res.sendFile(path.join(__dirname, "../public/school", "school.html"));
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
  router.get("/schools", async function (req, res, next) {
    //loader here.
    let data;
    try {
      data = await models.School.findAll();
      res.status(200).json(
        {
          success: true,
          data: data
        }
      );
    } catch (error) {
      console.log(error)

    }
  });

  router.post("/student", async function (req, res, next) {
    //loader here.
    let data = req.body;
    console.log(data);
    try {
      await sequelize.transaction(async (t) => {
        let student = await models.Student.create(data, { transaction: t });

        let choices = data.choices;
        let choiceLevel = 0;
        for (let i = 0; i < choices.length; i++) {
          choiceLevel += 1;
          if (!isNaN(parseInt(choices[i]))) {
            await models.Choice.create(
              { studentId: student.studentId, schoolId: choices[i], choiceLevel: choiceLevel },
              { transaction: t }
            );
          }
        }

        data = await models.Choice.findAll();
        res.status(200).json(
          {
            success: true,
            data: data
          }
        );
      });
    } catch (error) {
      console.log(error)

    }
  });

  router.post("/school", async function (req, res, next) {
    let data = req.body;
    try {
      await sequelize.transaction(async (t) => {
        let school = await models.School.create(data, { transaction: t });
        res.status(200).json(
          {
            success: true
          }
        );
      });
    } catch (error) {
      console.log(error)
    }
  });

  router.get("/admissionlist", async function (req, res, next) {

    res.sendFile(path.join(__dirname, "../public/AdmissionList", "AdmissionList.html"));
  });

  router.get("/admissions", async function (req, res, next) {
    let schoolId = req.query.schoolId
    let data;
    try {
      if (!isNaN(parseInt(schoolId))) {
        let school = await models.School.findOne({ where: { schoolId: schoolId } })
        data = await models.Choice.findAll({
          include: [
            models.Student,
            {
              model: models.School,
              where: { schoolId: schoolId }
            }
          ],
          order: [
            [models.School, 'schoolName', 'ASC'],
            ['choiceLevel', 'ASC'],
            [models.Student, 'aggregate', 'ASC']
          ],
          limit: school.noOfStudents
        })
      }
      res.status(200).json({
        success: true,
        data: data
      })
    } catch (error) {
      console.log(error)
    }
  });

  return router;
};
