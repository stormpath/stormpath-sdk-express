var nJwt = require('njwt');
var uuid = require('node-uuid');
var stormpath = require('stormpath');

var pkg = require('../package.json');
var properties = require('../properties.json');
var writeToken = require('./middleware/writeToken');

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function MiddlewareContext(spConfig){
  var self = this;
  this.spConfig = typeof spConfig === 'object' ? spConfig : {};
  this.stormpath = spConfig.stormpath || stormpath;
  var spApplication;
  this.jwtLib = spConfig.jwtLib || nJwt;
  this.getUuid = spConfig.uuidGenerator || uuid;
  this.properties = spConfig.properties || properties;
  this.scopeFactory = spConfig.scopeFactory || undefined;
  spConfig.xsrf = spConfig.xsrf === false ? false : true;
  spConfig.forceHttps = spConfig.forceHttps === true ? true : false;
  spConfig.writeTokens = spConfig.writeTokens === false ? false : true;
  spConfig.endOnError = spConfig.endOnError === false ? false : true;
  spConfig.tokenEndpoint = spConfig.tokenEndpoint || this.properties.configuration.DEFAULT_TOKEN_ENDPOINT;
  spConfig.allowedOrigins = spConfig.allowedOrigins || [];
  spConfig.accessTokenTtl = isNumeric(spConfig.accessTokenTtl) ? spConfig.accessTokenTtl : 3600;
  spConfig.accessTokenCookieName = spConfig.accessTokenCookieName || this.properties.configuration.DEFAULT_ACCESS_TOKEN_COOKIE_NAME;
  spConfig.writeAccessTokenToCookie = spConfig.writeAccessTokenToCookie === false ? false : true;
  spConfig.writeAccessTokenToResponseBody = spConfig.writeAccessTokenToResponseBody === true ? true : false;

  if(spConfig.spClient){
    this.spClient = spConfig.spClient;
  }else if(spConfig.apiKeyId && spConfig.apiKeySecret){
    console.log('Initializing Stormpath Client');
    this.spClient = new this.stormpath.Client({
      apiKey: new this.stormpath.ApiKey(this.spConfig.apiKeyId,this.spConfig.apiKeySecret),
      userAgent: 'stormpath-sdk-express/' + pkg.version
    });
  }else{
    throw new Error('invalid spConfig - cann\'t construct a client');
  }
  console.log('Initializing Stormpath Application');
  this.spClient.getApplication(this.spConfig.appHref,function(err,application){
    if(err){
      console.error(err);
    }else{
      spApplication = application;
    }
  });
  this.tokenWriter = writeToken.bind(this);
  this.getApplication = function(){
    return spApplication;
  };
  this.handleApplicationError = function(errMsgString,res){
    res.status(500).json({errorMessage: errMsgString});
  };
  this.handleAuthenticationError = function(err,req,res,next){
    if(self.spConfig.endOnError){
      if(req.cookies && req.cookies[self.spConfig.accessTokenCookieName]){
        res.setHeader('set-cookie',self.spConfig.accessTokenCookieName+'=delete;path=/;Expires='+new Date().toUTCString());
      }
      res.status(err.status || err.statusCode || 401)
        .json({
          errorMessage: err.userMessage ||
            self.properties.errors.authentication.UNKNOWN
          }
        );
    }else{
      req.authenticationError = err;
      next();
    }
  };
  this.xsrfValidator = function xsrfValidator(req,res,next){
    if(this.spConfig.xsrf && req.method==='POST'){
      var token = req.headers['x-xsrf-token'] || (req.body && req.body.xsrfToken);
      if(token===req.accessToken.body.xsrfToken){
        next();
      }else{
        this.handleAuthenticationError({
          userMessage:this.properties.errors.xsrf.XSRF_MISMATCH
        },req,res,next);
      }
    }else{
      next();
    }
  };
  this.jwsClaimsParser =
    this.jwtLib.Parser().setSigningKey(this.spConfig.apiKeySecret);
  return this;
}

module.exports = MiddlewareContext;