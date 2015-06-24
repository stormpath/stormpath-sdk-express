var bodyParser = require('body-parser');
var express = require('express');
var loginSuccessFixture = require('./fixtures/loginSuccess');

function hasNullField(field){
  return function(res){
    var value = res.headers[field.toLowerCase()];
    return value ? ("Expected header '" + field + "' to be null, but has value '"+value+"'") : false;
  };
}

function getAppHref(next){
  loginSuccessFixture(function(fixture){
    var spMiddleware = require('../').createMiddleware({
      appHref: fixture.appHref,
      allowedOrigins: ['a']
    });
    var app = express();
    app.use(bodyParser.json());
    spMiddleware.attachDefaults(app);

    var wait = setInterval(function(){
      /* wait for sp application */
      if(spMiddleware.getApplication()){
        clearInterval(wait);
        next(fixture.appHref);
      }
    },100);
  });
}


function buildApp(spConfig){
  var spMiddleware = require('../').createMiddleware(spConfig);
  var app = express();
  app.use(bodyParser.json());
  spMiddleware.attachDefaults(app);
  return app;
}

module.exports = {
  hasNullField: hasNullField,
  getAppHref: getAppHref,
  buildApp: buildApp
};