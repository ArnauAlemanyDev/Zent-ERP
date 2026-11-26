'use strict';

const { URL } = require('node:url');

function documentUrl(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

function isTrustedDocument(value, entry) {
  const target = documentUrl(value);
  return target !== null && target === documentUrl(entry);
}

// The only external link currently used by the desktop UI is WhatsApp.
function externalUrl(value) {
  try {
    const url = new URL(value);
    if (url.origin !== 'https://wa.me' || url.username || url.password ||
        !/^\/\d+$/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

function isTrustedSender(event, contents, entry) {
  if (!event || !contents || event.sender !== contents) return false;
  try {
    return Boolean(event.senderFrame && event.senderFrame === contents.mainFrame &&
      isTrustedDocument(event.senderFrame.url, entry));
  } catch { return false; }
}

function allowPermission(contents, permission, details, entry) {
  // Copying licence keys and local API access must remain available. CSP limits
  // network destinations separately. No permission is granted to child frames.
  if (!['clipboard-sanitized-write', 'local-network', 'loopback-network'].includes(permission)) return false;
  if (!contents || details?.isMainFrame !== true) return false;
  try {
    return isTrustedDocument(contents.getURL(), entry) &&
      (!details.requestingUrl || isTrustedDocument(details.requestingUrl, entry));
  } catch { return false; }
}

function buildCsp({ development = false, apiUrl = 'http://localhost:3001/api/v1' } = {}) {
  const api = new URL(apiUrl);
  if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password) {
    throw new Error('VITE_API_URL must be an HTTP(S) URL without credentials');
  }
  const connect = new Set([api.origin]);
  if (development) {
    connect.add("'self'");
    connect.add('ws://localhost:5180');
    connect.add('ws://127.0.0.1:5180');
  }
  return [
    "default-src 'none'",
    `script-src 'self'${development ? " 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${[...connect].join(' ')}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
  ].join('; ');
}

module.exports = { isTrustedDocument, externalUrl, isTrustedSender, allowPermission, buildCsp };
