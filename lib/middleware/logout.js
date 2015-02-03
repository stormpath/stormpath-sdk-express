function logout(req,res) {
  var context = this;
  var spConfig = context.spConfig;
  var now = new Date().toUTCString();
  var existing = (res.getHeader('Set-Cookie') || res.getHeader('set-cookie') || '') ;
  var cookies = existing ? [existing] : [];
  if(req.cookies && req.cookies['XSRF-TOKEN']){
    cookies.push('XSRF-TOKEN=delete; Expires='+now+';Path=/;');
  }
  if(req.cookies && req.cookies[spConfig.accessTokenCookieName]){
    cookies.push(
      spConfig.accessTokenCookieName+'=delete; Expires='+new Date().toUTCString()+'; '+
      ((spConfig.forceHttps || (req.protocol==='https'))?'Secure; ':'')+'HttpOnly;Path=/;'
    );
  }

  if(cookies.length){
    res.setHeader('set-cookie',cookies);
  }

  res.statusCode = 204;
  res.end();

}

module.exports = logout;