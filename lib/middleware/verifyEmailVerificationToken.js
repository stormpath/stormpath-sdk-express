
function verifyEmailVerificationToken(req,res,next){
  var context = this;
  var properties = context.properties;
  var spTenant = context.getTenant();

  if(!spTenant){
    return context.handleApplicationError(properties.errors.library.SP_TENANT_UNINITIALIZED,res);
  }

  spTenant.verifyAccountEmail(req.body.sptoken,function(err){
    if(err){
      context.handleAuthenticationError(err,req,res,next);
    }else{
      res.statusCode = 202;
      res.end();
    }
  });

}

module.exports = verifyEmailVerificationToken;