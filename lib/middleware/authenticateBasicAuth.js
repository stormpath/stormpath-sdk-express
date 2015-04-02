function authenticateBasicAuth(req,res,next){
  var context = this;
  var spApplication = context.getApplication();
  var properties = context.properties;
  if(!spApplication){
    return context.handleApplicationError(properties.errors.library.SP_APP_UNINITIALIZED,res);
  }
  spApplication.authenticateApiRequest({
    request: req
  },function(err,authenticationResult){
    req.authenticationResult = authenticationResult;
    if(err){
      context.handleAuthenticationError(err,req,res,next);
    }else{
      authenticationResult.getAccount(function(err,account){
        if(err){
          context.handleAuthenticationError(err,req,res,next);
        }else{
          req.user = account;
          next();
        }
      });
    }

  });
}

module.exports = authenticateBasicAuth;