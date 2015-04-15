
function authenticate(req,res,next){
  var context = this;
  var spConfig = context.spConfig;
  var properties = context.properties;
  var authHeader = req.headers.Authorization || req.headers.authorization;
  var authCookie = req.cookies && req.cookies[spConfig.accessTokenCookieName];
  if( authHeader && authHeader.match(/Bearer/)){
    context.authenticateBearerAuthorizationHeader(req,res,context.xsrfValidator.bind(context,req,res,next));
  }else if(authCookie){
    context.authenticateCookie(req,res,context.xsrfValidator.bind(context,req,res,next));
  }else if(authHeader && authHeader.match(/Basic/)){
    context.authenticateBasicAuth(req,res,context.xsrfValidator.bind(context,req,res,next));
  }else{
    context.handleAuthenticationError({
      userMessage:properties.errors.authentication.UNAUTHENTICATED
    },req,res,next);
  }

}

module.exports = authenticate;