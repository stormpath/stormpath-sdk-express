var assert = require('assert');
var bodyParser = require('body-parser');
var express = require('express');
var jwtErrors = require('njwt/properties.json').errors;
var nJwt = require('njwt');
var request = require('supertest');

var itFixtureLoader = require('./it-fixtures/loader');
var properties = require('../properties.json');
var stormpathSdkExpress = require('../');

describe('authenticateBearerAuthorizationHeader',function() {

  var app;

  var fixture = itFixtureLoader('apiAuth.json');


  var accessToken;

  var protectedEndpoint = '/input';
  var postData = { hello: 'world' };


  before(function(done){
    var spMiddleware = stormpathSdkExpress.createMiddleware({
      appHref: fixture.appHref,
      apiKeyId: fixture.apiKeyId,
      apiKeySecret: fixture.apiKeySecret
    });
    app = express();
    app.use(bodyParser.json());
    spMiddleware.attachDefaults(app);
    app.use(spMiddleware.authenticate);
    app.post(protectedEndpoint,function(req,res){
      res.json({ data: req.body, user: req.user });
    });

    var wait = setInterval(function(){
      /* wait for sp application */
      if(spMiddleware.getApplication()){
        clearInterval(wait);
        request(app)
          .post(properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=client_credentials')
          .set('Authorization', 'Basic ' +
            new Buffer(fixture.accountApiKeyId+':'+fixture.accountApiKeySecret)
              .toString('base64')
          )
          .end(function(err,res){
            accessToken = res.body.access_token;
            done();
          });
      }
    },100);

  });

  describe('posting a malformed Authorization: Bearer value',function(){
    it('should error',function(done){
      request(app)
        .post(protectedEndpoint)
        .set('Authorization', 'Bearer blah')
        .expect(400,done);
    });
  });
  describe('posting a valid brearer token',function(){
    it('should authorize the request',function(done){
      request(app)
        .post(protectedEndpoint)
        .set('Authorization', 'Bearer ' + accessToken)
        .send(postData)
        .end(function(err,res){
          assert.deepEqual(res.body.data,postData);
          assert.equal(res.body.user.href,fixture.accountHref);
          done();
        });
    });
  });
  describe('posting a spoofed brearer token',function(){
    var fakeToken = nJwt.Jwt({
      sub: 'me'
    }).signWith('HS256','my fake key').compact();
    it('should error',function(done){
      request(app)
        .post(protectedEndpoint)
        .set('Authorization', 'Bearer ' + fakeToken)
        .send(postData)
        .expect(401,{errorMessage:jwtErrors.SIGNATURE_MISMTACH},done);
    });
  });
  describe('posting an expired brearer token',function(){
    var app, expiredToken;
    /*
      Creating another app that will issue tokens whicn expire
      in 1 second
     */
    before(function(done){
      var spMiddleware = require('../').createMiddleware({
        appHref: fixture.appHref,
        apiKeyId: fixture.apiKeyId,
        apiKeySecret: fixture.apiKeySecret,
        accessTokenTtl: 0
      });
      app = express();
      app.use(bodyParser.json());
      spMiddleware.attachDefaults(app);
      app.post(protectedEndpoint,spMiddleware.authenticate,function(req,res){
        res.json({ data: req.body, user: req.user });
      });

      var wait = setInterval(function(){
        /* wait for sp application */
        if(spMiddleware.getApplication()){
          clearInterval(wait);
          request(app)
            .post(properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=client_credentials')
            .set('Authorization', 'Basic ' +
              new Buffer(fixture.accountApiKeyId+':'+fixture.accountApiKeySecret)
                .toString('base64')
            )
            .end(function(err,res){
              expiredToken = res.body.access_token;
              assert.equal(res.body.expires_in,0);
              setTimeout(done,1000);
            });
        }
      },100);
    });
    it('should error',function(done){
      request(app)
        .post(protectedEndpoint)
        .set('Authorization', 'Bearer ' + expiredToken)
        .send(postData)
        .expect(401,{errorMessage:jwtErrors.EXPIRED},done);
    });
  });
});