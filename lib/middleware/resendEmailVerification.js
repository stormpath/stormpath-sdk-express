
function resendVerificationEmail(req,res,next){
  var context = this;
  var properties = context.properties;
  var spApplication = context.getApplication();

  if(!spApplication){
    return context.handleApplicationError(properties.errors.library.SP_APP_UNINITIALIZED,res);
  }
  spApplication.resendVerificationEmail(req.body,function(err){
    if(err){
      context.handleAuthenticationError(err,req,res,next);
    }else{
      res.statusCode = 201;
      res.end();
    }
  });

}

module.exports = resendVerificationEmail;