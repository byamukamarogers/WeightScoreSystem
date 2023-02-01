const express = require('express');
const router = express.Router();
module.exports = function (passport) {
    /* GET users listing. */
    router.get('/', function (req, res, next) {
        res.send('respond with a resource');
    });
    return router;
}
