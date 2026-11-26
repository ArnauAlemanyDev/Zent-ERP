'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStartupLogger, endpoint } = require('../src/utils/startupLog');

function capture() {
  const messages = [], errors = [];
  const logger = createStartupLogger({ output: { log: x => messages.push(x), error: x => errors.push(x) }, now: () => new Date('2026-11-26T22:50:00Z') });
  return { logger, messages, errors };
}
test('startup output has a version, timestamp, severity and component', () => {
  const { logger, messages } = capture();
  logger.banner('1.0.0');
  logger.info('API', 'Listening at http://127.0.0.1:3001');
  assert.match(messages[0], /ZENT ERP  \/  Backend v1\.0\.0/);
  assert.equal(messages[1], '2026-11-26T22:50:00.000Z  INFO   API           Listening at http://127.0.0.1:3001');
});
test('connection failures go to stderr without raw error messages or stacks', () => {
  const { logger, messages, errors } = capture();
  const err = Object.assign(new Error('private connection string'), { code: 'ELOGIN' });
  logger.error('DATABASE', 'SQL Server connection failed', err);
  assert.equal(messages.length, 0);
  assert.match(errors[0], /ERROR  DATABASE\s+SQL Server connection failed \(Error \/ ELOGIN\)$/);
  assert.doesNotMatch(errors[0], /private connection string/);
});
test('endpoint formatting respects configured bind address and port', () => {
  assert.equal(endpoint('127.0.0.1', 3001, '/api/v1/health'), 'http://127.0.0.1:3001/api/v1/health');
  assert.equal(endpoint('::1', 8090, '/portal/'), 'http://[::1]:8090/portal/');
});
