import {DurableObject} from 'cloudflare:workers';
import {ROOM_ID,MAX_MOVABLE_OBJECTS,requireRevision,validateCreate,validatePosition,collidesWithObjects} from './validation.js';
const response=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export class RoomSync extends DurableObject {
  constructor(ctx,env){super(ctx,env);this.queue=Promise.resolve();}
  async fetch(request){
    const url=new URL(request.url);
    if(url.pathname==='/live'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      const pair=new WebSocketPair();const [client,server]=Object.values(pair);
      this.ctx.acceptWebSocket(server);
      return new Response(null,{status:101,webSocket:client});
    }
    if(url.pathname==='/mutate'&&request.method==='POST'){
      const body=await request.json();
      const task=this.queue.then(()=>this.mutate(body));
      this.queue=task.catch(()=>{});
      return task;
    }
    return response({error:'Rota interna inexistente.'},404);
  }
  async mutate(body){
    const {action,id,payload,actor,expectedRevision}=body??{};
    if(typeof actor!=='string'||!actor)return response({error:'Sem ator administrativo.'},403);
    const room=await this.env.DB.prepare('SELECT * FROM rooms WHERE id=?').bind(ROOM_ID).first();
    if(!room)return response({error:'Sala não inicializada.'},503);
    if(!requireRevision(expectedRevision,room.revision))return response({error:'Conflito de versão.',revision:room.revision},409);
    const {results:objects}=await this.env.DB.prepare('SELECT id,x,y,width,height FROM objects WHERE room_id=?').bind(ROOM_ID).all();
    let objectId=id,before=null,after=null,statement;
    if(action==='create'){
      const err=validateCreate(payload,room);if(err)return response({error:err},400);
      const count=await this.env.DB.prepare('SELECT COUNT(*) total FROM objects WHERE room_id=? AND movable=1').bind(ROOM_ID).first();
      if(count.total>=MAX_MOVABLE_OBJECTS)return response({error:'Limite de objetos atingido.'},400);
      objectId=crypto.randomUUID();
      after={id:objectId,kind:'crate',name:payload.name.trim(),x:payload.x,y:payload.y,width:40,height:40,movable:1};
      if(collidesWithObjects(after,objects))return response({error:'Colisão com outro objeto.'},409);
      statement=this.env.DB.prepare('INSERT INTO objects(id,room_id,kind,name,x,y,width,height,movable) VALUES(?,?,?,?,?,?,?,?,1)')
        .bind(objectId,ROOM_ID,'crate',after.name,after.x,after.y,40,40);
    }else if(action==='move'||action==='delete'){
      if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,64}$/.test(id))return response({error:'Identificador inválido.'},400);
      const row=await this.env.DB.prepare('SELECT * FROM objects WHERE id=? AND room_id=?').bind(id,ROOM_ID).first();
      if(!row||row.movable!==1)return response({error:'Objeto inexistente ou fixo.'},404);
      before=row;
      if(action==='move'){
        const err=validatePosition(payload,room,row);if(err)return response({error:err},400);
        after={...row,x:payload.x,y:payload.y};
        if(collidesWithObjects(after,objects,row.id))return response({error:'Colisão com outro objeto.'},409);
        statement=this.env.DB.prepare('UPDATE objects SET x=?,y=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(after.x,after.y,id);
      }else statement=this.env.DB.prepare('DELETE FROM objects WHERE id=?').bind(id);
    }else return response({error:'Operação não suportada.'},400);
    const revision=room.revision+1;
    await this.env.DB.batch([
      statement,
      this.env.DB.prepare('UPDATE rooms SET revision=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(revision,ROOM_ID),
      this.env.DB.prepare('INSERT INTO audit_log(id,room_id,actor_email,action,object_id,before_json,after_json,room_revision) VALUES(?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(),ROOM_ID,actor,action,objectId,before?JSON.stringify(before):null,after?JSON.stringify(after):null,revision)
    ]);
    for(const ws of this.ctx.getWebSockets()){
      try{ws.send(JSON.stringify({type:'room-updated',room:ROOM_ID,revision}));}catch{try{ws.close(1011,'Reconectar');}catch{}}
    }
    return response({ok:true,id:objectId,revision});
  }
  async webSocketMessage(ws,msg){if(msg==='ping')ws.send('pong');}
  async webSocketClose(ws,code,reason){try{ws.close(code,reason);}catch{}}
}
