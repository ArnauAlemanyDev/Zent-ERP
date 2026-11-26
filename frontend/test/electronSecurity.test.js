'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isTrustedDocument, externalUrl, isTrustedSender, allowPermission, buildCsp } = require('../electron/securityPolicy');

const dev = 'http://localhost:5180/';
const packaged = 'file:///C:/Zent%20ERP/resources/app.asar/dist/index.html';

test('only the exact development document and its hash routes are trusted', () => {
  assert.ok(isTrustedDocument(dev + '#/tickets/1', dev));
  for (const url of ['http://localhost:5181/', 'http://localhost:5180/other', 'http://localhost:5180/?other=1', 'https://localhost:5180/', 'http://localhost:5180.evil.example/', 'http://user@localhost:5180/', null]) assert.equal(isTrustedDocument(url, dev), false);
});
test('packaged document permits hash routes but not other local files', () => {
  assert.ok(isTrustedDocument(packaged + '#/login', packaged));
  assert.equal(isTrustedDocument('file:///C:/other.html', packaged), false);
  assert.equal(isTrustedDocument(dev, packaged), false);
});
test('only the existing HTTPS WhatsApp link is passed to the OS', () => {
  assert.equal(externalUrl('https://wa.me/34600000000?text=Hola'), 'https://wa.me/34600000000?text=Hola');
  for (const url of ['http://wa.me/123', 'https://wa.me.evil.example/123', 'https://user@wa.me/123', 'https://wa.me:444/123', 'https://wa.me/other', 'file:///C:/test', 'javascript:alert(1)', 'https://example.com/']) assert.equal(externalUrl(url), null);
});
test('IPC requires the exact webContents and its trusted main frame', () => {
  const frame = { url: dev + '#/dashboard' };
  const contents = { mainFrame: frame };
  assert.ok(isTrustedSender({ sender: contents, senderFrame: frame }, contents, dev));
  assert.equal(isTrustedSender({ sender: {}, senderFrame: frame }, contents, dev), false);
  assert.equal(isTrustedSender({ sender: contents, senderFrame: { url: dev } }, contents, dev), false);
  frame.url = 'https://example.com/';
  assert.equal(isTrustedSender({ sender: contents, senderFrame: frame }, contents, dev), false);
});
test('only required permissions from the trusted main document pass', () => {
  const contents = { getURL: () => packaged + '#/licencias' };
  const details = { isMainFrame: true, requestingUrl: packaged };
  for (const permission of ['clipboard-sanitized-write', 'local-network', 'loopback-network']) assert.ok(allowPermission(contents, permission, details, packaged));
  for (const permission of ['clipboard-read', 'media', 'geolocation', 'usb', 'notifications']) assert.equal(allowPermission(contents, permission, details, packaged), false);
  assert.equal(allowPermission(contents, 'clipboard-sanitized-write', { ...details, isMainFrame: false }, packaged), false);
  assert.equal(allowPermission(contents, 'clipboard-sanitized-write', { ...details, requestingUrl: 'https://example.com/' }, packaged), false);
});
test('production CSP restricts scripts, frames and connections', () => {
  const csp = buildCsp();
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /connect-src http:\/\/localhost:3001;/);
  assert.match(csp, /frame-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval|ws:\/\//);
  assert.match(csp, /style-src 'self' 'unsafe-inline'/);
});
test('development CSP accommodates Vite HMR without relaxing production', () => {
  const csp = buildCsp({ development: true, apiUrl: 'http://127.0.0.1:4000/api/v1' });
  assert.match(csp, /script-src 'self' 'unsafe-inline'/);
  assert.match(csp, /connect-src http:\/\/127.0.0.1:4000 'self' ws:\/\/localhost:5180 ws:\/\/127.0.0.1:5180/);
  assert.throws(() => buildCsp({ apiUrl: 'file:///C:/secret' }));
  assert.throws(() => buildCsp({ apiUrl: 'http://user:pass@localhost:3001/' }));
});
