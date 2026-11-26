'use strict';

// Plain-text output works in PowerShell, CI and redirected log files.
function createStartupLogger({ output = console, now = () => new Date() } = {}) {
  const write = (level, component, message) => {
    const line = `${now().toISOString()}  ${level.padEnd(5)}  ${component.padEnd(12)}  ${message}`;
    if (level === 'ERROR') output.error(line);
    else output.log(line);
  };
  return {
    banner(version) {
      output.log(`\n  ZENT ERP  /  Backend v${version}\n  ${'-'.repeat(48)}`);
    },
    info(component, message) { write('INFO', component, message); },
    error(component, message, err) {
      // Do not dump connection strings, SQL statements, request data or error stacks.
      const safe = value => typeof value === 'string' && /^[A-Za-z0-9_]{1,48}$/.test(value) ? value : null;
      const details = [safe(err?.name), safe(err?.code)].filter(Boolean).join(' / ');
      write('ERROR', component, details ? `${message} (${details})` : message);
    },
  };
}
function endpoint(host, port, route = '') {
  const formattedHost = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  return `http://${formattedHost}:${port}${route}`;
}
module.exports = { createStartupLogger, endpoint, startupLog: createStartupLogger() };
