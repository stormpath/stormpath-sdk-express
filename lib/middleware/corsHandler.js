function corsHandler(req,res,next) {
  var context = this;
  var spConfig = context.spConfig;
  if(req.method === 'OPTIONS' && spConfig.allowedOrigins.indexOf(req.headers.origin)>-1){
    res.setHeader('Access-Control-Allow-Origin',req.headers.origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials','true');
    return res.status(200).end();
  }else if((req.headers.host!==req.headers.origin)){
    if(spConfig.allowedOrigins.indexOf(req.headers.origin)>-1){
      res.setHeader('Access-Control-Allow-Origin',req.headers.origin);
      res.setHeader('Access-Control-Allow-Credentials','true');
    }
  }
  next();
}
module.exports = corsHandler;