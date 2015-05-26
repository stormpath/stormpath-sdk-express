var assert = require('assert');
var bodyParser = require('body-parser');
var express = require('express');
var https = require('https');
var nJwt = require('njwt');
var pem = require('pem');
var request = require('supertest');

var itFixtureLoader = require('./it-fixtures/loader');
var properties = require('../properties');

describe('authenticateForToken',function() {

  var app, server;

  var apiAuthFixture = itFixtureLoader('apiAuth.json');
  var loginAuthFixture = itFixtureLoader('loginAuth.json');

  var jwtExpr = /[^\.]+\.[^\.]+\.[^;]+/;
  var httpsOnlyCookieExpr = /access_token=[^\.]+\.[^\.]+\.[^;]+; Expires=[^;]+; Secure; HttpOnly;/;
  var customScope = 'my-custom scope';
  var customRequestedScope = 'quiero';
  var parser = nJwt.Parser().setSigningKey(apiAuthFixture.apiKeySecret);

  before(function(done){
    var spMiddleware = require('../').createMiddleware({
      appHref: apiAuthFixture.appHref,
      apiKeyId: apiAuthFixture.apiKeyId,
      apiKeySecret: apiAuthFixture.apiKeySecret,
      scopeFactory: function(req,res,authenticationResult,account,requestedScope,done) {
        done(null,requestedScope ? requestedScopeReflection(customScope,customRequestedScope) : '');
      }
    });
    app = express();
    app.use(bodyParser.json());

    spMiddleware.attachDefaults(app);


    pem.createCertificate({days:1, selfSigned:true}, function(err, keys){
      server = https.createServer({key: keys.serviceKey, cert: keys.certificate}, app).listen(0);
    });

    var wait = setInterval(function(){
      /* wait for sp application */
      if(spMiddleware.getApplication()){
        clearInterval(wait);
        done();
      }
    },100);

  });

  function requestedScopeReflection(customScope,requestedScope){
    return [customScope,requestedScope].join(' ');
  }

  describe('if request has no grant_type',function(){
    it('should error',function(done){
      request(server)
        .post(properties.configuration.DEFAULT_TOKEN_ENDPOINT)
        .expect(401,{errorMessage:properties.errors.authentication.UNSUPPORTED_GRANT_TYPE},done);
    });
  });
  describe('if request has an unsupported grant_type',function(){
    it('should error',function(done){
      request(app)
        .post(properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=foo')
        .expect(401,{errorMessage:properties.errors.authentication.UNSUPPORTED_GRANT_TYPE},done);
    });
  });

  describe('if grant_type=client_credentials',function(){
    var tokenEndpoint = properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=client_credentials';
    describe('and request has a malformed Authorization value',function(){
      it('should error',function(done){
        request(app)
          .post(tokenEndpoint)
          .set('Authorization', 'blah')
          .expect(400,{errorMessage:'Invalid Authorization value'},done);
      });
    });
    describe('and request has a malformed Authorization: Basic value',function(){
      it('should error',function(done){
        request(app)
          .post(tokenEndpoint)
          .set('Authorization', 'Basic blah')
          .expect(400,{errorMessage:'Invalid Authorization value'},done);
      });
    });
    describe('and request has valid api key credentials',function(){
      it('should respond with a token',function(done){
        request(app)
          .post(tokenEndpoint)
          .set('Authorization', 'Basic ' +
            new Buffer(apiAuthFixture.accountApiKeyId+':'+apiAuthFixture.accountApiKeySecret)
              .toString('base64')
          )
          .end(function(err,res){
            assert.equal(res.status,200);
            assert.equal(typeof res.body, 'object');
            assert.equal(res.body.token_type,'Bearer');
            assert.equal(res.body.expires_in,3600);
            assert(jwtExpr.test(res.body.access_token));
            parser.parseClaimsJws(res.body.access_token,function(err,jwt) {
              assert.equal(jwt.body.jti.length,36,'is a uuid');
              assert.equal(jwt.body.iss,apiAuthFixture.appHref,'Was issued by the application');
              assert.equal(jwt.body.sub,apiAuthFixture.accountApiKeyId,'subject is the api key id');
              assert.equal(jwt.body.scope,undefined,'no scopes by default');
              done();
            });
          });
      });
      it('should preserve scope from the scope factory in the access token',function(done){
        request(app)
          .post(tokenEndpoint+'&scope='+customRequestedScope)
          .set('Authorization', 'Basic ' +
            new Buffer(apiAuthFixture.accountApiKeyId+':'+apiAuthFixture.accountApiKeySecret)
              .toString('base64')
          )
          .end(function(err,res) {
            assert.equal(res.body.scope,requestedScopeReflection(customScope,customRequestedScope));
            parser.parseClaimsJws(res.body.access_token,function(err,jwt) {
              assert.equal(jwt.body.scope,requestedScopeReflection(customScope,customRequestedScope));
              done();
            });
          });
      });
    });
  });
  describe('if grant_type=password',function(){
    describe('and request has valid username and password',function(){
      it('should respond with a token',function(done){
        request(server)
          .post(properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=password')
          .send({
            username:loginAuthFixture.accountUsername,
            password:loginAuthFixture.accountPassword
          })
          .expect('set-cookie', httpsOnlyCookieExpr)
          .expect(201,'')
          .end(function(err,res) {
            if(err){
              throw err;
            }
            var access_token = res.headers['set-cookie'][1].match(/access_token=([^;]+)/)[1];
            parser.parseClaimsJws(access_token,function(err,jwt) {
              assert.equal(err,null);
              assert.equal(jwt.body.jti.length,36,'is a uuid');
              assert.equal(jwt.body.iss,apiAuthFixture.appHref,'Was issued by the application');
              assert.equal(jwt.body.sub,loginAuthFixture.accountHref,'subject is the account');
              assert.equal(jwt.body.scope,undefined,'no scopes by default');
              done();
            });
          });

      });
    });
    describe('and request has invalid password',function(){
      it('should error',function(done){
        request(app)
          .post(properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=password')
          .send({
            username:loginAuthFixture.accountUsername,
            password: 'not the right password'
          })
          .expect(401,{
            code: 7100,
            errorMessage:'Invalid username or password.'
          },done);
      });
    });
  });
});