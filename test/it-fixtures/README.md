This folder is where you should place the data that is required to run
itegration tests against the API.  Each expected file is documented here:

### apiAuth.json

This file provides data that is required for testing the API auth features.
It needs a reference to:

* An enabled application
* An enabled account that is reacable by that application
* An enabled API key for that account

**Example**:
```javascript
{
  "apiKeyId": "xxx",
  "apiKeySecret": "xxx",
  "appHref": "https://api.stormpath.com/v1/applications/xxx",
  "accountHref": "https://api.stormpath.com/v1/accounts/xxx",
  "accountApiKeyId": "xxx",
  "accountApiKeySecret": "xxx"
}
```


### loginAuth.json

This file provides data that is required for testing the username & password
authentication features

* An enabled application
* An enabled account that is reacable by that application
* The username and password for that account

**Example**:
```javascript
{
  "apiKeyId": "xxx",
  "apiKeySecret": "xxx",
  "appHref": "https://api.stormpath.com/v1/applications/xxx",
  "accountHref": "https://api.stormpath.com/v1/accounts/xxx",
  "accountUsername": "xxx",
  "accountPassword": "xxxM"
}
```