'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default;
 const {parseScripture,isPlainScriptureRequest}=await import('../ai-worker/scripture.mjs');
 for(const q of ['কুরআন ২:২৫৫ দেখান','বুখারী হাদিস নম্বর ৮','সূরা ১ আয়াত ২'])assert(isPlainScriptureRequest(q,parseScripture(q)),q);
 for(const q of ['কুরআন ২:২৫৫ এর ব্যাখ্যা কী?','বুখারী ৮ অনুযায়ী তিনটি শর্ত কী?','কুরআন ২:২৫৫ আরবি ও বাংলা দেখান','কুরআন ২:২৫৫ দেখান আর এর ফজিলত কী?','কুরআন ২:২৫৫ হাদিস বলুন','বুখারী ৮ ৯ দেখান','বুখারী ৮ কুরআন বলুন'])assert(!isPlainScriptureRequest(q,parseScripture(q)),q);
 const origin='https://ebrahim-ead.github.io',old=global.fetch;let calls=[],out='পাঠের তথ্য [1] এবং লেখার বিবরণ [2]।';
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_m,args)=>{calls.push(args);return {response:out}}}};
 const request=(message,lookupComplete,extra={})=>new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,lookupComplete,ids:[],history:[],...extra})});
 global.fetch=async u=>{u=String(u);
  if(u.endsWith('/suras/2.json'))return Response.json({n:2,bnName:'আল-বাকারা',verses:[{a:255,bn:'মূল অনুবাদ [১]'}]});
  if(u.endsWith('/hadith/data/index.json'))return Response.json({books:[{slug:'bukhari',bn:'সহীহ বুখারী',chapters:[{id:2,from:8,to:58}]}]});
  if(u.endsWith('/bukhari/2.json'))return Response.json({book:'bukhari',chapter:2,verses:[{i:8,b:'মূল হাদিস পাঠ [২]',g:'সহিহ'}]});
  if(u.endsWith('/texts/000.json'))return Response.json({'034d218703d000':{t:'প্রাসঙ্গিক লেখা',h:'<p>২:২৫৫ ব্যাখ্যা ও বিবরণ</p>'}});
  throw Error('unexpected URL '+u);
 };
 try{
  let r=await worker.fetch(request('কুরআন ২:২৫৫ এর ব্যাখ্যা কী?',false),env),d=await r.json();assert.equal(d.needs_sources,true);assert.notEqual(d.direct_lookup,true);
  r=await worker.fetch(request('কুরআন ২:২৫৫ এর ব্যাখ্যা কী?',true,{ids:['034d218703d000']}),env);d=await r.json();assert.equal(d.grounded,true);assert.equal(d.sources[0].type,'quran');assert.equal(d.sources[0].verse,255);assert.equal(d.sources[1].key,'034d218703d000');assert.match(calls.at(-1).messages[1].content,/মূল অনুবাদ \(অনুবাদের টীকা ১\)/);assert.match(calls.at(-1).messages[1].content,/প্রাসঙ্গিক লেখা/);
  calls=[];out='NOT_ENOUGH_INFORMATION';r=await worker.fetch(request('বুখারী ৮ অনুযায়ী তিনটি শর্ত কী?',true),env);d=await r.json();assert.equal(d.grounded,false,'insufficient interpretation must not be presented as answered');assert.match(calls[0].messages[1].content,/মূল হাদিস পাঠ \(অনুবাদের টীকা ২\)/);
  calls=[];out='শুধু পাঠের তথ্য [1]।';const history=[{role:'user',content:'কুরআন ২:২৫৫ দেখান'},{role:'assistant',content:'অবিশ্বস্ত ভুল তথ্য'}];
  r=await worker.fetch(request('এর ব্যাখ্যা কী?',false,{history}),env);d=await r.json();assert.equal(d.needs_sources,true);assert.notEqual(d.direct_lookup,true);
  r=await worker.fetch(request('এর ব্যাখ্যা কী?',true,{history}),env);d=await r.json();assert.equal(d.sources[0].verse,255);assert(!calls[0].messages[1].content.includes('অবিশ্বস্ত ভুল তথ্য'));
  calls=[];const changed=[...history,{role:'user',content:'আজ আবহাওয়া কেমন?'},{role:'assistant',content:'জানি না'}];r=await worker.fetch(request('এর ব্যাখ্যা কী?',true,{history:changed}),env);d=await r.json();assert.equal(d.grounded,false);assert.equal(calls.length,0,'must not revive a scripture after a topic change');
  calls=[];r=await worker.fetch(request('কুরআন ২:২৮৭ এর ব্যাখ্যা কী?',true),env);d=await r.json();assert.equal(d.grounded,false);assert.equal(calls.length,0);
  global.fetch=async()=>new Response('',{status:503});r=await worker.fetch(request('কুরআন ২:২৫৫ এর ব্যাখ্যা কী?',true),env);assert.equal(r.status,502);
  console.log('assistant numbered context: explicit evidence, interpretation, follow-ups and failures pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
