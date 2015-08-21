var assert = require('assert');
var bodyParser = require('body-parser');
var express = require('express');
var https = require('https');
var nJwt = require('njwt');
var pem = require('pem');
var request = require('supertest');

var loginSuccessFixture = require('./fixtures/loginSuccess');
var properties = require('../properties.json');
var stormpathSdkExpress = require('../');

describe('authenticateSocialForToken',function() {

  var tokenEndpoint = properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=social';

  describe('if the sp app is not yet initialized',function(){
    var app;

    /*
     Mock context.  Manually proviede an undfined value
     for the application
     */

    var spConfig = {
      spClient: {
        getApplication: function(href,cb){
          cb(null,undefined);
        },
        getCurrentTenant: function(cb){
          cb(null,undefined);
        }
      }
    };

    before(function(){
      app = express();
      app.use(stormpathSdkExpress.AuthenticateSocialForToken(spConfig));
    });
    it('should error',function(done){
      request(app)
          .post('/')
          .expect(500,{errorMessage:properties.errors.library.SP_APP_UNINITIALIZED},done);
    });
  });


  describe('if the request does not contain providerId & accessToken',function(){

    var app;

    // Manually provide a mock application so that we don't fail in that clause

    var spConfig = {
      spClient: {
        getApplication: function(href,cb){
          cb(null,{});
        },
        getCurrentTenant: function(cb){
          cb(null,undefined);
        }
      }
    };

    before(function(){
      app = express();
      app.use(stormpathSdkExpress.AuthenticateSocialForToken(spConfig));
    });

    it('should error',function(done){

      request(app)
          .post('/')
          .expect(400,{errorMessage:properties.errors.authentication.BAD_ACCESS_TOKEN_BODY},done);

    });

  });


  describe('with a request that contains a valid accessToken-based login',function(){
    var jwtExpr = /[^\.]+\.[^\.]+\.[^;]+/;
    var httpOnlyCookieExpr = /access_token=[^\.]+\.[^\.]+\.[^;]+; Expires=[^;]+; HttpOnly;/;
    var httpsOnlyCookieExpr = /access_token=[^\.]+\.[^\.]+\.[^;]+; Expires=[^;]+; Secure; HttpOnly;/;
    var xsrfTokenCookieExpr = /XSRF-TOKEN=[0-9A-Za-z\-]+; Expires=[^;]+;/;

    var mockLoginPost = {providerId:'facebook',accessToken:'123'};
    var parser = nJwt.Parser().setSigningKey('123');
    var customRequestedScope = 'quiero';
    var customScope = 'my-custom scope';


    describe('and default spConfig options with an https server',function(){

      var app, server;

      function requestedScopeReflection(customScope,requestedScope){
        return [customScope,requestedScope].join(' ');
      }

      before(function(done){
        loginSuccessFixture(function(fixture){
          var spMiddleware = stormpathSdkExpress.createMiddleware({
            appHref: fixture.appHref,
            apiKeyId: '123',
            apiKeySecret: '123',
            scopeFactory: function(req,res,authenticationResult,account,requestedScope,done) {
              done(null,requestedScope ? requestedScopeReflection(customScope,customRequestedScope) : '');
            }
          });
          app = express();
          app.use(bodyParser.json());
          spMiddleware.attachDefaults(app);

          pem.createCertificate({days:1, selfSigned:true}, function(err, keys){
            server = https.createServer({key: keys.serviceKey, cert: keys.certificate}, app).listen(0);
            var wait = setInterval(function(){
              /* wait for sp application */
              if(spMiddleware.getApplication()){
                clearInterval(wait);
                done();
              }
            },100);
          });


        });
      });



      it('should write an access token in a Secure, HttpOnly cookie',function(done){
        request(server)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .expect('set-cookie', httpsOnlyCookieExpr)
            .expect(201,'',done);
      });

      describe('and scope is requested',function(){
        describe('via URL params',function(){
          it('should preserve scope from the scope factory in the access token',function(done){
            request(server)
                .post(tokenEndpoint+'&scope='+customRequestedScope)
                .send(mockLoginPost)
                .expect('set-cookie', httpsOnlyCookieExpr)
                .expect(201,'')
                .end(function(err,res) {
                  var access_token = res.headers['set-cookie'][1].match(/access_token=([^;]+)/)[1];
                  parser.parseClaimsJws(access_token,function(err,jwt) {
                    assert.equal(jwt.body.scope,requestedScopeReflection(customScope,customRequestedScope));
                    done();
                  });
                });
          });
        });

        describe('via post body',function(){
          it('should preserve scope from the scope factory in the access token',function(done){
            request(server)
                .post(tokenEndpoint)
                .send({providerId:mockLoginPost.providerId,accessToken:mockLoginPost.accessToken,scope:customRequestedScope})
                .expect('set-cookie', httpsOnlyCookieExpr)
                .expect(201,'')
                .end(function(err,res) {
                  var access_token = res.headers['set-cookie'][1].match(/access_token=([^;]+)/)[1];
                  parser.parseClaimsJws(access_token,function(err,jwt) {
                    assert.equal(jwt.body.scope,requestedScopeReflection(customScope,customRequestedScope));
                    done();
                  });
                });
          });
        });
      });
      it('should write an xsrf cookie',function(done){
        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .expect('set-cookie', xsrfTokenCookieExpr)
            .expect(201,'',done);
      });

      it('should not write a response body',function(done){
        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .expect(201,'',done);
      });
    });

    describe('and default spConfig options with an http server',function(){

      var app;

      before(function(done){
        loginSuccessFixture(function(fixture){
          var spMiddleware = stormpathSdkExpress.createMiddleware({
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

      it('should write an access token to an http-only cookie',function(done){

        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .expect('set-cookie', httpOnlyCookieExpr, done);

      });
      it('should write an empty body with 201 response',function(done){

        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .expect(201,'',done);

      });
    });

    describe('and spConfig { forceHttps: true } option with an http server',function(){

      var app;

      before(function(done){
        loginSuccessFixture(function(fixture){
          var spMiddleware = stormpathSdkExpress.createMiddleware({
            appHref: fixture.appHref,
            forceHttps: true
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

      it('should write an access token in a Secure, HttpOnly cookie',function(done){
        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .expect('set-cookie', httpsOnlyCookieExpr)
            .expect(201,'',done);
      });

      it('should write an empty body with 201 response',function(done){

        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .expect(201,'',done);

      });
    });

    describe('and {writeAccessTokenResponse: true} spConfig option',function(){

      var app, server;

      before(function(done){
        loginSuccessFixture(function(fixture){
          app = express();
          var spMiddleware = stormpathSdkExpress.createMiddleware({
            appHref: fixture.appHref,
            apiKeyId: '123',
            apiKeySecret: '123',
            writeAccessTokenResponse: true,
            scopeFactory: function(req,res,authenticationResult,account,requstedScope,done) {
              done(null,customScope);
            }
          });
          app.use(bodyParser.json());
          spMiddleware.attachDefaults(app);

          pem.createCertificate({days:1, selfSigned:true}, function(err, keys){
            server = https.createServer({key: keys.serviceKey, cert: keys.certificate}, app).listen(0);
            var wait = setInterval(function(){
              /* wait for sp application */
              if(spMiddleware.getApplication()){
                clearInterval(wait);
                done();
              }
            },100);
          });

        });
      });

      it('should write an access token in a Secure, HttpOnly cookie',function(done){
        request(server)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .expect('set-cookie', httpsOnlyCookieExpr, done);
      });

      it('should write access tokens to the response bodies',function(done){

        request(server)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .end(function(err,res){
              assert(res.body.access_token.match(jwtExpr));
              assert(res.body.token_type==='Bearer');
              assert(res.body.expires_in===3600);
              done();
            });

      });

      it('should preserve scope from the scope factory in the response body and access token',function(done){
        request(server)
            .post(tokenEndpoint+'&scope='+customRequestedScope)
            .send(mockLoginPost)
            .end(function(err,res) {
              var access_token = res.headers['set-cookie'][1].match(/access_token=([^;]+)/)[1];

              assert.equal(res.body.scope,customScope);
              parser.parseClaimsJws(access_token,function(err,jwt) {
                assert.equal(jwt.body.scope,customScope);
                done();
              });
            });
      });
    });

    describe('and {writeAccessTokenResponse: true, writeAccessTokenToCookie: false} spConfig options',function(){

      var app;

      before(function(done){
        loginSuccessFixture(function(fixture){
          var spMiddleware = stormpathSdkExpress.createMiddleware({
            appHref: fixture.appHref,
            writeAccessTokenResponse: true,
            writeAccessTokenToCookie: false
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

      it('should not write an access token cookie',function(done){
        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .end(function(err,res){
              assert(httpsOnlyCookieExpr.test(res.headers['set-cookie'].join(','))===false);
              done();
            });
      });

      it('should write an access token tresponse body',function(done){

        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .end(function(err,res){
              assert(res.body.access_token.match(jwtExpr));
              assert(res.body.token_type==='Bearer');
              assert(res.body.expires_in===3600);
              done();
            });

      });
    });

    describe('and { writeAccessTokenToCookie: false} spConfig options',function(){

      var app;

      before(function(done){
        loginSuccessFixture(function(fixture){
          var spMiddleware = stormpathSdkExpress.createMiddleware({
            appHref: fixture.appHref,
            writeAccessTokenToCookie: false
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

      it('should not write an access token cookie',function(done){
        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .end(function(err,res){
              assert(httpOnlyCookieExpr.test(res.headers['set-cookie'].join(','))===false);
              assert(httpsOnlyCookieExpr.test(res.headers['set-cookie'].join(','))===false);
              done();
            });
      });

      it('should write an empty body with 201 response',function(done){
        request(app)
            .post(tokenEndpoint)
            .send(mockLoginPost)
            .expect(201,'',done);
      });
    });


  });



});