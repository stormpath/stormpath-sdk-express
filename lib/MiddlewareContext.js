'use strict';

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
  var spApplication, spTenant;
  this.jwtLib = spConfig.jwtLib || nJwt;
  this.getUuid = spConfig.uuidGenerator || uuid;
  this.properties = spConfig.properties || properties;
  this.scopeFactory = spConfig.scopeFactory || undefined;
  spConfig.xsrf = spConfig.xsrf === false ? false : true;
  spConfig.forceHttps = spConfig.forceHttps === true ? true : false;
  spConfig.writeTokens = spConfig.writeTokens === false ? false : true;
  spConfig.endOnError = spConfig.endOnError === false ? false : true;
  spConfig.logoutEndpoint = spConfig.logoutEndpoint || this.properties.configuration.DEFAULT_LOGOUT_ENDPOINT;
  spConfig.tokenEndpoint = spConfig.tokenEndpoint || this.properties.configuration.DEFAULT_TOKEN_ENDPOINT;
  spConfig.userCollectionEndpoint = spConfig.userCollectionEndpoint || this.properties.configuration.DEFAULT_USER_COLLECTION_ENDPOINT;
  spConfig.currentUserEndpoint = spConfig.currentUserEndpoint || this.properties.configuration.DEFAULT_CURRENT_USER_ENDPOINT;
  spConfig.resendEmailVerificationEndpoint = spConfig.resendEmailVerificationEndpoint || this.properties.configuration.RESEND_EMAIL_VERIFICATION_ENDPOINT;
  spConfig.emailVerificationTokenCollectionEndpoint = spConfig.emailVerificationTokenCollectionEndpoint || this.properties.configuration.EMAIL_VERIFICATION_TOKEN_COLLECTION_ENDPOINT;
  spConfig.passwordResetTokenCollectionEndpoint = spConfig.passwordResetTokenCollectionEndpoint || this.properties.configuration.PASSWORD_RESET_TOKEN_COLLECTION_ENDPOINT;
  spConfig.allowedOrigins = spConfig.allowedOrigins || [];
  spConfig.accessTokenTtl = isNumeric(spConfig.accessTokenTtl) ? spConfig.accessTokenTtl : 3600;
  spConfig.accessTokenCookieName = spConfig.accessTokenCookieName || this.properties.configuration.DEFAULT_ACCESS_TOKEN_COOKIE_NAME;
  spConfig.writeAccessTokenToCookie = spConfig.writeAccessTokenToCookie === false ? false : true;
  spConfig.writeAccessTokenResponse = spConfig.writeAccessTokenResponse === true ? true : false;

  spConfig.apiKeyId = spConfig.apiKeyId || process.env.STORMPATH_API_KEY_ID;
  spConfig.apiKeySecret = spConfig.apiKeySecret || process.env.STORMPATH_API_KEY_SECRET;
  spConfig.appHref = spConfig.appHref || process.env.STORMPATH_APP_HREF;

  this.postRegistrationHandler = (function(){
    var rh = spConfig.postRegistrationHandler;
    if(rh){
      if(typeof rh==='function'){
        return rh;
      }else{
        throw new Error('postRegistrationHandler must be a function');
      }
    }
    return null;
  })();

  if(spConfig.spClient){
    this.spClient = spConfig.spClient;
  }else if(spConfig.apiKeyId && spConfig.apiKeySecret && spConfig.appHref){
    this.spClient = new this.stormpath.Client({
      apiKey: new this.stormpath.ApiKey(this.spConfig.apiKeyId,this.spConfig.apiKeySecret),
      userAgent: 'stormpath-sdk-express/' + pkg.version
    });
  }else{
    if(!spConfig.apiKeyId){
      throw new Error(this.properties.errors.MISSING_API_KEY_ID);
    }
    else if(!spConfig.apiKeySecret){
      throw new Error(this.properties.errors.MISSING_API_KEY_SECRET);
    }else if(!spConfig.appHref){
      throw new Error(this.properties.errors.MISSING_APP_HREF);
    }else{
      throw new Error(this.properties.errors.INVALID_SP_CONFIG);
    }
  }

  this.spClient.getApplication(this.spConfig.appHref,function(err,application){
    if(err){
      console.error(err);
    }else{
      spApplication = application;
    }
  });
  this.spClient.getCurrentTenant(function(err,tenant){
    if(err){
      console.error(err);
    }else{
      spTenant = tenant;
    }
  });
  this.tokenWriter = writeToken.bind(this);
  this.getApplication = function(){
    return spApplication;
  };
  this.getTenant = function(){
    return spTenant;
  };
  this.handleApplicationError = function(errMsgString,res){
    res.status(500).json({errorMessage: errMsgString});
  };
  this.handleSdkError = function(err,res){
    res.status(err.status || err.statusCode || 500)
      .json({
        code: err.code,
        errorMessage: err.userMessage || err.developerMessage ||
          self.properties.errors.library.NODE_SDK_ERROR
      });
  };
  this.handleAuthenticationError = function(err,req,res,next){
    if(self.spConfig.endOnError){
      if(req.cookies && req.cookies[self.spConfig.accessTokenCookieName]){
        res.setHeader('set-cookie',self.spConfig.accessTokenCookieName+'=delete;path=/;Expires='+new Date().toUTCString());
      }
      res.status(err.status || err.statusCode || 401)
        .json({
          code: err.code,
          errorMessage: err.userMessage ||
            self.properties.errors.authentication.UNKNOWN
        });
    }else{
      req.authenticationError = err;
      next();
    }
  };
  this.handleAuthorizationError = function(err,req,res,next){
    if(self.spConfig.endOnError){
      res.status(err.status || err.statusCode || 403)
        .json({
          code: err.code,
          errorMessage: err.userMessage ||
            self.properties.errors.authorization.FORBIDDEN
        });
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