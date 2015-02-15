
function writeToken(req,res) {
  var context = this;
  var spConfig = context.spConfig;
  var uuid = context.getUuid;
  var jwt = req.jwt;
  if(spConfig.xsrf){
    jwt.body.xsrfToken = uuid();
    res.setHeader('set-cookie','XSRF-TOKEN='+jwt.body.xsrfToken+'; Expires='+new Date(jwt.body.exp*1000).toUTCString()+';Path=/;');
  }
  if(spConfig.writeAccessTokenToCookie){
    var existing = (res.getHeader('Set-Cookie') || res.getHeader('set-cookie') || '') ;
    res.setHeader('set-cookie',
      [existing,
      spConfig.accessTokenCookieName+'='+jwt.compact()+
      '; Expires='+new Date(jwt.body.exp*1000).toUTCString()+'; '+
      ((spConfig.forceHttps || (req.protocol==='https'))?'Secure; ':'')+'HttpOnly;Path=/;']
    );
  }

  if(spConfig.writeAccessTokenResponse){
    res.status(200).json(req.authenticationResult.getAccessTokenResponse(jwt));
  }else{
    res.statusCode = 201;
    res.end();
  }
}

module.exports = writeToken;