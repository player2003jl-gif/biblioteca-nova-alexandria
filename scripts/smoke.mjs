import {strict as assert} from 'node:assert';
const root=process.env.BNA_URL?.replace(/\/$/,'');
if(!root||!/^https?:\/\//.test(root))throw new Error('Defina BNA_URL=https://worker.exemplo.workers.dev');
const req=(path,opts={})=>fetch(root+path,{signal:AbortSignal.timeout(12000),...opts});
let failed=0;
for(const [name,fn] of [
  ['Health D1',async()=>{const r=await req('/api/health');assert.equal(r.status,200);assert.equal((await r.json()).ok,true);}],
  ['Sala e móveis no D1',async()=>{const r=await req('/api/state');assert.equal(r.status,200);const d=await r.json();assert.equal(d.room.id,'main');assert.ok(d.objects.some(o=>o.kind==='bookshelf'));assert.ok(d.objects.some(o=>o.movable));}],
  ['Sem gravação anônima',async()=>{const r=await req('/admin/api/objects',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json','x-bna-admin':'1','Origin':root},body:JSON.stringify({kind:'crate',name:'Tentativa',x:80,y:80,expectedRevision:1})});assert.ok([301,302,303,307,308,401,403,503].includes(r.status));}]
]){
  try{await fn();console.log('OK:',name);}catch(e){failed++;console.error('FALHOU:',name,e.message);}
}
if(failed)process.exitCode=1;
