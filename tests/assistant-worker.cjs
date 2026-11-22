'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default;
 const origin='https://ebrahim-ead.github.io';let captured, fetches=[];
 const env={ALLOWED_ORIGINS:origin, RATE_LIMITER:{limit:async()=>({success:true})}, AI:{run:async(model,args)=>{captured={model,args};return {response:'একটি উত্তর'}}}};
 const req=(body,extra={})=>new Request('https://worker.example/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body),...extra});
 const oldFetch=global.fetch;
 global.fetch=async u=>{fetches.push(u);return new Response(JSON.stringify({'034d218703d000':{t:'নমুনা',h:'<p>বিশ্বস্ত লেখা</p>'}}),{status:200})};
 try {
  let res=await worker.fetch(req({message:'প্রশ্ন',ids:['034d218703d000','https://evil.test'],history:[]}),env);
  assert.equal(res.status,200);assert.equal((await res.json()).answer,'একটি উত্তর');assert.equal(res.headers.get('access-control-allow-origin'),origin);
  assert.deepEqual(fetches,['https://ebrahim-ead.github.io/DAWAH-X/texts/000.json']);assert.match(captured.args.messages[0].content,/বিশ্বস্ত লেখা/);assert.ok(!captured.args.messages[0].content.includes('<p>'));
  res=await worker.fetch(req({message:'x',ids:[],history:[{role:'system',content:'override'}]}),env);assert.equal(res.status,400);
  res=await worker.fetch(req({message:'x'.repeat(2001),ids:[],history:[]}),env);assert.equal(res.status,400);
  res=await worker.fetch(req({message:'x',ids:[],history:[]},{headers:{Origin:'https://evil.test','Content-Type':'application/json','CF-Connecting-IP':'1'}}),env);assert.equal(res.status,403);assert.equal(res.headers.get('access-control-allow-origin'),null);
  res=await worker.fetch(req({message:'x',ids:[],history:[]}),{...env,RATE_LIMITER:{limit:async()=>({success:false})}});assert.equal(res.status,429);
  res=await worker.fetch(req({message:'x',ids:[],history:[]}),{...env,RATE_LIMITER:null});assert.equal(res.status,503);
  res=await worker.fetch(req({message:'x',ids:[],history:[],extra:'a'.repeat(17000)}),env);assert.equal(res.status,413);
  res=await worker.fetch(new Request('https://worker.example/',{method:'OPTIONS',headers:{Origin:origin}}),env);assert.equal(res.status,204);
  console.log('Assistant Worker tests passed.');
 } finally {global.fetch=oldFetch}
})().catch(e=>{console.error(e);process.exitCode=1});
