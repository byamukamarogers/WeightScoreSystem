const express = require('express');
const router = express.Router();
const controller = require('../controllers/UserController');
module.exports = function (passport) {
    /* GET users listing. */
    router.get('/', function (req, res, next) {
        res.send('respond with a resource');
    });
    router.get('/currentuser', controller.getCurrentUser);
    router.get('/logout', controller.logout);
    return router;
}
