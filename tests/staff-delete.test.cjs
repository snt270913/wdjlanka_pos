const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function scenario(role,targetId,targetRole){
 let handler;const events=[];
 const db={auth:{getUser:async()=>({data:{user:{id:'admin',app_metadata:{role}}}}),admin:{getUserById:async()=>({data:{user:{app_metadata:{role:targetRole}}}}),deleteUser:async id=>{events.push('delete-auth:'+id);return {data:{}};}}},from(table){return {select(){return this;},eq(){return this;},single:async()=>({data:{user_id:targetId}}),maybeSingle:async()=>({data:{active:true,permissions:[],name:'Staff'}}),update(){events.push('disable:'+table);return {eq:async()=>({data:{}})};},delete(){events.push('delete:'+table);return {eq:async()=>({data:{}})};}}}};
 const src=ts.transpileModule(fs.readFileSync('supabase/functions/pos-access/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(src,{exports:{},require:()=>({createClient:()=>db}),Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,Request,crypto,TextEncoder});
 const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({action:'staff-delete',userId:targetId})}));
 return {status:response.status,events};
}
(async()=>{
 assert.equal((await scenario('EMPLOYEE','staff','EMPLOYEE')).status,403);
 for(const [id,role] of [['admin','ADMIN'],['other-admin','ADMIN']]) {const r=await scenario('ADMIN',id,role);assert.equal(r.status,400);assert.deepEqual(r.events,[]);}
 const r=await scenario('ADMIN','staff','EMPLOYEE');assert.equal(r.status,200);assert.deepEqual(r.events,['disable:pos_staff','delete:pos_pin_devices','delete-auth:staff']);
 console.log('PASS: staff deletion restricted to admin, administrator protection, access revoked before account deletion, no sales deletion.');
})().catch(e=>{console.error(e);process.exit(1)});
