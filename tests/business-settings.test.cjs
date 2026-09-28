const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
let handler, stored=null, role='ADMIN', active=true, fail=false;
const db={auth:{getUser:async()=>({data:{user:{id:'u',app_metadata:{role}}}})},from(table){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:table==='pos_staff'?{active,permissions:[]}:stored}),upsert:async row=>{if(fail)return {error:{message:'Save failed'}};stored=row;return {data:row}}}}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/pos-access/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:{},require:()=>({createClient:()=>db}),Deno:{env:{get:()=>''},serve:fn=>handler=fn},Request,Response,crypto,TextEncoder});
const call=async(action,settings)=>{const r=await handler(new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({action,settings})}));return {status:r.status,body:await r.json()}};
(async()=>{
 const settings={companyName:'Example Store',tagline:'New tagline',email:'billing@example.test',phone:'123',address:'Example road',currency:'Rs',receipt:{title:'RECEIPT',background:'#123456',textColor:'#ffffff',footer:'Thanks!',showEmail:false,showTagline:true,showPhone:true,showAddress:true}};
 assert.equal((await call('settings-get')).body.settings,null);
 assert.equal((await call('settings-save',settings)).status,200);
 assert.deepEqual((await call('settings-get')).body.settings,settings);
 role='EMPLOYEE';assert.equal((await call('settings-save',{...settings,email:'bad@example.test'})).status,403);
 assert.equal((await call('settings-get')).body.settings.email,settings.email);
 active=false;assert.equal((await call('settings-get')).status,400);
 role='ADMIN';assert.equal((await call('settings-save',{...settings,receipt:{...settings.receipt,background:'invalid'}})).status,400);
 fail=true;assert.equal((await call('settings-save',settings)).status,400);
 console.log('PASS: settings survive separate reads; staff read-only, disabled staff blocked, invalid colours rejected, failed save reported.');
})().catch(e=>{console.error(e);process.exit(1)});
