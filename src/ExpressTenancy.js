import { get, set, coalesce } from 'object-path';
import assert from 'assert';
import Promise from 'bluebird';
import { Router } from 'express';
import { Middleware } from 'tenant';

export default class ExpressTenancy extends Middleware {
  constructor(config) {
    super(config);
  }
  inject(req, res, next) {
    this.parse(req)
      .then((tenantKey = this.defaultTenant) => {
        let tenant = get(this, ['tenants', tenantKey]);

        set(req, this.tenantPath, tenant);
        next();
      })
      .catch(next);
  }
  middleware(key, factory, isInternal) {
    // Getter
    if (!factory) return this.middlewares[key];
    factory = factory.bind(this);

    // For internal parse middlewares
    if (isInternal) {
      this.middlewares[key] = factory();
      return this;
    }

    // Setter
    let router = new Router();
    router.use(this.addURLPrefix.bind(this));
    for (let tenant in this.tenants) {
      router.use(`/${tenant}`, factory(this.tenants[tenant]));
    }
    router.use(this.removeURLPrefix.bind(this));
    this.middlewares[key] = router;
    return this;
  }
  parseRequest(req, res, next) {
    let tenant = get(req, this.tenantPath);

    req.url = `/${tenant.get('env')}${req.url}`;
    next();
  }
  formatRequest(req, res, next) {
    req.url = req.originalUrl;
    next();
  }
}
