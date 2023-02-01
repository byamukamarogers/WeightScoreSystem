const models = require('../models/index');
module.exports = {
    getCurrentUser: async function(req,res){
        let user;
        if(req.session.passport){
            user = req.session.passport.user;
        }
        return res.json(user);
    },

    logout: function(req,res){
        req.session.destroy();
        res.send(true);
    }
}