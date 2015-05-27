var assert = require('assert');
var express = require('express');
var http = require('http');
var request = require('supertest');

var pkg = require('../package.json');
var properties = require('../properties');
var stormpathSdkExpress = require('../');

/*
  This library creates self-signed certificates in order to test
  the HTTPS features of the library.

  At the time of writing there is a problem with supertest and
  self-signed certificates.  It failes on the Certificate Authority
  mismtach.

  There an option that has been merged into the underlying
  superagent module, but I was not able to use it successfully

  See:
    https://github.com/visionmedia/superagent/issues/197
    https://github.com/visionmedia/superagent/pull/198

  The workaround is to set NODE_TLS_REJECT_UNAUTHORIZED = 0

  I don't like this because it also means we don't validate
  security on requests to api.stormpath.com in our IT tests
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


describe('the user agent of this library',function(){

  var expectedUaExpr = '^stormpath-sdk-express\/'+pkg.version;

  var app, appHref, ua;

  before(function(done){

    /*
      Create a mock API service and pass a mock application href
      to the express app.  When the express app calls that mock href
      we will inpsect the user agent to ensure that it's being
      sent corectly
     */

    var mockApiServer = http.createServer(function(req,res){
      ua = req.headers['user-agent'];
      res.end(JSON.stringify({userAgent:req.headers && req.headers['user-agent']}));
    }).listen(0,function(){
      appHref = 'http://0.0.0.0:'+mockApiServer.address().port+'/an-application';
      app = express();
      stormpathSdkExpress.createMiddleware({
        appHref: appHref
      });
    });


    var wait = setInterval(function(){
      /* wait for the library to make an api call */
      if(ua){
        clearInterval(wait);
        done();
      }
    },100);

  });
  it('should reflect the user agent of this module',function(){
    assert(new RegExp(expectedUaExpr).test(ua),'user agent is not correct');
  });
});

describe('createMiddleware',function(){

  var a,b,c;
  before(function(){
    a = process.env.STORMPATH_API_KEY_SECRET;
    b = process.env.STORMPATH_API_KEY_ID;
    c = process.env.STORMPATH_APP_HREF;
    delete process.env.STORMPATH_API_KEY_SECRET;
    delete process.env.STORMPATH_API_KEY_ID;
    delete process.env.STORMPATH_APP_HREF;
  });
  after(function(){
    process.env.STORMPATH_API_KEY_SECRET = a;
    process.env.STORMPATH_API_KEY_ID = b;
    process.env.STORMPATH_APP_HREF = c;
  });
  it('should throw if an api key ID is not given',function(){
    assert.throws(function(){
      stormpathSdkExpress.createMiddleware({});
    },properties.errors.MISSING_API_KEY_ID);
  });
  it('should throw if an api key secret is not given',function(){
    assert.throws(function(){
      stormpathSdkExpress.createMiddleware({
        apiKeyId: '1'
      });
    },properties.errors.MISSING_API_KEY_SECRET);
  });
  it('should throw if an app href is not given',function(){
    assert.throws(function(){
      stormpathSdkExpress.createMiddleware({
        apiKeyId: '1',
        apiKeySecret: '1'
      });
    },properties.errors.MISSING_APP_HREF);
  });

  it('should expose the stormpath client for use',function(){
    var spMiddleware = stormpathSdkExpress.createMiddleware({
      apiKeyId: '1',
      apiKeySecret: '1',
      appHref: 'x'
    });
    assert(spMiddleware.spClient);
    assert(spMiddleware.spClient.getCurrentTenant);
  });
});


describe('default middleware from createMiddleware() with default options',function(){
  var stormpathMiddleware, app;

  var spConfig = {
    apiKeyId:'1',
    apiKeySecret:'2',
    appHref: '',
    stormpath: {
      // Mock out the stormpath library, we don't need to get a client
      // or api key for this test
      Client: function(){return {
        getApplication:function(){

        },
        getCurrentTenant: function(cb){
          cb(null,undefined);
        }};
      },
      ApiKey: function(){},
    }
  };

  before(function(){
    stormpathMiddleware = stormpathSdkExpress.createMiddleware(spConfig);
    app = express();
    app.use(stormpathMiddleware);
  });

  describe('when passed to app.use()',function(){
    it('should respond to POST token requests at the default token endpoint',function(done){
      request(app)
        .post(properties.configuration.DEFAULT_TOKEN_ENDPOINT)
        .expect(401,{errorMessage:properties.errors.authentication.UNSUPPORTED_GRANT_TYPE},done);
    });
    it('should reject GET token requests at the default token endpoint',function(done){
      request(app)
        .get(properties.configuration.DEFAULT_TOKEN_ENDPOINT)
        .expect(405,done);
    });
    it('should attempt to authenticate all other requests',function(done){
      request(app)
        .get('/something-else')
        .expect(401,{errorMessage:properties.errors.authentication.UNAUTHENTICATED},done);
    });
  });
});

describe('tokenExchange middleware',function(){

  describe('when constructed with a custom error handler',function(){
    describe('and passed a post body with an invalid grant_type',function(){
      it('call the custom error handler');
    });
    describe('and passed a post body with invalid credentials',function(){
      it('call the custom error handler');
    });
  });

  describe('when constructed with a scope handler',function(){
    describe('and passed a post body with grant_type=password, valid username and password, and scope request',function(){
      it('should call the scope handler with the resolved account and a callback which expects a string and will continue with the token exchange');
    });
  });
});


describe('authenticate() middleware',function(){

  // todo  validate scope of token

  describe('when constructed with a custom error handler',function(){

    describe('and passed a username and password as json POST',function(){
      describe('and the credentials are invalid',function(){
        it('call the custom error handler');
      });
    });
    describe('and passed a username and password as a multipart form post',function(){
      describe('and the credentials are invalid',function(){
        it('call the custom error handler');
      });
    });
  });

});
