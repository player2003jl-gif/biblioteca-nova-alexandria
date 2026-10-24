export const ROOM_ID='main';
export const MAX_MOVABLE_OBJECTS=30;
export const GRID=8;
export const isInt=v=>Number.isSafeInteger(v);
export const isPlainObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const requireRevision=(value,current)=>isInt(value)&&value===current;
export const sanitizeObject=row=>({id:row.id,kind:row.kind,name:row.name,x:row.x,y:row.y,width:row.width,height:row.height,movable:Boolean(row.movable)});
export const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export const collidesWithObjects=(a,list,ignoreId=null)=>list.some(b=>b.id!==ignoreId&&overlaps(a,b));
export function validatePosition(payload,room,object){
  if(!isPlainObject(payload)||!isInt(payload.x)||!isInt(payload.y))return 'Posição inválida: x e y devem ser inteiros.';
  if(!object||object.movable!==1)return 'Objeto não pode ser movido.';
  if(payload.x%GRID||payload.y%GRID)return 'Posição fora da grade de 8 pixels.';
  if(payload.x<8||payload.y<8||payload.x+object.width>room.width-8||payload.y+object.height>room.height-8)return 'Posição fora da sala.';
  return null;
}
export function validateCreate(payload,room){
  if(!isPlainObject(payload)||payload.kind!=='crate')return 'Somente caixotes podem ser criados no CF-01.';
  if(typeof payload.name!=='string'||!payload.name.trim()||payload.name.trim().length>48)return 'Nome deve ter entre 1 e 48 caracteres.';
  return validatePosition(payload,room,{width:40,height:40,movable:1});
}
