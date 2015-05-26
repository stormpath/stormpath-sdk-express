var bodyParser = require('body-parser');
var express = require('express');
var request = require('supertest');

var loginSuccessFixture = require('./fixtures/loginSuccess');
var properties = require('../properties.json');

describe('writeTokens option',function() {

  var tokenEndpoint = properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=password';
  var mockLoginPost = {username:'abc',password:'123'};


  describe('when set to false',function(){
    var app, accountHref;

    before(function(done){
      loginSuccessFixture(function(fixture){
        accountHref = fixture.accountHref;
        var spMiddleware = require('../').createMiddleware({
          appHref: fixture.appHref,
          writeTokens: false
        });
        app = express();
        app.use(bodyParser.json());
        app.post(properties.configuration.DEFAULT_TOKEN_ENDPOINT,spMiddleware.authenticateForToken,function(req,res){
          res.json({accountHref:req.authenticationResult.account.href});
        });

        var wait = setInterval(function(){
          /* wait for sp application */
          if(spMiddleware.getApplication()){
            clearInterval(wait);
            done();
          }
        },100);

      });
    });
    it('should set an authenticationResult on the request',function(done){
      request(app)
        .post(tokenEndpoint)
        .send(mockLoginPost)
        .expect(200,{accountHref:accountHref},done);
    });
  });
  describe('when left as default',function(){
    var app;
    var httpOnlyCookieExpr = /access_token=[^\.]+\.[^\.]+\.[^;]+; Expires=[^;]+; HttpOnly;/;

    before(function(done){
      loginSuccessFixture(function(fixture){
        var spMiddleware = require('../').createMiddleware({
          appHref: fixture.appHref
        });
        app = express();
        app.use(bodyParser.json());
        spMiddleware.attachDefaults(app);

        var wait = setInterval(function(){
          /* wait for sp application */
          if(spMiddleware.getApplication()){
            clearInterval(wait);
            done();
          }
        },100);

      });
    });
    it('should write tokens on the response',function(done){
      request(app)
        .post(tokenEndpoint)
        .send(mockLoginPost)
        .expect('set-cookie', httpOnlyCookieExpr)
        .expect(201,'',done);
    });
  });
});