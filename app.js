require('dotenv').config({ path: __dirname + '/.env' })
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
//var logger = require("morgan");
//const morganMiddleware = require("./utils/morgan.middleware");

const logger = require("./utils/logger");

const bodyParser = require('body-parser')
const multer = require('multer');

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

//app.use(morganMiddleware);
app.use(bodyParser.urlencoded({ extended: true }))
/**Passport stuff */
const session = require("express-session");
const passport = require("passport");
const authentication = require("./utils/authentication");

app.use(session({ secret: "R3CareSystem_2023", resave: false, saveUninitialized: false, }));
authentication(passport);
app.use(passport.initialize());
app.use(passport.session());
/** End of Passport stuff */

//app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/", indexRouter(passport));
app.use("/users", usersRouter(passport));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  //next(createError(404));
  res.status(404).sendFile(path.join(__dirname, "views/404.html"))
});

app.use(express.json({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  logger.error(err);
  // render the error page
  res.status(err.status || 500);
  res.send(err);
});

module.exports = app;
