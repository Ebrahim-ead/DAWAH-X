'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default,old=global.fetch,origin='https://ebrahim-ead.github.io';
 global.fetch=async()=>Response.json({'034d218703d000':{t:'নামাজের উৎস',h:'<p>সালাত সম্পর্কিত উৎসের পাঠ।</p>'}});
 let calls=[],results=[];
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(model,args)=>{calls.push({model,args});const x=results.shift();if(x instanceof Error)throw x;return x}}};
 const ask=async()=>{const r=await worker.fetch(new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'নামাজ কী?',ids:['034d218703d000'],history:[],lookupComplete:true})}),env);return {status:r.status,body:await r.json()}};
 try{
  results=[new Error('private primary error'),{choices:[{message:{content:'উৎসের তথ্য [1]'}}]}];let {status,body}=await ask();assert.equal(status,200);assert.equal(body.grounded,true);assert.equal(body.answer,'উৎসের তথ্য [1]');assert.equal(calls.length,2);assert.equal(calls[1].model,'@cf/openai/gpt-oss-120b');assert.deepEqual(calls[0].args.messages,calls[1].args.messages,'fallback sees same evidence and safety prompt');
  calls=[];results=[{response:''},{choices:[{message:{content:'ভুল [9]'}}]},{choices:[{message:{content:'সংশোধিত [1]'}}]}];({body}=await ask());assert.equal(body.answer,'সংশোধিত [1]');assert.equal(calls[2].model,calls[1].model,'citation retry stays on the actual selected model');
  calls=[];results=[{response:'NOT_ENOUGH_INFORMATION'}];({body}=await ask());assert.equal(body.grounded,false);assert.equal(calls.length,1,'abstention is not a reason to shop for a different answer');
  calls=[];results=[new Error('secret'),{choices:[{message:{content:null,reasoning_content:'fabricated [1]'}}]}];({status,body}=await ask());assert.equal(status,502);assert.equal(body.error_code,'model_unavailable');assert(!JSON.stringify(body).includes('fabricated'));assert.equal(calls.length,2,'at most one fallback attempt');
  console.log('assistant model fallback: bounded failover, final-text-only, citations and abstention pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
