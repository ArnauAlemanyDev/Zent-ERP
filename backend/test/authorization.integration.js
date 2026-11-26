'use strict';
// Opt-in local demo integration test. Creates and removes only uniquely named fixtures.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const path = require('node:path');
require('dotenv').config({path:path.resolve(__dirname,'../../.env')});
const bcrypt = require('bcryptjs');
const {getPool,sql} = require('../src/config/db');
const tag = 'S03-' + randomUUID();
const password = 'Test!' + randomBytes(24).toString('hex');
const staffBase = 'http://127.0.0.1:3001/api/v1';
const portalBase = 'http://127.0.0.1:8090/api/portal';
const clients = [];
let staff;
let pool;
let count=0;
function pass(name){ console.log('PASS '+name); count++; }
async function http(base, route, {method='GET',token,body}={}) {
  const headers={};
  if(token) headers.Authorization='Bearer '+token;
  if(body!==undefined) headers['Content-Type']='application/json';
  const response=await fetch(base+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(10000)});
  return {status:response.status, data:await response.json()};
}
async function login(base,email) {
  const r=await http(base,'/auth/login',{method:'POST',body:{email,password}});
  assert.equal(r.status,200,'fixture login');
  assert.equal(typeof r.data.token,'string','fixture token');
  return r.data.token;
}
async function makeClient(suffix,hash) {
  const email=tag+'-'+suffix+'@zent.example';
  const name='Prueba '+suffix;
  const tx=new sql.Transaction(pool);
  await tx.begin();
  let id;
  try {
    const r=await tx.request().input('name',sql.NVarChar,name).input('tag',sql.NVarChar,tag).query(`
      INSERT INTO clientes(nombre,apellidos,tipo) VALUES(@name,@tag,'particular');
      SELECT CAST(SCOPE_IDENTITY() AS int) AS id;
    `);
    id=r.recordset[0].id;
    await tx.request().input('id',sql.Int,id).input('email',sql.NVarChar,email).input('hash',sql.NVarChar,hash).query('INSERT INTO portal_usuarios(cliente_id,email,password_hash) VALUES(@id,@email,@hash)');
    await tx.commit();
  } catch(err){ try {await tx.rollback();} catch(_){} throw err; }
  const client={id,email,name}; clients.push(client); return client;
}
async function makeStaff(hash){
  const email=tag+'-staff@zent.example';
  const r=await pool.request().input('email',sql.NVarChar,email).input('tag',sql.NVarChar,tag).input('hash',sql.NVarChar,hash).query(`
    INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES(@tag,@email,@hash,'soporte');
    SELECT CAST(SCOPE_IDENTITY() AS int) AS id;
  `);
  staff={id:r.recordset[0].id,email};return staff;
}
async function main(){
  if(!['127.0.0.1','localhost','::1'].includes(process.env.DB_HOST) || process.env.DB_NAME!=='zent_gestion' || process.env.DB_USER!=='zent_app' || (process.env.BIND_HOST && !['127.0.0.1','localhost','::1'].includes(process.env.BIND_HOST))) throw Error('Run only against the local Zent demo configuration');
  const health=await http(staffBase,'/health'); assert.equal(health.status,200,'API health');
  pool=await getPool();
  const hash=await bcrypt.hash(password,12);
  const a=await makeClient('A',hash), b=await makeClient('B',hash), s=await makeStaff(hash);
  const ta=await login(portalBase,a.email), tb=await login(portalBase,b.email), ts=await login(staffBase,s.email);
  pass('Both portal accounts and staff fixture log in');
  const ticketA=await http(portalBase,'/tickets',{method:'POST',token:ta,body:{titulo:tag+' A',descripcion:'Synthetic authorization test',prioridad:'media',cliente_id:b.id}});
  assert.equal(ticketA.status,201); assert.equal(ticketA.data.cliente_id,a.id); pass('Portal creation ignores supplied foreign client id');
  const ticketB=await http(portalBase,'/tickets',{method:'POST',token:tb,body:{titulo:tag+' B',descripcion:'Synthetic authorization test',prioridad:'media'}});
  assert.equal(ticketB.status,201); assert.equal(ticketB.data.cliente_id,b.id); pass('Second client creates own ticket');
  const la=await http(portalBase,'/tickets',{token:ta}), lb=await http(portalBase,'/tickets',{token:tb});
  assert.equal(la.status,200);assert.equal(lb.status,200);
  assert.deepEqual(la.data.map(t=>t.id),[ticketA.data.id]);assert.deepEqual(lb.data.map(t=>t.id),[ticketB.data.id]);pass('Each client sees only its own ticket');
  assert.equal((await http(staffBase,'/clientes',{token:ts})).status,200);
  assert.equal((await http(staffBase,'/clientes',{method:'POST',token:ts,body:{}})).status,403);pass('Support user cannot create clients');
  await pool.request().input('id',sql.Int,a.id).input('email',sql.NVarChar,a.email).query('UPDATE portal_usuarios SET activo=0 WHERE cliente_id=@id AND email=@email');
  assert.equal((await http(portalBase,'/tickets',{token:ta})).status,401);pass('Disabled portal account token rejected');
  await pool.request().input('id',sql.Int,b.id).input('tag',sql.NVarChar,tag).query('UPDATE clientes SET activo=0 WHERE id=@id AND apellidos=@tag');
  assert.equal((await http(portalBase,'/tickets',{token:tb})).status,401);
  assert.equal((await http(portalBase,'/auth/login',{method:'POST',body:{email:b.email,password}})).status,401);pass('Disabled client cannot use session or log in');
  await pool.request().input('id',sql.Int,s.id).input('email',sql.NVarChar,s.email).query("UPDATE usuarios SET rol='tecnico' WHERE id=@id AND email=@email");
  assert.equal((await http(staffBase,'/clientes',{token:ts})).status,401);pass('Changed staff role rejects previous token');
  const fresh=await login(staffBase,s.email);
  assert.equal((await http(staffBase,'/clientes',{token:fresh})).status,200);
  await pool.request().input('id',sql.Int,s.id).input('email',sql.NVarChar,s.email).query('UPDATE usuarios SET activo=0 WHERE id=@id AND email=@email');
  assert.equal((await http(staffBase,'/clientes',{token:fresh})).status,401);pass('Disabled staff token rejected');
}
async function cleanup(){
  if(!pool)return;
  let failed=false;
  for(const c of clients){
    try { await pool.request().input('id',sql.Int,c.id).input('tag',sql.NVarChar,tag).input('name',sql.NVarChar,c.name).query('DELETE FROM clientes WHERE id=@id AND apellidos=@tag AND nombre=@name'); }
    catch(e){failed=true;console.error('Cleanup failed for synthetic client id '+c.id);}
  }
  if(staff)try{await pool.request().input('id',sql.Int,staff.id).input('email',sql.NVarChar,staff.email).query('DELETE FROM usuarios WHERE id=@id AND email=@email');}catch(e){failed=true;console.error('Cleanup failed for synthetic staff id '+staff.id);}
  await pool.close();
  if(failed)throw Error('Fixture cleanup incomplete; tag '+tag);
  console.log('Synthetic fixtures removed; audit records may remain.');
}
(async()=>{
  try {await main();console.log(count+' integration checks passed.');}
  catch(err){console.error('FAIL '+(err.code==='ERR_ASSERTION'?err.message.split('\n')[0]:err.name+' '+(err.code||'')));process.exitCode=1;}
  finally {try {await cleanup();}catch(e){console.error('Cleanup incomplete; fixture tag '+tag);process.exitCode=1;}}
})();
