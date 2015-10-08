# Upgrading to `express-stormath`

This document explains how to migrate your application from the `stormpath-sdk-express`
module to the `express-stormpath` module

### Environment variables

The format of our environment variables has changed.  If you are using environment
variables to pass your Stormpath configuration to your application, you will
need to update the values accordingly:

| Old Name                 | New Name                       |
| ------------------------ | -------------------------------|
| STORMPATH_API_KEY_ID     | STORMPATH_CLIENT_APIKEY_ID     |
| STORMPATH_API_KEY_SECRET | STORMPATH_CLIENT_APIKEY_SECRET |
| STORMPATH_APP_HREF       | STORMPATH_APPLICATION_HREF     |

### Initialization

Previously the middleware was construgted, and then passed your stormpath aplication,
like this:

```javascript
var spMiddleware = stormpathExpressSdk.createMiddleware(spConfig);

spMiddleware.attachDefaults(app);
```

With `express-stormpath` the initialization now looks like this:

```javascript
var expressStormpath = require('express-stormpath');
app.use(expressStormpath.init(app, {
  website: true, // if building a traditional server-side rendered app
  api: true      // if building an API-only service
}));
```

### Forcing Authentication

Previously, you would use the `authenticate` middleware like this:

```javascript
app.get('/api/*',spMiddleware.authenticate,function(req,res,next){
  // If we get here, the user has been authenticated
  // The account object is available at req.user
});
```

Now there are two options.

If you are building a traditional web app or single-page app (Angular), then you
want to use `expressStormpath.loginRequired`


```javascript
app.get('/protected',expressStormpath.loginRequired,function(req,res,next){
  // If we get here, the user has been authenticated
  // The account object is available at req.user
});
```

If you are building an API service that only needs to use client credential and
bearer authentication, use `expressStormpath.apiAuthenticationRequired`


```javascript
app.get('/api/*',expressStormpath.apiAuthenticationRequired,function(req,res,next){
  // If we get here, the user has been authenticated
  // The account object is available at req.user
});
```

Note: a future release of `express-stormpath` will consolidate these methods
into a common `authenticationRequired` middleware