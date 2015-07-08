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

function autoRouterHandler(context,req,res,next){
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

  /*
    The middleware context is where we maintain everything
    that Stormpath needs to get work done with this module.
    It has a Stormpath Client, bound to a Stormpath application.
    It retains the given config, as well as the properties
    file that defines all the strings for error messages and
    user messages.
   */
  spConfig = typeof spConfig === 'object' ? spConfig : {};
  var context = new MiddlewareContext(spConfig);
  var boundMiddleware = {};

  /*
    For each exported middleware function, create a bound version
    which is bound to the middleware context
  */

  Object.keys(middlewareFns).reduce(function(boundMiddleware,fnName){
    boundMiddleware[fnName] = middlewareFns[fnName].bind(context);
    return boundMiddleware;
  },boundMiddleware);

  /*
    For all middleware functions, we want to do CORS filtering
    first (do we need to add cors handlers)?
   */

  Object.keys(boundMiddleware).forEach(function(fnName){
    var fn = boundMiddleware[fnName];
    if(fnName!=='corsHandler' && fnName!=='groupsRequired'){
      boundMiddleware[fnName] = function corsPrefilter(req,res,next){
        boundMiddleware.corsHandler(req,res,fn.bind(context,req,res,next));
      };
    }
  });

  /*
    Attach each bound function to the middleware context, using the
    function name as the property.  The middleware context then has
    access to these named functions, so that it can delegate requests
    to them.
   */

  Object.keys(boundMiddleware).forEach(function(fnName){
    context[fnName] = boundMiddleware[fnName];
  });

  /*
    We pass along the bound middleware to the "auto router", the
    "auto router" is the function that is passed to app.use()
    if you use the statement app.use(stormpathMiddlweare)
   */

  var autoRouter = autoRouterHandler.bind(null,context);
  Object.keys(boundMiddleware).reduce(function(autoRouter,fn){
    autoRouter[fn]=boundMiddleware[fn];
    return autoRouter;
  },autoRouter);
  autoRouter.getApplication = context.getApplication;
  autoRouter.spClient = context.spClient;

  /*
    attachDefaults is used to manually bind middleware to
    specific endpoints and methods, rather than a single middleware
    that you use with the autoRouter
   */

  autoRouter.attachDefaults = function(app){
    app.get(context.spConfig.currentUserEndpoint,
      context.authenticate.bind(context),
      context.currentUser.bind(context)
    );
    app.get(context.spConfig.logoutEndpoint,boundMiddleware.logout);
    app.post(context.spConfig.userCollectionEndpoint,boundMiddleware.register);
    app.post(context.spConfig.tokenEndpoint,boundMiddleware.authenticateForToken);
    app.options(context.spConfig.tokenEndpoint,boundMiddleware.authenticateForToken);
    app.post(context.spConfig.resendEmailVerificationEndpoint,boundMiddleware.resendEmailVerification);
    app.options(context.spConfig.resendEmailVerificationEndpoint,boundMiddleware.resendEmailVerification);
    app.post(context.spConfig.emailVerificationTokenCollectionEndpoint,boundMiddleware.verifyEmailVerificationToken);
    app.options(context.spConfig.emailVerificationTokenCollectionEndpoint,boundMiddleware.verifyEmailVerificationToken);
    app.get(context.spConfig.passwordResetTokenCollectionEndpoint +'/:sptoken?',boundMiddleware.passwordReset);
    app.post(context.spConfig.passwordResetTokenCollectionEndpoint +'/:sptoken?',boundMiddleware.passwordReset);
    app.options(context.spConfig.passwordResetTokenCollectionEndpoint +'/:sptoken?',boundMiddleware.passwordReset);
  };

  return autoRouter;
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
