var url = require('url');

function authenticateSocialForToken(req,res, next){
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
  else if(req.body && req.body.providerId && req.body.accessToken) {
    spApplication.getAccount({
      providerData: {
        providerId: req.body.providerId,
        accessToken: req.body.accessToken
      }
    }, function (err, accountResult) {
      if (err) {
        context.handleAuthenticationError(err, req, res, next);
      } else {
        // writeTokens expects an authenticationResult, so we'll act like one
        req.authenticationResult = accountResult;
        req.authenticationResult.getAccessTokenResponse = function getAccessTokenResponse(jwt) {
          jwt = jwt || this.getJwt();
          var resp = {
            'access_token': jwt.compact(),
            'token_type': 'Bearer',
            'expires_in': jwt.ttl
          };
          if (jwt.body.scope) {
            resp.scope = jwt.body.scope;
          }
          return resp;
        };
        req.user = accountResult.account;
        req.jwt = context.jwtLib.Jwt({
          iss: context.spConfig.appHref,
          sub: accountResult.account.href,
          jti: context.getUuid()
        }).signWith('HS256',context.spConfig.apiKeySecret).setTtl(3600);

        if (context.spConfig.writeTokens && scopeFactory) {
          scopeFactory(req, res, accountResult, accountResult.account, requestedScope,
              function (err, scope) {
                if (err) {
                  context.handleAuthenticationError(err, req, res, next);
                } else if (scope) {
                  req.jwt.body.scope = scope;
                  tokenWriter(req, res);
                } else {
                  tokenWriter(req, res);
                }
              });
        } else if (context.spConfig.writeTokens) {
          tokenWriter(req, res);
        } else {
          next();
        }
      }
    });
  }else{
    context.handleAuthenticationError({
      status: 400,
      userMessage:properties.errors.authentication.BAD_ACCESS_TOKEN_BODY
    },req,res,next);
  }
}

module.exports = authenticateSocialForToken;