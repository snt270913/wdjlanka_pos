const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/context/AppContext.tsx','utf8');
const start=source.indexOf("} else if (type === 'sales') {")+"} else if (type === 'sales') {".length;
const branch=source.slice(start,source.indexOf("} else if (type === 'customers')",start));
const sale={id:'s1',itemCode:'B001',itemName:'Bicycle',quantity:3,originalPrice:300,soldPrice:270,discount:30,cost:150,profit:120,customerName:'Example',customerPhone:'123',employeeName:'Staff',saleDate:'2026-09-28'};
for(const role of ['ADMIN','EMPLOYEE']){
 const ctx={sales:[sale,{...sale,quantity:undefined}],currentUser:{role},headers:[],rows:[]};vm.runInNewContext(branch,ctx);
 const field=(name,row=0)=>ctx.rows[row][ctx.headers.indexOf(name)];
 assert.equal(field('Quantity'),'3');assert.equal(field('Quantity',1),'1');assert.equal(field('Unit Price (Rs)'),'100.00');assert.equal(field('Net Unit Price (Rs)'),'90.00');assert.equal(field('Sold Price (Rs)'),'270');assert.equal(field('Cost (Rs)'),role==='ADMIN'?'150':'RESTRICTED');
}
console.log('PASS: sales CSV exports units, per-unit prices, line totals, legacy quantity fallback, protected costs.');
