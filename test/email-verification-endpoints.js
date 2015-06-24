
var request = require('supertest');

var properties = require('../properties.json');
var resentEndpoint = properties.configuration.RESEND_EMAIL_VERIFICATION_ENDPOINT;
var verificationEndpoint = properties.configuration.EMAIL_VERIFICATION_TOKEN_COLLECTION_ENDPOINT;
var helpers = require('./helpers');


describe('resend verification endpoint endpoint',function() {
  it('should add access control headers to OPTIONS responses, if the origin is whitelisted',function(done){
    var origin = 'http://localhost:9000';
    var app = helpers.buildApp({
      allowedOrigins: [origin]
    });
    request(app)
      .options(resentEndpoint)
      .set('Origin',origin)
      .expect('Access-Control-Allow-Origin',origin)
      .expect('Access-Control-Allow-Headers','Content-Type')
      .expect('Access-Control-Allow-Credentials','true')
      .expect(200,done);
  });

  it('should not access control headers to OPTIONS responses for origins that are not in the whitelist',function(done){
    helpers.getAppHref(function(appHref){
      var app = helpers.buildApp({
        appHref: appHref,
        allowedOrigins: ['a']
      });
      request(app)
        .options(resentEndpoint)
        .set('Origin','b')
        .expect(helpers.hasNullField('Access-Control-Allow-Origin'))
        .end(done);
    });
  });

  it('should not add access control headers to OPTIONS responses if there is no whitelist',function(done){
    helpers.getAppHref(function(appHref){
      var app = helpers.buildApp({
        appHref: appHref
      });
      request(app)
        .options(resentEndpoint)
        .expect(helpers.hasNullField('Access-Control-Allow-Origin'))
        .end(done);

    });
  });
});


describe('token verification endpoint endpoint',function() {
  it('should add access control headers to OPTIONS responses, if the origin is whitelisted',function(done){
    var origin = 'http://localhost:9000';
    var app = helpers.buildApp({
      allowedOrigins: [origin]
    });
    request(app)
      .options(verificationEndpoint)
      .set('Origin',origin)
      .expect('Access-Control-Allow-Origin',origin)
      .expect('Access-Control-Allow-Headers','Content-Type')
      .expect('Access-Control-Allow-Credentials','true')
      .expect(200,done);
  });

  it('should not access control headers to OPTIONS responses for origins that are not in the whitelist',function(done){
    helpers.getAppHref(function(appHref){
      var app = helpers.buildApp({
        appHref: appHref,
        allowedOrigins: ['a']
      });
      request(app)
        .options(verificationEndpoint)
        .set('Origin','b')
        .expect(helpers.hasNullField('Access-Control-Allow-Origin'))
        .end(done);
    });
  });

  it('should not add access control headers to OPTIONS responses if there is no whitelist',function(done){
    helpers.getAppHref(function(appHref){
      var app = helpers.buildApp({
        appHref: appHref
      });
      request(app)
        .options(verificationEndpoint)
        .expect(helpers.hasNullField('Access-Control-Allow-Origin'))
        .end(done);

    });
  });
});
