'use strict';

function defaultResponder(req,res){
  res.statusCode = req.user.status==='ENABLED' ? 201 : 202;
  res.end();
}

function register(req,res,next){
  var context = this;
  var properties = context.properties;
  var spApplication = context.getApplication();

  if(!spApplication){
    return context.handleApplicationError(properties.errors.library.SP_APP_UNINITIALIZED,res);
  }
  spApplication.createAccount(req.body,function(err,account){
    if(err){
      context.handleAuthenticationError(err,req,res,next);
    }else{
      req.user = account;
      if(context.postRegistrationHandler){
        context.postRegistrationHandler(req,res,defaultResponder.bind(null,req,res));
      }else{
        defaultResponder(req,res);
      }
    }
  });

}

module.exports = register;