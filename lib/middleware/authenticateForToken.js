var url = require('url');

function authenticateForToken(req,res, next){
  var context = this;
  var properties = context.properties;

  var urlParams = url.parse(req.url,true).query;

  if(urlParams.grant_type && urlParams.grant_type==='password'){
    context.authenticateUsernamePasswordForToken(req,res,next);
  }else if(urlParams.grant_type && urlParams.grant_type==='social'){
    context.authenticateSocialForToken(req,res,next);
  }else if(urlParams.grant_type && urlParams.grant_type==='client_credentials'){
    context.authenticateApiKeyForToken(req,res,next);
  }else{
    context.handleAuthenticationError({
      userMessage:properties.errors.authentication.UNSUPPORTED_GRANT_TYPE
    },req,res,next);
  }
}

module.exports = authenticateForToken;