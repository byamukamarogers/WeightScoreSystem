var nodemailer = require("nodemailer");

async function securityMail(receiver, subject, message) {
    var transporter = nodemailer.createTransport({
      pool: true,
      host: "swaelug.com",
      port: 465,
      secure: true, // use TLS
      auth: {
        user: "test@swaelug.com",
        pass: "DwXeEnFpDFw4Rzh",
      },
    });

    var mailOptions = {
      from: "test@swaelug.com",//CHANGE THIS
      to: receiver,
      subject: subject,
      text:message
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        return false;
      } else {
        return true;
      }
    });
  }
