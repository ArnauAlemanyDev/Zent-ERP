import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== '--integration')) {
  console.error('Usage: node scripts/test-security.mjs [--integration]');
  process.exit(2);
}
function run(label, args) {
  console.log(`\n  ZENT ERP / ${label}\n  ------------------------------------------------`);
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
const unitFiles = ['backend/test', 'frontend/test'].flatMap(dir => {
  const files = readdirSync(join(root, dir)).filter(name => name.endsWith('.test.js')).sort();
  if (!files.length) throw new Error(`No unit tests found in ${dir}`);
  return files.map(name => `${dir}/${name}`);
});
run('Security unit tests', ['--test', ...unitFiles]);
if (args.includes('--integration')) {
  run('Local HTTP checks', ['scripts/test-security-http.mjs']);
  run('Local SQL authorization checks', ['backend/test/authorization.integration.js']);
} else {
  console.log('\n  Local integration not run (requires running demo API and SQL Server).');
}
console.log('\n  Security test run complete.');
