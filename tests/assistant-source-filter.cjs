'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default,origin='https://ebrahim-ead.github.io';let requests=[],prompt='';
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_m,args)=>{prompt=args.messages[1].content;return {response:'পাঠে সংশ্লিষ্ট কথা আছে [1]।'}}}};
 const req=(message,sourceFilter,extra={})=>new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,sourceFilter,ids:['034d218703d000'],pages:['index.html'],history:[],lookupComplete:true,allSources:true,...extra})});
 const old=global.fetch;global.fetch=async url=>{url=String(url);requests.push(url);
  if(url.endsWith('/suras/2.json'))return Response.json({n:2,bnName:'আল-বাকারা',verses:[{a:255,bn:'পর্দা সম্পর্কে মূল আয়াত'},{a:256,bn:'সিয়াম ও সফর সম্পর্কে পাঠ'}]});
  if(url.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[2,255,"পর্দা সম্পর্কে কথা"],[2,256,"সিয়াম ও সফর সম্পর্কে কথা"]];');
  throw Error('Unexpected URL '+url);
 };
 try{
  let r=await worker.fetch(req('কুরআন ২:২৫৫ দেখান','hadith'),env),d=await r.json();assert.equal(d.grounded,false);assert.equal(requests.length,0,'wrong source must not resolve direct lookup');
  r=await worker.fetch(req('কুরআন ২:২৫৫ দেখান','quran'),env);d=await r.json();assert.equal(d.grounded,true);assert.equal(d.sources[0].type,'quran');
  requests=[];r=await worker.fetch(req('পর্দা কী','quran'),env);d=await r.json();assert(!requests.some(x=>/hadith|\/texts\/|index\.html/.test(x)),'unselected sources must not be fetched');
  assert.equal(d.grounded,true);assert(d.sources.every(x=>x.type==='quran'));assert.equal(d.source_coverage.hadith,'skipped');
  const history=[{role:'user',content:'রোজা কী?'},{role:'assistant',content:'অবিশ্বস্ত পুরোনো তথ্য'}];
  r=await worker.fetch(req('আমি সফরে থাকলে কী করব?','quran',{history}),env);d=await r.json();assert.equal(d.grounded,true,'context and meaningful travel condition are retrieved together');assert.match(prompt,/রোজা কী/);assert.match(prompt,/সফরে/);assert(!prompt.includes('অবিশ্বস্ত পুরোনো তথ্য'),'assistant history is never evidence');
  prompt='';r=await worker.fetch(req('আমার ক্ষেত্রে যদি এমন হয়?','quran',{history}),env);d=await r.json();assert.equal(d.grounded,false);assert.match(d.answer,/বিস্তারিত/);assert.equal(prompt,'','vague condition asks for clarification');
  r=await worker.fetch(req('পর্দা কী','quran',{history}),env);d=await r.json();assert.equal(d.grounded,true);assert(!prompt.includes('রোজা কী'),'new topic does not inherit old context');
  r=await worker.fetch(req('পর্দা কী','anything'),env);assert.equal(r.status,400);
  console.log('assistant source filters: direct lookup boundaries, selected-source I/O and validation pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
