import { get, set, coalesce } from 'object-path';
import assert from 'assert';
import Promise from 'bluebird';
import { Router } from 'express';
import { Middleware, Tenant } from 'tenant';

export default class ExpressTenancy extends Middleware {
  constructor(...config) {
    super(...config);
  }
  inject() {
    return (req, res, next) => {
      this.parse(req)
        .then((tenantKey = this.defaultTenant) => {
          let tenant = get(this, ['tenants', tenantKey]);

          set(req, this.tenantPath, tenant);
          next();
        })
        .catch(next);
    }
  }
  middleware(name, factory) {
    // Getter
    if (!factory) return this.middlewares[name];

    // Setter
    let router = new Router();
    router.use(this.parseRequest.bind(this));

    factory = factory.bind(this);
    for (let key in this.tenants) {
      router.use(`/${key}`, factory(this.tenant(key).config));
    }
    router.use(this.formatRequest.bind(this));
    this.middlewares[name] = router;
    return this;
  }
  parseRequest(req, res, next) {
    let tenant = get(req, this.tenantPath);

    req.url = `/${tenant.config.get('env')}${req.url}`;
    next();
  }
  formatRequest(req, res, next) {
    req.url = req.originalUrl;
    next();
  }
}
