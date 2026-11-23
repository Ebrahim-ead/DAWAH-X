'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default,old=global.fetch,origin='https://ebrahim-ead.github.io';let mode='valid',calls=0,options;
 global.fetch=async(_url,opts)=>{options=opts;
  if(mode==='missing')return Response.json({});
  if(mode==='malformed')return new Response('{');
  if(mode==='large')return new Response('x'.repeat(2*1024*1024+1));
  return Response.json({'034d218703d000':{t:'উৎস',h:'<p>সালাতের প্রাসঙ্গিক লেখা</p>'}});
 };
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async()=>{calls++;return {response:'উত্তর [1]'}}}};
 const req=()=>new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'সালাত কী?',ids:['034d218703d000'],history:[],lookupComplete:true})});
 try{
  let res=await worker.fetch(req(),env),data=await res.json();assert.equal(data.grounded,true);assert.equal(options.redirect,'manual');assert(options.signal instanceof AbortSignal);assert.equal(calls,1);
  for(mode of ['missing','malformed','large']){res=await worker.fetch(req(),env);assert.equal(res.status,502,mode+' must not be mistaken for an empty successful search');assert.equal(calls,1)}
  mode='valid';res=await worker.fetch(req(),env);data=await res.json();assert.equal(data.grounded,true,'next request must recover');
  console.log('assistant site sources: bounded response, missing records, malformed data and recovery pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
