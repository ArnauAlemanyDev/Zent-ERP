'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createOriginPolicy, securityHeaders, createApiGuard, validatePortalTicket, apiErrorHandler } = require('../src/middleware/apiSecurity');
function req(path, origin, peer = '127.0.0.1') { return { path, headers: origin === undefined ? {} : { origin }, socket: { remoteAddress: peer } }; }
function response() {
  return { headers: {}, statusCode: 200, set(k,v) { this.headers[k]=v; return this; }, vary(k) { this.headers.Vary=k; return this; }, status(c) { this.statusCode=c; return this; }, json(b) { this.body=b; return this; } };
}
test('only approved development and portal origins are accepted for their API', () => {
  const allow = createOriginPolicy({});
  assert.equal(allow(req('/v1/clientes','http://localhost:5180')), true);
  assert.equal(allow(req('/v1/clientes','http://127.0.0.1:5180')), true);
  assert.equal(allow(req('/portal/tickets','http://localhost:8090')), true);
  assert.equal(allow(req('/portal/tickets','http://127.0.0.1:3001')), true);
  assert.equal(allow(req('/portal/tickets','http://localhost:5173')), true);
  assert.equal(allow(req('/v1/clientes','http://localhost:8090')), false);
  assert.equal(allow(req('/portal/tickets','http://localhost:5180')), false);
  assert.equal(allow(req('/v1/clientes','https://untrusted.example')), false);
  assert.equal(allow(req('/v1/clientes','http://localhost:5180.evil.example')), false);
});
test('opaque Electron origin is allowed only on internal API for loopback peers', () => {
  const allow = createOriginPolicy({});
  assert.equal(allow(req('/v1/clientes','null')), true);
  assert.equal(allow(req('/v1/clientes','null','::ffff:127.0.0.1')), true);
  assert.equal(allow(req('/portal/tickets','null')), false);
  assert.equal(allow(req('/v1/clientes','null','192.0.2.1')), false);
  assert.equal(allow(req('/v1/clientes',undefined)), true);
});
test('configured ports and explicit extra origins work; invalid origins fail closed', () => {
  const allow = createOriginPolicy({ PORTAL_PORT: '9000', ZENT_PORTAL_ORIGINS: 'https://portal.example' });
  assert.equal(allow(req('/portal/tickets','http://localhost:9000')), true);
  assert.equal(allow(req('/portal/tickets','https://portal.example')), true);
  assert.equal(allow(req('/portal/tickets','http://localhost:8090')), false);
  assert.throws(() => createOriginPolicy({ZENT_ERP_ORIGINS:'*'}));
  assert.throws(() => createOriginPolicy({ZENT_ERP_ORIGINS:'https://example.com/path'}));
});
test('guard denies unapproved origin before handler and disables API caching', () => {
  const guard = createApiGuard(createOriginPolicy({}));
  const res = response(); let called = false;
  guard(req('/v1/auth/login','https://untrusted.example'), res, () => { called=true; });
  assert.equal(res.statusCode,403); assert.equal(called,false); assert.equal(res.headers['Cache-Control'],'no-store'); assert.equal(res.headers.Vary,'Origin');
  guard(req('/v1/auth/login',undefined), response(), () => { called=true; }); assert.equal(called,true);
});
test('security headers are set', () => {
  const res=response(); let called=false;
  securityHeaders({},res,()=>{called=true;});
  assert.equal(called,true); assert.equal(res.headers['X-Content-Type-Options'],'nosniff'); assert.equal(res.headers['X-Frame-Options'],'DENY'); assert.equal(res.headers['Referrer-Policy'],'no-referrer');
});
test('valid portal tickets pass without rewriting data', () => {
  for (const body of [{titulo:'Prueba',descripcion:'Texto'}, {titulo:' Prueba ',descripcion:'Texto',prioridad:'urgente',contacto:'123'}]) {
    let called=false; const old=JSON.stringify(body); validatePortalTicket({body},response(),()=>{called=true;}); assert.equal(called,true); assert.equal(JSON.stringify(body),old);
  }
});
test('invalid portal tickets are rejected before reaching database', () => {
  const good={titulo:'Prueba',descripcion:'Texto'};
  for(const body of [undefined, [], {}, {...good,titulo:{}}, {...good,titulo:' '}, {...good,titulo:'x'.repeat(256)}, {...good,descripcion:42}, {...good,prioridad:'wrong'}, {...good,contacto:[]}, {...good,contacto:'x'.repeat(256)}]) {
    const res=response(); validatePortalTicket({body},res,()=>assert.fail('unexpected next')); assert.equal(res.statusCode,400);
  }
});
test('parser errors use safe messages and correct status codes', () => {
  for(const status of [400,413,415]) { const res=response(); apiErrorHandler({status, message:'secret',body:'secret'}, {},res,()=>assert.fail('unexpected next')); assert.equal(res.statusCode,status); assert.equal(JSON.stringify(res.body).includes('secret'),false); }
});
