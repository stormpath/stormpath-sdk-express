var url = require('url');

function authenticateUsernamePasswordForToken(req,res, next){
  var context = this;
  var properties = context.properties;
  var spApplication = context.getApplication();

  var tokenWriter = context.tokenWriter;
  var scopeFactory = context.scopeFactory;

  var urlParams = url.parse(req.url,true).query;
  var requestedScope = (req.body && req.body.scope) || urlParams.scope || '';
  if(!spApplication){
    return context.handleApplicationError(properties.errors.library.SP_APP_UNINITIALIZED,res);
  }
  else if(req.body && req.body.username && req.body.password){
    spApplication.authenticateAccount({username:req.body.username,password:req.body.password},function(err,authenticationResult){
      if(err){
        if(err.userMessage==='Invalid username or password.'){
          err.status = 401;
        }
        context.handleAuthenticationError(err,req,res,next);
      }else{
        req.authenticationResult = authenticationResult;
        authenticationResult.getAccount({expand:'groups,customData'},function(err,account){
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
                  tokenWriter(req,res);
                }else{
                  tokenWriter(req,res);
                }
              });

            }else if(context.spConfig.writeTokens){
              tokenWriter(req,res);
            }else{
              next();
            }
          }
        });

      }
    });
  }else{
    context.handleAuthenticationError({
      status: 400,
      userMessage:properties.errors.authentication.BAD_PASSWORD_BODY
    },req,res,next);
  }
}

module.exports = authenticateUsernamePasswordForToken;