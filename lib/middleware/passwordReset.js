
function passwordReset(req,res,next){
  var context = this;
  var properties = context.properties;
  var spApplication = context.getApplication();

  if(!spApplication){
    return context.handleApplicationError(properties.errors.library.SP_APP_UNINITIALIZED,res);
  }
  if(req.params.sptoken && req.body.password){
    spApplication.resetPassword(req.params.sptoken,req.body.password,function(err){
      if(err){
        context.handleAuthenticationError(err,req,res,next);
      }else{
        res.status(200).end();
      }
    });
  }
  else if(req.params.sptoken){
    spApplication.verifyPasswordResetToken(req.params.sptoken,function(err){
      if(err){
        context.handleAuthenticationError(err,req,res,next);
      }else{
        res.status(200).end();
      }
    });
  }else{
    spApplication.sendPasswordResetEmail(req.body.username,function(err){
      if(err){
        context.handleAuthenticationError(err,req,res,next);
      }else{
        res.status(201).end();
      }
    });
  }

}

module.exports = passwordReset;