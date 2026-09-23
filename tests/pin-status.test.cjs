const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function check(device,active=true,role='EMPLOYEE',banned=false){
 let handler;
 const db={auth:{admin:{getUserById:async()=>({data:{user:{app_metadata:{role},banned_until:banned?'2099-01-01':null}}})}},from(table){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:table==='pos_pin_devices'?device:{active}})}}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/pos-access/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:{},require:()=>({createClient:()=>db}),Deno:{env:{get:()=>''},serve:fn=>handler=fn},Request,Response,crypto,TextEncoder});
 const response=await handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({action:'pin-status',deviceId:'11111111-1111-4111-8111-111111111111'})}));
 return response.json();
}
(async()=>{
 assert.deepEqual(await check(null),{available:false});
 assert.deepEqual(await check({user_id:'staff',attempts:0},false),{available:false});
 assert.deepEqual(await check({user_id:'staff',attempts:5}),{available:false});
 assert.deepEqual(await check({user_id:'staff',attempts:0}),{available:true});
 assert.deepEqual(await check({user_id:'admin',attempts:0},false,'ADMIN'),{available:true});
 assert.deepEqual(await check({user_id:'staff',attempts:0},true,'EMPLOYEE',true),{available:false});
 console.log('PASS: deleted, disabled, locked and banned devices unavailable; active staff/admin available; no identity or session exposed.');
})().catch(e=>{console.error(e);process.exit(1)});
