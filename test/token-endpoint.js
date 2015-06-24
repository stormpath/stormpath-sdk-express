
var request = require('supertest');

var properties = require('../properties.json');
var tokenEndpoint = properties.configuration.DEFAULT_TOKEN_ENDPOINT + '?grant_type=password';
var helpers = require('./helpers');


describe('oauth token endpoint',function() {
  it('should add access control headers to OPTIONS responses, if the origin is whitelisted',function(done){
    var origin = 'http://localhost:9000';
    var app = helpers.buildApp({
      allowedOrigins: [origin]
    });
    request(app)
      .options(tokenEndpoint)
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
        .options(tokenEndpoint)
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
        .options(tokenEndpoint)
        .expect(helpers.hasNullField('Access-Control-Allow-Origin'))
        .end(done);

    });
  });
});
