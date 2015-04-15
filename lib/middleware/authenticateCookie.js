function authenticateCookie(req,res,next){
  var context = this;
  var properties = context.properties;
  var spClient = context.spClient;
  var spConfig = context.spConfig;

  if(!req.cookies || (typeof req.cookies !== 'object')){
    return context.handleApplicationError(properties.errors.MISSING_COOKIE_MIDDLEWARE,res);
  }

  var accessToken = req.cookies[spConfig.accessTokenCookieName];

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
      spClient.getAccount(jwt.body.sub,function(err,account){
        if(err){
          context.handleAuthenticationError(err,req,res,next);
        }else if(account.status==='ENABLED'){
          req.user = account;
          next();
        }else{
          context.handleAuthenticationError({
            userMessage:properties.errors.authentication.UNAUTHENTICATED
          },req,res,next);
        }
      });
    }
  });

}

module.exports = authenticateCookie;