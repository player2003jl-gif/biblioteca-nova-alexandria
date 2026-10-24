const admin=location.pathname==='/admin';
const el=id=>document.getElementById(id);
const canvas=el('scene'),g=canvas.getContext('2d',{alpha:false});
g.imageSmoothingEnabled=false;
const GRID=8,rect=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
let state=null,selected=null,preview=null,drag=null,authorized=false,socket=null,syncing=null,wanted=0,reconnectMs=1000,avatar={x:160,y:236,width:20,height:28};
const notice=s=>el('notice').textContent=s,net=s=>el('connection').textContent=s;
el('role').textContent=admin?'ADMINISTRAÇÃO':'VISITANTE';
el('admin-panel').hidden=!admin;
el('mode-link').textContent=admin?'Voltar ao visitante':'Abrir modo ADM';
el('mode-link').href=admin?'/':'/admin';
const chosen=()=>state?.objects.find(o=>o.id===selected&&o.movable);
const updateSelected=()=>el('selected-name').textContent=chosen()?.name??'nenhum';
async function read(resp){
  const data=await resp.json();
  if(!resp.ok)throw Object.assign(new Error(data.error||'HTTP '+resp.status),{code:resp.status});
  return data;
}
async function load(quiet=false){
  if(syncing)return syncing;
  syncing=(async()=>{
    try{
      const incoming=await read(await fetch('/api/state',{cache:'no-store'}));
      const previous=state?.room.revision??-1;
      if(!state||incoming.room.revision>=previous){
        state=incoming;
        el('revision').textContent=String(state.room.revision);
        if(!chosen())selected=state.objects.find(o=>o.movable)?.id??null;
        updateSelected();draw();
        if(previous!==-1&&state.room.revision>previous)notice('Alteração remota aplicada: revisão '+state.room.revision);
        else if(!quiet)notice('Estado oficial carregado do D1.');
      }
    }catch(e){if(!quiet)notice('Falha de conexão: '+e.message);}
    finally{
      syncing=null;
      if(wanted>(state?.room.revision??0))setTimeout(()=>load(true),1000);
    }
  })();
  return syncing;
}
function draw(){
  g.fillStyle='#5e4d38';g.fillRect(0,0,640,352);
  for(let y=0;y<352;y+=32)for(let x=0;x<640;x+=32){g.fillStyle=((x+y)/32)%2?'#6b5841':'#62523c';g.fillRect(x,y,31,31);}
  g.fillStyle='#30323b';g.fillRect(0,0,640,22);g.fillRect(0,0,22,352);g.fillRect(618,0,22,352);g.fillRect(0,330,640,22);
  if(!state){g.fillStyle='#fff';g.font='16px monospace';g.fillText('Conectando ao D1...',200,180);return;}
  for(const o of state.objects){
    const p=preview?.id===o.id?preview:o;
    if(o.kind==='bookshelf'){
      g.fillStyle='#322420';g.fillRect(p.x-3,p.y-3,p.width+6,p.height+7);
      g.fillStyle='#88583d';g.fillRect(p.x,p.y,p.width,p.height);
      for(let x=p.x+7;x<p.x+p.width-12;x+=13){g.fillStyle=['#bc9c75','#78838d','#a66356','#67856a'][(x/13|0)%4];g.fillRect(x,p.y+7,10,28);}
      g.fillStyle='#ceac72';g.fillRect(p.x,p.y+35,p.width,5);
    }else{
      g.fillStyle='#3e2c20';g.fillRect(p.x+4,p.y+5,p.width,p.height);
      g.fillStyle=admin&&o.id===selected?'#ddb17f':'#99714f';g.fillRect(p.x,p.y,p.width,p.height);
      g.strokeStyle='#503522';g.lineWidth=3;g.strokeRect(p.x+3,p.y+3,p.width-6,p.height-6);
    }
  }
  g.fillStyle='#29292a';g.fillRect(avatar.x+3,avatar.y+25,20,5);
  g.fillStyle='#355e8b';g.fillRect(avatar.x+4,avatar.y+12,12,15);
  g.fillStyle='#bc9773';g.fillRect(avatar.x+5,avatar.y+4,10,11);
  g.fillStyle='#44312b';g.fillRect(avatar.x+4,avatar.y+2,12,5);
  g.fillStyle='#f7e0b1';g.font='bold 12px monospace';g.fillText('BNA • CF-01',28,345);
}
function moveAvatar(dx,dy){
  if(!state)return;
  const n={...avatar,x:Math.max(22,Math.min(618-avatar.width,avatar.x+dx)),y:Math.max(24,Math.min(330-avatar.height,avatar.y+dy))};
  if(state.objects.some(o=>rect(n,preview?.id===o.id?{...o,...preview}:o)))return;
  avatar=n;draw();
}
function connect(){
  const proto=location.protocol==='https:'?'wss':'ws';
  const ws=new WebSocket(proto+'://'+location.host+'/api/live');socket=ws;
  ws.onopen=()=>{net('AO VIVO');reconnectMs=1000;load(true);};
  ws.onmessage=e=>{
    try{const m=JSON.parse(e.data);if(m.type==='room-updated'&&Number.isSafeInteger(m.revision)){wanted=Math.max(wanted,m.revision);if(m.revision>(state?.room.revision??0))load(true);}}catch{}
  };
  ws.onclose=()=>{net('RECONECTANDO');setTimeout(connect,reconnectMs);reconnectMs=Math.min(30000,reconnectMs*2);};
  ws.onerror=()=>{net('SEM CONEXÃO');ws.close();};
}
async function checkAdmin(){
  if(!admin)return;
  try{
    const data=await read(await fetch('/admin/api/me',{cache:'no-store'}));
    authorized=true;el('admin-auth').textContent=data.email;notice('ADM autenticado. Arraste ou mova um caixote.');
  }catch(e){authorized=false;el('admin-auth').textContent='NÃO AUTORIZADO';notice('ADM indisponível: '+e.message);}
  document.querySelectorAll('.admin button').forEach(b=>b.disabled=!authorized);
}
async function mutate(action,payload={},id){
  if(!authorized||!state)return;
  const url=action==='create'?'/admin/api/objects':'/admin/api/objects/'+encodeURIComponent(id);
  const method=action==='create'?'POST':action==='delete'?'DELETE':'PATCH';
  const buttons=document.querySelectorAll('.admin button');
  buttons.forEach(b=>b.disabled=true);
  try{
    const result=await read(await fetch(url,{method,credentials:'same-origin',headers:{'content-type':'application/json','x-bna-admin':'1'},body:JSON.stringify({...payload,expectedRevision:state.room.revision})}));
    if(action==='create')selected=result.id;
    if(action==='delete')selected=null;
    wanted=Math.max(wanted,result.revision);
    await load(true);notice('Gravado no D1: revisão '+result.revision);
  }catch(e){notice('Não salvo: '+e.message);await load(true);}
  finally{preview=null;buttons.forEach(b=>b.disabled=false);draw();}
}
function toCanvas(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*640/r.width,y:(e.clientY-r.top)*352/r.height};}
canvas.addEventListener('pointerdown',e=>{
  canvas.focus();if(!admin||!authorized||!state)return;
  const p=toCanvas(e),o=[...state.objects].reverse().find(o=>o.movable&&p.x>=o.x&&p.x<=o.x+o.width&&p.y>=o.y&&p.y<=o.y+o.height);
  if(!o)return;selected=o.id;updateSelected();drag={id:o.id,dx:p.x-o.x,dy:p.y-o.y,oldX:o.x,oldY:o.y};
  canvas.setPointerCapture(e.pointerId);e.preventDefault();draw();
});
canvas.addEventListener('pointermove',e=>{
  if(!drag||!state)return;
  const p=toCanvas(e),o=chosen();if(!o)return;
  const snap=n=>Math.round(n/GRID)*GRID;
  preview={id:o.id,x:Math.max(8,Math.min(640-o.width-8,snap(p.x-drag.dx))),y:Math.max(8,Math.min(352-o.height-8,snap(p.y-drag.dy)))};
  draw();
});
canvas.addEventListener('pointerup',e=>{
  if(!drag)return;try{canvas.releasePointerCapture(e.pointerId);}catch{}
  const d=drag,p=preview;drag=null;preview=null;draw();
  if(p&&(p.x!==d.oldX||p.y!==d.oldY))mutate('move',{x:p.x,y:p.y},d.id);
});
canvas.addEventListener('pointercancel',()=>{drag=null;preview=null;draw();});
document.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  const m={ArrowUp:[0,-8],w:[0,-8],ArrowDown:[0,8],s:[0,8],ArrowLeft:[-8,0],a:[-8,0],ArrowRight:[8,0],d:[8,0]};
  if(m[e.key]){e.preventDefault();moveAvatar(...m[e.key]);}
});
for(const b of document.querySelectorAll('[data-move]'))b.onclick=()=>{
  const o=chosen();if(!o)return;const [dx,dy]=b.dataset.move.split(',').map(Number);
  mutate('move',{x:o.x+dx,y:o.y+dy},o.id);
};
el('add-object').onclick=()=>{
  if(!state)return;const name=el('object-name').value.trim();
  if(!name||name.length>48){notice('Nome inválido.');return;}
  const spots=[[448,192],[136,192],[240,256],[448,96],[88,264],[528,248],[320,120],[48,112],[496,288]];
  const p=spots.find(([x,y])=>!state.objects.some(o=>rect({x,y,width:40,height:40},o)));
  if(!p){notice('Sem espaço livre; reposicione caixotes.');return;}
  mutate('create',{kind:'crate',name,x:p[0],y:p[1]});
};
el('remove-object').onclick=()=>{const o=chosen();if(o&&confirm('Excluir '+o.name+'?'))mutate('delete',{},o.id);};
load().then(()=>{draw();connect();checkAdmin();});
setInterval(()=>{if(document.visibilityState==='visible')load(true);},20000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load(true);});
draw();
