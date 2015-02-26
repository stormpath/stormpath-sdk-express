
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
      res.statusCode = account.status==='ENABLED' ? 201 : 202;
      res.end();
    }
  });

}

module.exports = register;