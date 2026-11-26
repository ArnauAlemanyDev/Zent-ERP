const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(root, '.env') });
const env = process.env;
const config = {
  server: env.DB_HOST, port: Number(env.DB_PORT), user: 'sa', password: env.MSSQL_SA_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function initialize(database, files, seed) {
  const pool = await new sql.ConnectionPool({ ...config, database }).connect();
  const tx = pool.transaction();
  try {
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const lock = await tx.request().query("DECLARE @r int; EXEC @r = sp_getapplock @Resource='zent_init', @LockMode='Exclusive', @LockTimeout=30000; SELECT @r AS result");
    if (lock.recordset[0].result < 0) throw Error('Otra instalación está en curso');
    const tables = (await tx.request().query('SELECT name FROM sys.tables')).recordset;
    if (tables.some(t => t.name === 'zent_demo_version')) {
      await tx.commit();
      console.log(database, 'ya inicializada');
      return;
    }
    if (tables.length) throw Error('La base contiene tablas ajenas a esta instalación: ' + database);
    for (const file of files) {
      console.log('Aplicando', file);
      const script = fs.readFileSync(path.join(root, 'database', file), 'utf8');
      for (const batch of script.split(/^\s*GO\s*$/gim)) {
        if (batch.trim()) await tx.request().batch(batch);
      }
    }
    if (seed) await seed(tx);
    await tx.request().batch(`
      CREATE USER zent_app FOR LOGIN zent_app;
      ALTER ROLE db_datareader ADD MEMBER zent_app;
      ALTER ROLE db_datawriter ADD MEMBER zent_app;
      GRANT EXECUTE TO zent_app;
      CREATE TABLE dbo.zent_demo_version (version int PRIMARY KEY);
      INSERT dbo.zent_demo_version VALUES (1);
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  } finally { await pool.close(); }
}

async function main() {
  if (env.DB_NAME !== 'zent_gestion' || env.DB_LICENSE_NAME !== 'zent_licencias' || env.DB_USER !== 'zent_app') {
    throw Error('La instalación de demostración requiere la configuración de scripts/configurar.mjs');
  }
  for (const key of ['DB_PASSWORD','MSSQL_SA_PASSWORD','DEMO_EQUIPO','DEMO_PORTAL','JWT_SECRET']) {
    if (!env[key]) throw Error('Falta configurar ' + key);
  }
  const master = await new sql.ConnectionPool({ ...config, database: 'master' }).connect();
  try {
    await master.request().input('password', sql.NVarChar(128), env.DB_PASSWORD).query(`
      IF SUSER_ID('zent_app') IS NULL BEGIN
        DECLARE @ddl nvarchar(max) = 'CREATE LOGIN zent_app WITH PASSWORD = ' + QUOTENAME(@password, '''');
        EXEC (@ddl);
      END
    `);
    for (const db of ['zent_gestion','zent_licencias']) {
      await master.request().query(`IF DB_ID('${db}') IS NULL EXEC('CREATE DATABASE ${db} COLLATE Modern_Spanish_CI_AI')`);
    }
  } finally { await master.close(); }
  const files = fs.readFileSync(path.join(root,'database','init.sql'),'utf8').split(/\r?\n/).filter(l => l.startsWith(':r ')).map(l => l.slice(3).trim());
  await initialize('zent_gestion', files, async tx => {
    await tx.request().input('staff', await bcrypt.hash(env.DEMO_EQUIPO, 12))
      .input('portal', await bcrypt.hash(env.DEMO_PORTAL, 12)).query(`
        INSERT usuarios(nombre,email,password_hash,rol) VALUES(N'Equipo Zent','equipo@zent.example',@staff,'admin');
        DECLARE @equipo int = SCOPE_IDENTITY();
        INSERT clientes(nombre,apellidos,tipo) VALUES(N'Taller Horizonte',N'','empresa');
        DECLARE @cliente int = SCOPE_IDENTITY();
        INSERT portal_usuarios(cliente_id,email,password_hash) VALUES(@cliente,'cliente@zent.example',@portal);
        INSERT dispositivos(cliente_id,tipo_dispositivo,marca,modelo,numero_serie)
          VALUES(@cliente,'portatil','Demo','Estación 14','DEMO-014');
        DECLARE @equipo_portatil int = SCOPE_IDENTITY();
        INSERT albaranes(cliente_id, dispositivo_id, usuario_responsable_id, articulo, marca, modelo, descripcion_averia)
          VALUES(@cliente, @equipo_portatil, @equipo, 'portatil', N'Demo', N'Estación 14', N'Revisar el conector de alimentación');
        INSERT contratos(cliente_id,tipo_contrato,descripcion,fecha_inicio,fecha_fin,importe,periodicidad)
          VALUES(@cliente,'soporte',N'Soporte de puestos de trabajo',CAST(GETDATE() AS date),DATEADD(year,1,GETDATE()),240,'anual');
        INSERT clientes(nombre,apellidos,tipo) VALUES(N'Alex',N'Muestra','particular');
        DECLARE @particular int = SCOPE_IDENTITY();
        INSERT tickets(cliente_id,tecnico_id,titulo,descripcion,estado,prioridad,metadatos)
          VALUES(@particular,@equipo,N'Configurar copia de seguridad',N'Preparar una copia de prueba y verificar la restauración.','en_progreso','media',N'{"origen":"interno"}');
        INSERT tickets(cliente_id,titulo,descripcion,estado,prioridad,metadatos)
          VALUES(@cliente,N'Revisión de equipo',N'El equipo de demostración necesita una revisión.','abierto','media',N'{"origen":"externo"}');
      `);
  });
  await initialize('zent_licencias',['licencias.sql']);
  console.log('Zent ERP inicializado.');
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
