# Express Tenant

## Getting started

>Looking for the framework agnostic version? Wanna build your own middleware? Try [tenant](https://www.npmjs.com/package/tenant)!

### Installation

```bash
$ npm i --save express-tenant
```

**ES5**
```js
var Tenancy = require('express-tenant');
```

**ES6**
```js
import { Tenancy, Tenant, Middleware } from 'tenant';
```

### Tenancy configuration options

```js
import Tenancy from 'tenant';
import Bluebird from 'bluebird';

let tenancy = new Tenancy({
  middlewares = {},
  tenantPath = 'tenant',
  requestKey = 'ENV',
  parse = requestParser,
  defaultTenant: process.env.NODE_ENV || 'development',
  tenants: {
    production: convict({}), // use some library
    staging: config, // a custom module
    development: {}, // a plain object!?
  },
  middlewares: {
    auth(config) {
      return (req, res, next) => {
        // Do some tenant specific stuff here
        next();
      };
    }
  },
  connections: {

    // I apologize.
    salesforce(config) {
      let { username, hostname, password, token } = config.salesforce;
      let conn = new jsforce.Connection({
        loginUrl: hostname,
        accessToken: token,
      });

      return Bluebird.fromCallback(cb => {
        conn.login(username, password + token, cb);
      })
    },

    // Less gross.
    couch(config) {
      return nano(config.couch.url);
    },
    // ...other tenanted connections
  ],
});
```

### Functional initialization

Alternatively you can add connections and tenants functionally

__Example__:
```js
import { Tenancy, Tenant } from 'tenant';

let tenancy = new Tenancy();

let staging = new Tenant('staging', stagingConfig);

tenancy
  .tenant(staging)
  .connection('salesforce', (config) => {
    return Promise.reject(new Error('Really? Still Salesforce?'));
  })
  .middleware('auth', (config) => (req, res, next) => next())
  .middleware('proxy', (config) => (req, res, next) => next())
  .tenant('production', prodConfig);

export default tenancy;
```

### Getting tenant configuration
```js
let secret = tenancy.tenant('production').config.sessionSecret;
```

### Getting a tenant connection
```js
let results = tenancy.tenant('staging').connection('couch')
  .then(CouchDB => {
    let Users = CouchDB.use('users');
    return Users.list();
  });
```

### Using the middleware

```js
import tenancy from './lib/tenant';
import express from 'express';

let app = express();

// Must come before other tenant middlewares
app.use(tenancy.inject());

// Uses tenanted middlewares
app.use(tenancy.middleware('auth'));

// tenant is available on the defined `tenantPath`
app.use((req, res, next) => {
  req.tenant.connection('salesforce')
    .then(SF => {
      SF.sobject('Lead')
        .update({})
        .then(res.send.bind(res))
        .catch(next);
    })
});
```

## API Reference

### Tenancy

#### Methods
------------

#### `constructor(params)`

**params** `Object`

>**Example**
```js
new Tenancy({

  // Path on the request object that the current tenant will be set.
  tenantPath: 'tenant',

  // Key that the default request parser looks for
  requestKey: 'ENV',

  // Request parser. Determines the tenant for a request
  parse(key, req) {
    if (!key) return;
    return req.get(key)
        || req.get(`X-${key}`)
        || req.query[key]
        || req.query[key.toLowerCase()];
  },

  // Tenant configurations
  tenants: {
    staging: { /* Staging config */ }
  },

  // Tenanted middlewares
  middlewares: {
    auth(config) {
      return (req, res, next) => next();
    }
  },

  // Tenanted connections
  connections: {
    couch: function(config) {
      return Promise.resolve('yay');
    },
  },

  // Default tenant if none is provided
  defaultTenant: process.env.NODE_ENV || 'development',
});
```

#### `tenant(tenant)`

**tenant** [`Tenant`](#tenant)

>**Example**
```js
tenancy.tenant(new Tenant('staging', {}));
```

#### `tenant([name])`

**name** `String` _(optional)_

Returns a tenant by the name or the default tenant if none is provided

#### `tenant(name, config)`

**name** `String`

**config** `Object`

>**Example**
```js
tenancy.tenant('staging', {});
```

#### `connection(name, factory)`

**name** `String`

Key associated with a connection factory.

**factory** `Function`

Connection factories are functions with tenant configuration as the last argument.
Connection factory function must return a promise, an object, or throw an error.

>**Example**
```js
tenancy.connection('couch', function(config){
  return nano(config.url);
});
```

#### `middleware(name)`

Returns a tenanted middleware by the name.

#### `middleware(name, factory)`

**name** `String`

Key associated with a middleware factory.

**factory** `Function`

Middleware factories are functions with tenant configuration as the only argument.
Middleware factory function must return an Express middleware.

>**Example**
```js
tenancy.middleware('auth', function(config){
  return passport.init(config.passport);
});
```

### Tenant

#### Methods

#### `constructor(name, configuration, connectionsMap)`

**name**
String

Key used to retrieve this tenant

**configuration**
Object

Configuration object that gets passed to connection factories.

**connectionsMap**
Object

Key-Value pairs of connections names and factory methods

#### `connection(name)`

**name** `String`

Returns a promise that will resolve with the tenanted connection

#### Properties

#### `name`

Tenant name

#### config

Tenant configuration
