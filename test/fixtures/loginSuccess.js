/*
  Returns an application at the given href

  Returns generic account objects when posting to the login attemps
  of the given app
 */

var bodyParser = require('body-parser');
var express = require('express');
var http = require('http');
var uuid = require('node-uuid');

function loginSuccessFixture2(done){
  var app = express();
  var server = http.createServer(app);


  server.listen(0,function(){
    var base = 'http://0.0.0.0:'+server.address().port;
    var fixture = loginSuccessFixture(base,app);
    app.use(bodyParser.json());
    done({appHref:fixture.appHref,accountHref:fixture.accountHref});
  });

}


function loginSuccessFixture(base,expressApp) {

  var appUri = '/v1/application/'+uuid();
  var accountUri = '/v1/accounts/'+uuid();

  var appHref = base+appUri;
  var loginAttemptsUri = appUri + '/loginAttempts';
  var loginAttemptsHref = base + loginAttemptsUri;
  var accountHref = base+accountUri;

  expressApp.get(appUri,function(req,res){
    res.json({href:appHref,loginAttempts:{href:loginAttemptsHref}});
  });

  expressApp.get(accountUri,function(req,res){
    res.json({
      href:accountHref,
      status: "ENABLED"
    });
  });

  expressApp.post(loginAttemptsUri,function(req,res){
    res.json({
      account: {
        href: accountHref
      }
    });
  });
  return {
    appHref: appHref,
    accountHref: accountHref
  };
}
module.exports = loginSuccessFixture2;