# Upgrading to `express-stormath`

This document explains how to migrate your application from the `stormpath-sdk-express`
module to the [`express-stormpath`][] module.

Please see the
[Express-Stormpath Documentation](http://docs.stormpath.com/nodejs/express/latest/)
for the latest documentation of the new library.

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

Previously the middleware was constructed, and then passed your Stormpath application,
like this:

```javascript
var spMiddleware = stormpathExpressSdk.createMiddleware(spConfig);

spMiddleware.attachDefaults(app);
```

With `express-stormpath` the initialization now looks like this:

```javascript
var stormpath = require('express-stormpath');
app.use(stormpath.init(app, {
  website: true, // For websites and Single-page applications
}));
```

See
[Configuration](http://docs.stormpath.com/nodejs/express/latest/configuration.html).

### Login Changes

The new way to login a user is to make a POST to `/login`, with the fields
`username` and `password`.  The POST can be JSON or form encoded. See
[Login](http://docs.stormpath.com/nodejs/express/latest/login.html)

### Registration Changes

New user data should now be posed to `/register` as JSON or form-encoded.  The
new library has a rich engine for customizing the login form, please see
the [Registration](http://docs.stormpath.com/nodejs/express/latest/registration.html)
documentation

### Email verification

To request an email verification token, POST the `email` field to `/verify`.

To verify and consume the email verification token, make a GET request to
`/verify?sptoken=<token>`.

### Password Reset

To request a password reset token, POST the `email` field to `/forgot`.

To verify a password reset token, make a GET request to `/change?sptoken=token`

To consume a password reset token, and save a new password, post the
`password` and `sptoken` fields to `/change`.


### Current user

To get a JSON representation of the currently authenticated user, make a GET
request to `/me`.

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
want to use `stormpath.loginRequired`


```javascript
app.get('/protected',stormpath.loginRequired,function(req,res,next){
  // If we get here, the user has been authenticated
  // The account object is available at req.user
});
```

If you are building an API service that only needs to use client credential and
bearer authentication, use `stormpath.apiAuthenticationRequired`


```javascript
app.get('/api/*',stormpath.apiAuthenticationRequired,function(req,res,next){
  // If we get here, the user has been authenticated
  // The account object is available at req.user
});
```


[`express-stormpath`]: https://github.com/stormpath/express-stormpath