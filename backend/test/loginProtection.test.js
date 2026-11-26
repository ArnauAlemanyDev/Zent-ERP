'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoginLimiter, validateLogin } = require('../src/middleware/loginProtection');

function invoke(middleware, req) {
  const result = { status: 200, next: false, headers: {} };
  const res = {
    set(key, val) { result.headers[key] = val; return this; },
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; },
  };
  middleware(req, res, () => { result.next = true; });
  return result;
}

test('10 requests pass; the 11th receives 429, no-store and Retry-After', () => {
  const limiter = createLoginLimiter({ now: () => 0 });
  const req = { ip: '127.0.0.1' };
  for (let i = 0; i < 10; i++) assert.equal(invoke(limiter, req).next, true);
  const result = invoke(limiter, req);
  assert.equal(result.status, 429);
  assert.equal(result.headers['Retry-After'], '60');
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.next, false);
});
test('separate peers and login routes have separate counters', () => {
  const a = createLoginLimiter({ limit: 1 });
  const b = createLoginLimiter({ limit: 1 });
  assert.equal(invoke(a, { ip: 'peer-a' }).next, true);
  assert.equal(invoke(a, { ip: 'peer-a', headers: { 'x-forwarded-for': 'peer-b' } }).status, 429);
  assert.equal(invoke(a, { ip: 'peer-b' }).next, true);
  assert.equal(invoke(b, { ip: 'peer-a' }).next, true);
});
test('counter resets after window and rejection does not extend it', () => {
  let time = 0;
  const limiter = createLoginLimiter({ limit: 1, windowMs: 1000, now: () => time });
  const req = { ip: 'peer-a' };
  assert.equal(invoke(limiter, req).next, true);
  time = 999;
  assert.equal(invoke(limiter, req).status, 429);
  time = 1000;
  assert.equal(invoke(limiter, req).next, true);
});
test('bounded map refuses new peers when full and reclaims expired entries', () => {
  let time = 0;
  const limiter = createLoginLimiter({ maxKeys: 1, windowMs: 1000, now: () => time });
  assert.equal(invoke(limiter, { ip: 'peer-a' }).next, true);
  assert.equal(invoke(limiter, { ip: 'peer-b' }).status, 429);
  time = 1000;
  assert.equal(invoke(limiter, { ip: 'peer-b' }).next, true);
});
test('login validator accepts ordinary strings without rewriting credentials', () => {
  const body = { email: 'cliente@zent.example', password: 'a password with spaces' };
  assert.equal(invoke(validateLogin, { body }).next, true);
  assert.equal(body.password, 'a password with spaces');
});
test('login validator rejects missing, non-string and oversized values', () => {
  for (const body of [undefined, {}, {email: [], password:'x'}, {email:'a',password:{}},
    {email:' ',password:'x'}, {email:'x'.repeat(101),password:'x'}, {email:'a',password:''},
    {email:'a',password:'é'.repeat(513)}]) {
    const result = invoke(validateLogin, { body });
    assert.equal(result.status, 400);
    assert.equal(result.next, false);
  }
});
