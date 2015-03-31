'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');

var MiddlewareContext = require('./lib/MiddlewareContext');

/*
  middlewareFns is a map of all the exported functions that
  exist as files in the middlware/ folder
*/

var middlewareFns = fs.readdirSync(path.join(__dirname,'lib','middleware'))
.filter(function(filename){
  return (/\.js/).test(filename);
})
.reduce(function(map,filename){
  var fnName = filename.replace(/.js/,'');
  map[fnName]=require(path.join(__dirname,'lib','middleware',fnName));
  return map;
},{});

function autoRouterHandler(req,res,next){
  var context = this;
  var spConfig = context.spConfig;
  function _next(){
    if(url.parse(req.url).pathname===spConfig.tokenEndpoint){
      if(req.method === 'POST'){
        context.authenticateForToken(req,res,next);
      }else{
        res.status(405).end();
      }
    }else if(url.parse(req.url).pathname===spConfig.logoutEndpoint){
      context.logout(req,res,next);
    }else{
      context.authenticate(req,res,next);
    }
  }

  if(spConfig.allowedOrigins.length>0){
    context.corsHandler(req,res,_next);
  }else{
    _next();
  }

}

function createMiddleware(spConfig) {
  spConfig = typeof spConfig === 'object' ? spConfig : {};
  var context = new MiddlewareContext(spConfig);
  var boundMiddleware = {};

  /*
    For each exported middleware function, create a bound version
    which is bound to the context and assign a reference onto
    the context which points to the bound function.  The name
    of the function is the name of the reference.
   */

  Object.keys(middlewareFns).reduce(function(boundMiddleware,fnName){
    var boundFn = middlewareFns[fnName].bind(context);
    Object.defineProperty(context, fnName, {
      get: function() {
        return boundFn;
      }
    });
    return context;
  },context);

  Object.keys(middlewareFns).reduce(function(boundMiddleware,fnName){
    boundMiddleware[fnName] = middlewareFns[fnName].bind(context);
    return boundMiddleware;
  },boundMiddleware);


  var autoRtouer = autoRouterHandler.bind(context);
  Object.keys(boundMiddleware).reduce(function(autoRtouer,fn){
    autoRtouer[fn]=boundMiddleware[fn];
    return autoRtouer;
  },autoRtouer);
  autoRtouer.getApplication = context.getApplication;
  autoRtouer.attachDefaults = function(app){
    app.get(context.spConfig.currentUserEndpoint,context.authenticate.bind(context),context.currentUser.bind(context));
    app.get(context.spConfig.logoutEndpoint,context.logout.bind(context));
    app.post(context.spConfig.userCollectionEndpoint,context.register.bind(context));
    app.post(context.spConfig.tokenEndpoint,context.authenticateForToken.bind(context));
    app.post(context.spConfig.resendEmailVerificationEndpoint,context.resendEmailVerification.bind(context));
    app.post(context.spConfig.emailVerificationTokenCollectionEndpoint,context.verifyEmailVerificationToken.bind(context));
    app.get(context.spConfig.passwordResetTokenCollectionEndpoint +'/:sptoken?',context.passwordReset.bind(context));
    app.post(context.spConfig.passwordResetTokenCollectionEndpoint +'/:sptoken?',context.passwordReset.bind(context));
  };

  return autoRtouer;
}


var exports = {
  createMiddleware: createMiddleware
};

Object.keys(middlewareFns).forEach(function(fnName){
  var fn = middlewareFns[fnName];
  var constructorName = fnName.charAt(0).toUpperCase() + fnName.slice(1);
  exports[constructorName] = function(spConfig){
    spConfig = typeof spConfig === 'object' ? spConfig : {};
    var context = new MiddlewareContext(spConfig);
    return fn.bind(context);
  };
});

module.exports = exports;
