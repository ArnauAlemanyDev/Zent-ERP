'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessionAuthorization, requireRol } = require('../src/middleware/sessionAuthorization');
const team = { id: 1, rol: 'admin', nombre: 'Equipo', email: 'staff@example.test' };
const portal = { id: 2, cliente_id: 7, email: 'portal@example.test' };
const tokens = { team: {...team, exp: 9999999999}, portal: {...portal, rol:'portal', exp:9999999999}, malformed: {id:'1', rol:'admin', exp:9999999999}, noexp: {...team} };
function make({ findTeam = async () => team, findPortal = async () => portal } = {}) {
  return createSessionAuthorization({verify: token => { if (!tokens[token]) throw Error('invalid'); return tokens[token]; }, findTeam, findPortal });
}
async function run(fn, token, user) {
  const req = {headers: token ? {authorization:'Bearer '+token}: {}, usuario:user};
  const res = {code:200, status(c){this.code=c;return this;}, json(){return this;}};
  let called = false;
  await fn(req,res,()=>{called=true;});
  return {code:res.code,called,user:req.usuario};
}
test('valid team and portal sessions use current database identity', async()=>{
  const m=make();
  assert.deepEqual(await run(m.authMiddleware,'team'),{code:200,called:true,user:team});
  assert.deepEqual(await run(m.portalAuthMiddleware,'portal'),{code:200,called:true,user:{...portal,rol:'portal'}});
});
test('invalid or malformed tokens fail before database lookup', async()=>{
  const m=make({findTeam:async()=>assert.fail('unexpected query')});
  for(const token of [null,'bad','malformed','noexp']) assert.equal((await run(m.authMiddleware,token)).code,401);
});
test('cross-role tokens fail before database lookup', async()=>{
  const m=make({findTeam:async()=>assert.fail(),findPortal:async()=>assert.fail()});
  assert.equal((await run(m.authMiddleware,'portal')).code,403);
  assert.equal((await run(m.portalAuthMiddleware,'team')).code,403);
});
test('missing or disabled team user is rejected', async()=>{
  assert.equal((await run(make({findTeam:async()=>undefined}).authMiddleware,'team')).code,401);
});
test('changed team role invalidates old token', async()=>{
  assert.equal((await run(make({findTeam:async()=>({...team,rol:'tecnico'})}).authMiddleware,'team')).code,401);
});
test('inactive portal user or client is rejected', async()=>{
  assert.equal((await run(make({findPortal:async()=>undefined}).portalAuthMiddleware,'portal')).code,401);
});
test('changed client association invalidates old token', async()=>{
  assert.equal((await run(make({findPortal:async()=>({...portal,cliente_id:8})}).portalAuthMiddleware,'portal')).code,401);
});
test('database failure fails closed with 503', async()=>{
  const fail=async()=>{throw Error('offline')};
  for(const [fn,token] of [[make({findTeam:fail}).authMiddleware,'team'],[make({findPortal:fail}).portalAuthMiddleware,'portal']]){
    const result=await run(fn,token); assert.equal(result.code,503); assert.equal(result.called,false);
  }
});
test('role guard denies unauthorized staff and permits allowed roles', async()=>{
  const guard=requireRol('admin');
  assert.equal((await run(guard,null)).code,401);
  assert.equal((await run(guard,null,{rol:'soporte'})).code,403);
  assert.equal((await run(guard,null,team)).called,true);
});
