var fs = require('fs');
var path = require('path');
var url = require('url');

var MiddlewareContext = require('./lib/MiddlewareContext');

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
