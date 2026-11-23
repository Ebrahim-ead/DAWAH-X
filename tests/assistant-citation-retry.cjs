'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default,old=global.fetch,origin='https://ebrahim-ead.github.io';
 global.fetch=async()=>Response.json({'034d218703d000':{t:'উৎস',h:'<p>সালাত প্রসঙ্গের তথ্য।</p>'}});
 let calls=[],responses=[];const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_model,args)=>{calls.push(args);const x=responses.shift();if(x instanceof Error)throw x;return {response:x}}}};
 const run=async()=>{const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'নামাজ কী?',ids:['034d218703d000'],history:[],lookupComplete:true})});return (await worker.fetch(req,env)).json()};
 try{
  responses=['অযাচাইকৃত নম্বর [9]','উৎসের তথ্য [1]'];let data=await run();assert.equal(data.grounded,true);assert.equal(data.answer,'উৎসের তথ্য [1]');assert.equal(calls.length,2);assert(!JSON.stringify(calls[1].messages).includes('অযাচাইকৃত নম্বর'),'rejected model output must not become evidence');assert.match(calls[1].messages.at(-1).content,/failed citation/);
  calls=[];responses=['উত্তর [9]','বুখারী হাদিস ১২৩ [1]'];data=await run();assert.equal(data.grounded,false);assert.equal(data.verification_failed,true);assert(!data.answer.includes('১২৩'));assert.equal(calls.length,2);
  calls=[];responses=['উত্তর [99]',new Error('inference outage')];data=await run();assert.equal(data.grounded,false);assert.equal(data.verification_failed,true);assert.equal(calls.length,2);
  calls=[];responses=['NOT_ENOUGH_INFORMATION'];data=await run();assert.equal(data.grounded,false);assert.equal(data.verification_failed,undefined);assert.equal(calls.length,1,'do not pressure the model to answer with insufficient evidence');
  console.log('assistant citation retry: bounded retry and fail-closed verification pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
