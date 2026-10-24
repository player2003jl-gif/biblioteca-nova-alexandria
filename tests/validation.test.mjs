import test from 'node:test';
import assert from 'node:assert/strict';
import {requireRevision,validatePosition,validateCreate,collidesWithObjects,overlaps,sanitizeObject} from '../src/validation.js';
const room={width:640,height:352};
const crate={id:'c',width:40,height:40,movable:1};
test('aceita revisão exata, rejeita revisão antiga',()=>{
  assert.equal(requireRevision(2,2),true);
  assert.equal(requireRevision(1,2),false);
  assert.equal(requireRevision('2',2),false);
});
test('posição deve estar na grade, dentro da sala',()=>{
  assert.equal(validatePosition({x:80,y:80},room,crate),null);
  assert.match(validatePosition({x:81,y:80},room,crate),/grade/);
  assert.match(validatePosition({x:608,y:80},room,crate),/fora/);
  assert.match(validatePosition({x:0,y:80},room,crate),/fora/);
});
test('objetos fixos não podem ser movimentados',()=>{
  assert.match(validatePosition({x:80,y:80},room,{...crate,movable:0}),/não pode/);
});
test('criação restringe tipos e tamanho do nome',()=>{
  assert.equal(validateCreate({kind:'crate',name:'Livro provisório',x:80,y:80},room),null);
  assert.ok(validateCreate({kind:'bookshelf',name:'Estante',x:80,y:80},room));
  assert.ok(validateCreate({kind:'crate',name:' ',x:80,y:80},room));
});
test('colisão é verificada pelo servidor',()=>{
  const items=[{id:'a',x:100,y:100,width:40,height:40}];
  assert.equal(overlaps({x:120,y:120,width:40,height:40},items[0]),true);
  assert.equal(collidesWithObjects({x:120,y:120,width:40,height:40},items),true);
  assert.equal(collidesWithObjects({x:120,y:120,width:40,height:40},items,'a'),false);
  assert.equal(collidesWithObjects({x:200,y:200,width:40,height:40},items),false);
});
test('resposta pública não contém dados administrativos',()=>{
  assert.deepEqual(sanitizeObject({id:'x',kind:'crate',name:'Teste',x:80,y:80,width:40,height:40,movable:1,actor_email:'privado'}),
    {id:'x',kind:'crate',name:'Teste',x:80,y:80,width:40,height:40,movable:true});
});
