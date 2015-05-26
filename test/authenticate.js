var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var express = require('express');
var request = require('supertest');
var uuid = require('node-uuid');

var loginSuccessFixture = require('./fixtures/loginSuccess');
var mockLoginPost = {username:'abc',password:'123'};
var properties = require('../properties.json');

describe('authenticate middleware',function() {
  describe('with xsrf protection enabled',function(){

    var app;
    var protectedEndpoint = '/protected-input';
    var data = { hello: uuid() };
    var agent;
    var xsrfToken;

    beforeEach(function(done){
      loginSuccessFixture(function(fixture){
        app = express();
        app.use(bodyParser.json());
        app.use(cookieParser());
        var spMiddleware = require('../').createMiddleware({
          appHref: fixture.appHref
        });
        spMiddleware.attachDefaults(app);
        app.post(protectedEndpoint,spMiddleware.authenticate,function(req,res){
          res.json(req.body);
        });
        setTimeout(function(){
          /*
            timeout is for allowing time for the api fixture to return the request
            for the applicatin - otherwise you get an application-not-ready error
          */
          agent = request.agent(app);
          agent.post(properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=password')
            .send(mockLoginPost)
            .end(function(err,res){
              xsrfToken = res.headers['set-cookie'][0].match(/XSRF-TOKEN=([^;]+)/)[1];
              done();
            });
        },100);
      });
    });


    it('should reject post requests if the token is missing',function(done){
      agent
        .post(protectedEndpoint)
        .send(data)
        .expect(401,{errorMessage:properties.errors.xsrf.XSRF_MISMATCH},done);
    });

    it('should reject post requests if the token does not match',function(done){
      agent
        .post(protectedEndpoint)
        .set('X-XSRF-TOKEN', 'not the token you gave me')
        .send(data)
        .expect(401,{errorMessage:properties.errors.xsrf.XSRF_MISMATCH},done);
    });

    it('should accept post requests if the token is valid',function(done){
      agent
        .post(protectedEndpoint)
        .set('X-XSRF-TOKEN', xsrfToken)
        .send(data)
        .expect(200,data,done);
    });
  });

  describe('with xsrf protection disabled',function(){

    var app;
    var protectedEndpoint = '/protected-input';
    var data = { hello: uuid() };
    var agent;


    beforeEach(function(done){
      loginSuccessFixture(function(fixture){
        app = express();
        app.use(bodyParser.json());
        app.use(cookieParser());
        var spMiddleware = require('../').createMiddleware({
          appHref: fixture.appHref,
          xsrf: false
        });
        spMiddleware.attachDefaults(app);
        app.post(protectedEndpoint,spMiddleware.authenticate,function(req,res){
          res.json(req.body);
        });
        setTimeout(function(){
          /*
            timeout is for allowing time for the api fixture to return the request
            for the applicatin - otherwise you get an application-not-ready error
          */
          agent = request.agent(app);
          agent.post(properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=password')
            .send(mockLoginPost)
            .end(done);
        },100);
      });
    });


    it('should accept post requests even though the xsrf token is not there',function(done){
      agent
        .post(protectedEndpoint)
        .send(data)
        .expect(200,data,done);
    });
  });
});