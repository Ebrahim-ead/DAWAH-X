'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default;
 const origin='https://ebrahim-ead.github.io';const old=global.fetch;
 global.fetch=async()=>Response.json({'034d218703d000':{t:'উৎস',h:'<p>সালাতের তথ্য</p>'}});
 const request=(overrides={})=>new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'নামাজের নিয়ম কী?',ids:['034d218703d000'],history:[],lookupComplete:true,...overrides})});
 let calls=[],responses=[];
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(model,args)=>{calls.push({model,args});const value=responses.shift();if(value instanceof Error)throw value;return value}}};
 try{
  responses=[{response:'সম্পূর্ণ উত্তর [1]।',usage:{completion_tokens:100}}];let r=await worker.fetch(request(),env),data=await r.json();assert.equal(data.answer,'সম্পূর্ণ উত্তর [1]।');assert.equal(calls.length,1);assert.equal(calls[0].args.max_tokens,2048);assert.equal(data.incomplete,undefined);
  calls=[];responses=[{response:'প্রথম অংশ [1]। বাক্য ',usage:{completion_tokens:2048}},{response:'সম্পূর্ণ হলো [1]।',usage:{completion_tokens:150}}];r=await worker.fetch(request(),env);data=await r.json();assert.equal(data.answer,'প্রথম অংশ [1]। বাক্য সম্পূর্ণ হলো [1]।');assert.equal(data.incomplete,undefined);assert.equal(calls.length,2);assert.equal(calls[1].args.max_tokens,1536);assert.equal(calls[1].args.messages[2].content,'প্রথম অংশ [1]। বাক্য ');assert.match(calls[1].args.messages[3].content,/same supplied evidence/);
  calls=[];responses=[{response:'প্রমাণ [1] এবং ',finish_reason:'length'},{response:'আরও তথ্য [1]',finish_reason:'length'}];r=await worker.fetch(request(),env);data=await r.json();assert.equal(data.incomplete,true);assert.equal(calls.length,2,'bounded continuation');
  calls=[];responses=[{response:'কিছু তথ্য [1] কিন্তু ',stop_reason:'max_tokens'},new Error('inference unavailable')];r=await worker.fetch(request(),env);data=await r.json();assert.equal(r.status,200);assert.equal(data.answer,'কিছু তথ্য [1] কিন্তু');assert.equal(data.incomplete,true);assert.equal(data.grounded,true);
  calls=[];responses=[{response:'কিছু তথ্য [1]',usage:{completion_tokens:2048}},{response:'কিছু তথ্য [1]'}];r=await worker.fetch(request(),env);data=await r.json();assert.equal(data.incomplete,true,'repeated continuation must not be duplicated');
  calls=[];responses=[{response:'আংশিক [1]',finish_reason:'length'},{response:'NOT_ENOUGH_INFORMATION'}];r=await worker.fetch(request(),env);data=await r.json();assert.equal(data.incomplete,true);assert.equal(data.answer,'আংশিক [1]');
  calls=[];responses=[{response:'দলিল [1] ',finish_reason:'length'},{response:'মিথ্যা সূত্র [9]'}];r=await worker.fetch(request(),env);data=await r.json();assert.equal(data.grounded,false,'continued text cannot bypass citation checks');
  calls=[];responses=[{response:'হ্যালো ',usage:{completion_tokens:1536}},{response:'কেমন আছেন?'}];r=await worker.fetch(request({message:'হ্যালো',ids:[],lookupComplete:false}),{...env,AI:{run:async(model,args)=>{if(model==='@cf/openai/gpt-oss-20b')return {response:'CHAT'};return env.AI.run(model,args)}}});data=await r.json();assert.equal(data.answer,'হ্যালো কেমন আছেন?');assert.equal(data.mode,'chat');assert.equal(calls.length,2);assert.equal(calls[0].args.max_tokens,1536);
  console.log('assistant completion: token limits, bounded continuation, failure warnings and citation checks pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
