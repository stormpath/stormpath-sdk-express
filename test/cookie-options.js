var bodyParser = require('body-parser');
var express = require('express');
var request = require('supertest');

var loginSuccessFixture = require('./fixtures/loginSuccess');
var properties = require('../properties.json');

describe('accessTokenCookieName option',function() {

  var tokenEndpoint = properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=password';
  var customCookieName = 'yet-another-cookie';
  var mockLoginPost = {username:'abc',password:'123'};

  describe('when set to a custom value',function(){
    var app;

    before(function(done){
      loginSuccessFixture(function(fixture){
        var spMiddleware = require('../').createMiddleware({
          appHref: fixture.appHref,
          accessTokenCookieName: customCookieName
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
    it('should be reflected in the cookie response as the default value',function(done){
      request(app)
        .post(tokenEndpoint)
        .send(mockLoginPost)
        .expect('set-cookie', new RegExp(customCookieName),done);
    });
  });
  describe('when left as default',function(){
    var app;

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
    it('should be reflected in the cookie response as the default value',function(done){
      request(app)
        .post(tokenEndpoint)
        .send(mockLoginPost)
        .expect('set-cookie', new RegExp(properties.configuration.DEFAULT_ACCESS_TOKEN_COOKIE_NAME),done);
    });
  });
});