// Local demo only. GET checks do not modify business records; login may update audit logs.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';

const config = parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'));
const local = ['127.0.0.1', 'localhost', '::1'];
if (!local.includes(config.DB_HOST) || config.DB_NAME !== 'zent_gestion' ||
    config.DB_USER !== 'zent_app' || (config.BIND_HOST && !local.includes(config.BIND_HOST))) {
  throw new Error('Use only the local Zent ERP demo configuration.');
}
if (!config.DEMO_EQUIPO || !config.DEMO_PORTAL) throw new Error('Demo credentials missing from .env');
const internal = 'http://127.0.0.1:3001';
const external = 'http://127.0.0.1:8090';
let count = 0;
async function request(base, route, { token, origin, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (origin) headers.Origin = origin;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(base + route, { method: body === undefined ? 'GET' : 'POST', headers,
    body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(10000) });
}
async function status(label, base, route, expected, options) {
  const res = await request(base, route, options);
  if (res.status !== expected) {
    await res.body?.cancel();
    throw new Error(`${label}: expected HTTP ${expected}, got ${res.status}`);
  }
  console.log(`PASS ${label} (${expected})`); count++;
  return res;
}
async function check(label, base, route, expected, options) {
  const res = await status(label, base, route, expected, options);
  await res.body?.cancel();
}
async function login(label, base, route, email, password) {
  const res = await status(label, base, route, 200, { body: { email, password } });
  const data = await res.json();
  if (typeof data.token !== 'string' || !data.token) throw new Error(`${label}: missing token`);
  return data.token;
}
try {
  const health = await status('API health', internal, '/api/v1/health', 200);
  for (const [name, value] of Object.entries({ 'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', 'cache-control': 'no-store' })) {
    assert.equal(health.headers.get(name), value, `Missing or incorrect ${name}`);
    console.log(`PASS Header ${name}`); count++;
  }
  assert.equal(health.headers.has('x-powered-by'), false, 'Unexpected X-Powered-By header');
  console.log('PASS Express identification absent'); count++;
  await health.body?.cancel();
  for (const route of ['/clientes', '/tickets', '/albaranes', '/licencias/windows']) {
    await check(`Anonymous internal ${route}`, internal, '/api/v1' + route, 401);
  }
  await check('Anonymous portal tickets', external, '/api/portal/tickets', 401);
  for (const route of ['/api/v1/clientes', '/api/v1/health']) {
    await check(`Portal port isolates ${route}`, external, route, 404);
  }
  await check('Unapproved origin rejected', internal, '/api/v1/health', 403, { origin: 'https://not-approved.example' });
  const team = await login('Demo staff login', internal, '/api/v1/auth/login', 'equipo@zent.example', config.DEMO_EQUIPO);
  const client = await login('Demo client login', external, '/api/portal/auth/login', 'cliente@zent.example', config.DEMO_PORTAL);
  await check('Staff reads clients', internal, '/api/v1/clientes', 200, { token: team });
  await check('Client reads own tickets', external, '/api/portal/tickets', 200, { token: client });
  await check('Client denied internal clients', internal, '/api/v1/clientes', 403, { token: client });
  await check('Client denied licences', internal, '/api/v1/licencias/windows', 403, { token: client });
  await check('Staff denied portal tickets', external, '/api/portal/tickets', 403, { token: team });
  await check('Invalid token rejected', internal, '/api/v1/clientes', 401, { token: 'invalid-test-token' });
  console.log(`\n${count} HTTP checks passed.`);
} catch (error) {
  // Only print controlled assertion messages; never dump responses, tokens or config.
  console.error('FAIL ' + (error.name === 'AssertionError' ? error.message.split('\n')[0] : error.message));
  process.exitCode = 1;
}
