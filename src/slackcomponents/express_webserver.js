var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var debug = require('debug')('botkit:webserver');
var http = require('http');
var hbs = require('express-hbs');

module.exports = function(controller) {

    var webserver = express();
    webserver.use(function(req, res, next) {
        req.rawBody = '';

        req.on('data', function(chunk) {
            req.rawBody += chunk;
        });

        next();
    });
    webserver.use(cookieParser());
    webserver.use(bodyParser.json());
    webserver.use(bodyParser.urlencoded({ extended: true }));

    // set up handlebars ready for tabs
    // webserver.engine('hbs', hbs.express4({partialsDir:  './../views/partials'}));
    // webserver.set('view engine', 'hbs');
    // webserver.set('views', './../views/');

    //webserver.use(express.static('public'));

    var server = http.createServer(webserver);

    server.listen(process.env.PORT || 3000, null, function() {

        console.log('Express webserver configured and listening at http://localhost:' + process.env.PORT || 3000);
        console.log('To authorize bot to call all APIs login to  http://localhost:' + (process.env.PORT || 3000) + '/login');

    });

    // import all the pre-defined routes that are present in /components/routes
    var normalizedPath = require("path").join(__dirname, "routes");
    require("./routes/incoming_webhooks.js")(webserver, controller);
    require("./routes/oauth.js")(webserver, controller);
    controller.webserver = webserver;
    controller.httpserver = server;

    return webserver;

}
