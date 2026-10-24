import {createRemoteJWKSet,jwtVerify} from 'jose';
const jwksCache=new Map();
export async function verifyAdmin(request,env){
  const domain=env.ACCESS_TEAM_DOMAIN?.replace(/\/$/,'');
  const aud=env.ACCESS_AUD;
  const allowed=env.ADMIN_EMAIL?.trim().toLowerCase();
  if(!domain||!aud||!allowed||!/^https:\/\/[^/]+$/.test(domain))return {ok:false,status:503,message:'Administração não configurada.'};
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!token)return {ok:false,status:403,message:'Cloudflare Access obrigatório.'};
  try{
    if(!jwksCache.has(domain))jwksCache.set(domain,createRemoteJWKSet(new URL(domain+'/cdn-cgi/access/certs')));
    const {payload}=await jwtVerify(token,jwksCache.get(domain),{issuer:domain,audience:aud,algorithms:['RS256']});
    const email=typeof payload.email==='string'?payload.email.toLowerCase():'';
    if(email!==allowed)return {ok:false,status:403,message:'Conta não autorizada.'};
    return {ok:true,email};
  }catch{return {ok:false,status:403,message:'Autenticação inválida ou expirada.'};}
}
export function checkMutationRequest(request){
  const origin=request.headers.get('origin');
  return Boolean(origin&&origin===new URL(request.url).origin&&request.headers.get('x-bna-admin')==='1'&&request.headers.get('content-type')?.startsWith('application/json'));
}
