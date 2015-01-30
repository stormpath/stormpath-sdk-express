function authenticateCookie(req,res,next){
  var context = this;
  var properties = context.properties;
  var spClient = context.spClient;

  if(!req.cookies || (typeof req.cookies !== 'object')){
    return context.handleApplicationError(properties.errors.MISSING_COOKIE_MIDDLEWARE,res);
  }

  var accessToken = req.cookies.access_token;

  if(!accessToken){
    return context.handleAuthenticationError({
      status: 400,
      userMessage:properties.errors.authentication.UNAUTHENTICATED
    },req,res,next);
  }

  context.jwsClaimsParser.parseClaimsJws(accessToken,function(err,jwt){

    if(err){
      context.handleAuthenticationError({
        status: 400,
        userMessage: err.userMessage
      },req,res,next);
    }else{
      req.accessToken = jwt;
      spClient.getAccount(jwt.body.sub,{expand:'groups,customData'},function(err,account){
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

module.exports = authenticateCookie;