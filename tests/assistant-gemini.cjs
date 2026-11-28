'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default,old=global.fetch;
 const origin='https://ebrahim-ead.github.io',secret='not-a-real-test-secret',googleURL='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
 let gemCalls=[],cfCalls=[],gemResults=[],cfResults=[];
 const env={ALLOWED_ORIGINS:origin,GEMINI_ENABLED:'true',gem:secret,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(model,args)=>{cfCalls.push({model,args});const v=cfResults.shift();if(v instanceof Error)throw v;return v}}};
 global.fetch=async(input,options)=>{
  if(String(input)===googleURL){gemCalls.push({url:String(input),headers:options.headers,body:JSON.parse(options.body)});const v=gemResults.shift();if(v instanceof Error)throw v;return v}
  return Response.json({'034d218703d000':{t:'নামাজের উৎস',h:'<p>সালাত সম্পর্কিত উৎসের পাঠ।</p>'}});
 };
 const response=(text,finish='STOP')=>Response.json({candidates:[{finishReason:finish,content:{parts:[{text}]}}]});
 const ask=async(e=env,notice='gemini-v1')=>{const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'নামাজ কী?',ids:['034d218703d000'],history:[],lookupComplete:true,privacyNoticeVersion:notice})});const r=await worker.fetch(req,e);return {status:r.status,body:await r.json()}};
 const reset=()=>{gemCalls=[];cfCalls=[];gemResults=[];cfResults=[]};
 try{
  gemResults=[response('প্রাসঙ্গিক তথ্য [1]।')];let r=await ask();assert.equal(r.body.answer,'প্রাসঙ্গিক তথ্য [1]।');assert.equal(r.body.grounded,true);assert.equal(cfCalls.length,0);assert.equal(gemCalls[0].headers['x-goog-api-key'],secret);assert.match(gemCalls[0].body.systemInstruction.parts[0].text,/ONLY using facts/);assert.match(gemCalls[0].body.contents[0].parts[0].text,/সালাত সম্পর্কিত উৎস/);assert(!JSON.stringify(r).includes(secret));
  reset();gemResults=[new Response('private provider body',{status:429})];cfResults=[{response:'বিকল্প উত্তর [1]'}];r=await ask();assert.equal(r.body.answer,'বিকল্প উত্তর [1]');assert.equal(cfCalls[0].model,'@cf/openai/gpt-oss-120b');assert(!JSON.stringify(r).includes('private provider body'));assert.deepEqual(gemCalls[0].body.systemInstruction.parts[0].text,cfCalls[0].args.messages[0].content);
  reset();gemResults=[response('অংশ [1] ', 'MAX_TOKENS'),response('শেষ [1]।')];r=await ask();assert.equal(r.body.answer,'অংশ [1] শেষ [1]।');assert.equal(gemCalls.length,2);assert.equal(gemCalls[1].body.contents[1].role,'model');assert.equal(cfCalls.length,0);
  reset();gemResults=[response('উত্তর [99]'),response('সংশোধিত [1]')];r=await ask();assert.equal(r.body.answer,'সংশোধিত [1]');assert.equal(gemCalls.length,2);assert(!JSON.stringify(gemCalls[1].body).includes('উত্তর [99]'));
  reset();gemResults=[response('NOT_ENOUGH_INFORMATION')];r=await ask();assert.equal(r.body.grounded,false);assert.equal(cfCalls.length,0,'abstention must not trigger fallback');
  reset();gemResults=[Response.json({promptFeedback:{blockReason:'SAFETY'}})];r=await ask();assert.equal(r.status,502);assert.equal(cfCalls.length,0,'provider safety block cannot be bypassed');
  reset();gemResults=[Response.json({candidates:[{finishReason:'SAFETY',content:{parts:[{text:'unsafe [1]'}]}}]})];r=await ask();assert.equal(r.status,502);assert.equal(cfCalls.length,0);assert(!JSON.stringify(r).includes('unsafe'));
  reset();gemResults=[Response.json({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'hidden reasoning [1]'},{text:'উত্তর [1]'}]}}]})];r=await ask();assert.equal(r.body.answer,'উত্তর [1]');assert(!JSON.stringify(r).includes('hidden reasoning'));
  reset();gemResults=[new Error('sensitive network error')];cfResults=[{response:'বিকল্প [1]'}];r=await ask();assert.equal(r.body.answer,'বিকল্প [1]');assert(!JSON.stringify(r).includes('sensitive'));
  reset();cfResults=[{response:'পুরোনো মডেল [1]'}];r=await ask({...env,GEMINI_ENABLED:'false'});assert.equal(gemCalls.length,0);assert.equal(cfCalls[0].model,'@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  reset();cfResults=[{response:'পুরোনো মডেল [1]'}];r=await ask({...env,gem:undefined});assert.equal(gemCalls.length,0);assert.equal(r.status,200);
  reset();cfResults=[{response:'পুরোনো মডেল [1]'}];r=await ask(env,null);assert.equal(gemCalls.length,0,'old clients without disclosure cannot invoke Gemini');assert.equal(r.status,200);
  console.log('Gemini: opt-in, secret safety, evidence, fallback, block, continuation, citation retry and legacy opt-outs pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
