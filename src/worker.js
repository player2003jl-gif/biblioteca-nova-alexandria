import {verifyAdmin,checkMutationRequest} from './auth.js';
import {sanitizeObject,ROOM_ID} from './validation.js';
export {RoomSync} from './room-sync.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
async function state(env){
  const room=await env.DB.prepare('SELECT id,name,width,height,revision,updated_at FROM rooms WHERE id=?').bind(ROOM_ID).first();
  if(!room)return json({error:'Banco não inicializado: aplique a migração D1.'},503);
  const {results}=await env.DB.prepare('SELECT id,kind,name,x,y,width,height,movable FROM objects WHERE room_id=? ORDER BY kind,id').bind(ROOM_ID).all();
  return json({room,objects:results.map(sanitizeObject)});
}
async function admin(request,env,url){
  const verified=await verifyAdmin(request,env);
  if(!verified.ok)return json({error:verified.message},verified.status);
  if(url.pathname==='/admin'&&request.method==='GET'){
    const target=new URL('/index.html',request.url);
    const resp=await env.ASSETS.fetch(new Request(target,request));
    const headers=new Headers(resp.headers);headers.set('cache-control','no-store');
    return new Response(resp.body,{status:resp.status,headers});
  }
  if(url.pathname==='/admin/api/me'&&request.method==='GET')return json({authorized:true,email:verified.email});
  const create=url.pathname==='/admin/api/objects'&&request.method==='POST';
  const match=/^\/admin\/api\/objects\/([a-zA-Z0-9-]{1,64})$/.exec(url.pathname);
  const move=Boolean(match)&&request.method==='PATCH';
  const del=Boolean(match)&&request.method==='DELETE';
  if(!create&&!move&&!del)return json({error:'Rota administrativa inexistente.'},404);
  if(!checkMutationRequest(request))return json({error:'Cabeçalhos de segurança inválidos.'},403);
  const raw=await request.text();
  if(raw.length>8192)return json({error:'Solicitação grande demais.'},413);
  let payload;
  try{payload=JSON.parse(raw);}catch{return json({error:'JSON inválido.'},400);}
  const stub=env.ROOM_SYNC.get(env.ROOM_SYNC.idFromName(ROOM_ID));
  return stub.fetch('https://internal/mutate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    action:create?'create':move?'move':'delete',id:match?.[1],payload,actor:verified.email,expectedRevision:payload.expectedRevision
  })});
}
export default {
  async fetch(request,env){
    try{
      const url=new URL(request.url);
      if(url.pathname==='/api/health'&&request.method==='GET'){
        const row=await env.DB.prepare('SELECT revision FROM rooms WHERE id=?').bind(ROOM_ID).first();
        return json({ok:Boolean(row),project:'BNA',revision:row?.revision??null},row?200:503);
      }
      if(url.pathname==='/api/state'&&request.method==='GET')return state(env);
      if(url.pathname==='/api/live'&&request.method==='GET'){
        if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket obrigatório.'},426);
        const stub=env.ROOM_SYNC.get(env.ROOM_SYNC.idFromName(ROOM_ID));
        return stub.fetch(request);
      }
      if(url.pathname==='/admin'||url.pathname.startsWith('/admin/'))return admin(request,env,url);
      if(url.pathname.startsWith('/api/'))return json({error:'Rota desconhecida.'},404);
      return env.ASSETS.fetch(request);
    }catch(error){
      console.error('BNA Worker:',error instanceof Error?error.message:'Erro desconhecido');
      return json({error:'Erro interno do servidor.'},500);
    }
  }
};
