var url = require('url');

function authenticateApiKeyForToken(req,res,next){
  var context = this;
  var properties = context.properties;
  var scopeFactory = context.scopeFactory;
  var spApplication = context.getApplication();
  var urlParams = url.parse(req.url,true).query;
  var requestedScope = (req.body && req.body.scope) || urlParams.scope || '';

  if(!spApplication){
    return context.handleApplicationError(properties.errors.library.SP_APP_UNINITIALIZED,res);
  }
  spApplication.authenticateApiRequest({request: req}, function(err,authenticationResult){
    if(err){
      context.handleAuthenticationError(err,req,res,next);
    }else{
      req.authenticationResult = authenticationResult;

      authenticationResult.getAccount(function(err,account){
        if(err){
          context.handleAuthenticationError(err,req,res,next);
        }else{
          req.user = account;
          req.jwt = authenticationResult.getJwt().setTtl(context.spConfig.accessTokenTtl);
          if(context.spConfig.writeTokens && scopeFactory){

            scopeFactory(req,res,authenticationResult,account,requestedScope,function(err,scope){
              if(err){
                context.handleAuthenticationError(err,req,res,next);
              }else if(scope){
                req.jwt.body.scope = scope;
                res.status(200).json(req.authenticationResult.getAccessTokenResponse(req.jwt));
              }else{
                res.status(200).json(req.authenticationResult.getAccessTokenResponse(req.jwt));
              }
            });

          }else if(context.spConfig.writeTokens){
            res.status(200).json(req.authenticationResult.getAccessTokenResponse(req.jwt));
          }else{
            next();
          }
        }
      });

    }
  });
}

module.exports = authenticateApiKeyForToken;