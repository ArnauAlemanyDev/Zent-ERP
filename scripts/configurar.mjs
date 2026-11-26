import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const secret = () => 'Ze!' + randomBytes(24).toString('hex');
const config = [
  'DB_HOST=127.0.0.1', 'DB_PORT=1433', 'DB_NAME=zent_gestion',
  'DB_LICENSE_NAME=zent_licencias', 'DB_USER=zent_app',
  'DB_PASSWORD=' + secret(), 'JWT_SECRET=' + secret(),
  'MSSQL_SA_PASSWORD=' + secret(), 'DEMO_EQUIPO=' + secret(), 'DEMO_PORTAL=' + secret()
];
writeFileSync(new URL('../.env', import.meta.url), config.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
console.log('Configuración generada. Las contraseñas de acceso están en .env.');
