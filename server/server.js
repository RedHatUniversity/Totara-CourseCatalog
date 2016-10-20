/*
 Basic Express server based on express-generator
 */

var express      = require('express'),
    path         = require('path'),
    fs           = require('fs'),
    https        = require('https'),
    routes       = require('./routes'),
    app          = express(),
    env          = process.env,
    isProduction = env.NODE_ENV === 'production',
    ipAddress    = env.OPENSHIFT_NODEJS_IP || 'localhost',
    port         = env.OPENSHIFT_NODEJS_PORT || (isProduction ? env.PORT : 8080);

app.use(express.static('./front/www/'));
app.use('/', routes);

// var httpsOptions = {
//   cert: fs.readFileSync('./server/ssl/server.crt'),
//   key : fs.readFileSync('./server/ssl/server.key')
// };

// development error handler
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error  : err
    });
  });
}

// Catch 404's
app.use(function (req, res, next) {
  var err    = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.listen(port, ipAddress, function () {
  console.log('Application worker ' + process.pid + ' started...');
  console.log('Server started on ' + new Date(Date.now()) + ' at http://' + ipAddress + ':' + port);
});

// https.createServer(httpsOptions, app)
//   .listen(port, function () {
//     console.log('Application worker ' + process.pid + ' started...');
//     console.log('Server started on ' + new Date(Date.now()) + ' at http://' + ipAddress + ':' + port);
//   });