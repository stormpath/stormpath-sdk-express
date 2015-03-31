var jwtErrors = require('njwt/properties.json').errors;

function authenticateBearerAuthorizationHeader(req,res,next){
  var context = this;
  var properties = context.properties;

  var spApplication = context.getApplication();

  if(!spApplication){
    return context.handleApplicationError(properties.errors.library.SP_APP_UNINITIALIZED,res);
  }

  var accessToken = (req.headers.authorization || '').replace(/Bearer /i,'');

  if(!accessToken){
    return context.handleAuthenticationError({
      userMessage:properties.errors.authentication.UNAUTHENTICATED
    },req,res,next);
  }

  context.jwsClaimsParser.parseClaimsJws(accessToken,function(err,jwt){
    if(err){
      if(err.userMessage===jwtErrors.PARSE_ERROR){
        err.statusCode = 400;
      }
      context.handleAuthenticationError(err,req,res,next);
    }else{
      req.accessToken = jwt;
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
  });
}
module.exports = authenticateBearerAuthorizationHeader;