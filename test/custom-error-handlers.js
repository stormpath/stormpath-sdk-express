var bodyParser = require('body-parser');
var express = require('express');
var request = require('supertest');

var loginSuccessFixture = require('./fixtures/loginSuccess');
var properties = require('../properties.json');

describe('endOnError option',function() {
  describe('when set to false',function(){
    var app;
    var protectedUri = '/protected-resource';
    before(function(done){
      loginSuccessFixture(function(fixture){
        var spMiddleware = require('../').createMiddleware({
          apiKeyId: '123',
          apiKeySecret: '123',
          appHref: fixture.appHref,
          endOnError: false
        });
        app = express();
        app.use(bodyParser.json());
        app.use(spMiddleware);
        app.get(protectedUri,function(req,res){
          res.json({authenticationError:req.authenticationError.userMessage});
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
    it('should assign an authenticationError to the request',function(done){
      request(app)
        .get(protectedUri)
        .expect(200,{authenticationError:properties.errors.authentication.UNAUTHENTICATED},done);
    });
  });
  describe('when left as default',function(){
    var app;
    var protectedUri = '/protected-resource';
    before(function(done){
      loginSuccessFixture(function(fixture){
        var spMiddleware = require('../').createMiddleware({
          apiKeyId: '123',
          apiKeySecret: '123',
          appHref: fixture.appHref
        });
        app = express();
        app.use(bodyParser.json());
        app.use(spMiddleware);
        var wait = setInterval(function(){
          /* wait for sp application */
          if(spMiddleware.getApplication()){
            clearInterval(wait);
            done();
          }
        },100);
      });
    });
    it('should end the response with the default error response',function(done){
      request(app)
        .get(protectedUri)
        .expect(401,{errorMessage:properties.errors.authentication.UNAUTHENTICATED},done);
    });
  });
});