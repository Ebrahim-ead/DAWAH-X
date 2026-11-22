'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default;
 const {searchScripture}=await import('../ai-worker/topic-search.mjs');
 const origin='https://ebrahim-ead.github.io',seen=[];let captured;
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_model,args)=>{captured=args;return {response:'প্রাসঙ্গিক বিষয় [1] [2] [3]'}}}};
 const req=(message,extra={})=>new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,ids:['034d218703d000'],history:[],lookupComplete:true,scriptureSearch:true,...extra})});
 const old=global.fetch;
 global.fetch=async u=>{u=String(u);seen.push(u);
  if(u.endsWith('/assets/search-ayahs.js'))return new Response('/* source */\nwindow.SITE_AYAHS='+JSON.stringify([[2,3,'সালাত কায়েম করে 10 বার'],[2,4,'সিয়াম সম্পর্কে কথা']])+';');
  if(u.endsWith('/assets/quran/data/suras/2.json'))return Response.json({n:2,bnName:'আল-বাকারা',verses:[{a:3,bn:'মূল পাঠ সালাত কায়েম করে 10 বার [১]'}, {a:4,bn:'সিয়াম সম্পর্কে কথা'}]});
  if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[{slug:'bukhari',bn:'সহীহ বুখারী',chapters:[{id:8,bn:'সালাত'}]}]});
  if(u.endsWith('/assets/hadith/data/bukhari/8.json'))return Response.json({book:'bukhari',chapter:8,verses:[{i:350,dup:0,b:'সালাত নিয়ে নির্দিষ্ট হাদিস',g:'সহিহ'}, {i:351,dup:1,b:'সালাত নিয়ে অস্পষ্ট সংস্করণ'}]});
  if(u.endsWith('/texts/000.json'))return Response.json({'034d218703d000':{t:'সাইটের লেখা',h:'<p>সালাতের তথ্য</p>'}});
  throw Error('unexpected url '+u);
 };
 const oldMock=global.fetch;
 try{
  global.fetch=async()=>new Response('',{status:503});
  let failed=await searchScripture([['সালাত']]);assert.equal(failed.failed,true);assert.deepEqual(failed.items,[]);
  global.fetch=oldMock;
  let response=await worker.fetch(req('নামাজের গুরুত্ব কী?'),env),data=await response.json();assert.equal(response.status,200);assert.equal(data.grounded,true);
  assert.deepEqual(data.sources.map(s=>s.type||'article'),['quran','hadith','article']);
  assert.deepEqual([data.sources[0].surah,data.sources[0].verse],[2,3]);assert.equal(data.sources[1].hadith,350);
  assert.match(captured.messages[1].content,/মূল পাঠ সালাত কায়েম করে 10 বার \(অনুবাদের টীকা ১\)/);
  assert.match(captured.messages[1].content,/সহীহ বুখারী · হাদিস 350/);
  assert.match(captured.messages[0].content,/search hit is only a candidate/i);
  assert(!seen.some(u=>u.includes('evil.test')));
  // No model-derived text, no number or source fabricated from the user.
  const emptyEnv={...env,AI:{run:async()=>{throw Error('must not run without sources')}}};
  response=await worker.fetch(req('নামাজ ও অদেখাপ্রসঙ্গ সম্পর্কে জানতে চাই',{ids:[]}),emptyEnv);data=await response.json();assert.equal(data.grounded,false);assert.deepEqual(data.sources,[]);
  // The exact number is required; 1 must not match 10.
  response=await worker.fetch(req('নামাজ 1 বার কী?',{ids:[]}),emptyEnv);data=await response.json();assert.equal(data.grounded,false);
  env.AI.run=async()=>({response:'তথ্য [1]'});
  response=await worker.fetch(req('নামাজ 10 বার কী?',{ids:[]}),env);data=await response.json();assert.equal(data.grounded,true);assert.equal(data.sources[0].verse,3);
  // A failed site search still permits scripture, but informs the user.
  env.AI.run=async()=>({response:'তথ্য [1]'});
  response=await worker.fetch(req('নামাজের গুরুত্ব কী?',{ids:[],siteSearchFailed:true}),env);data=await response.json();assert.equal(data.grounded,true);assert.equal(data.partial,true);
  response=await worker.fetch(req('নামাজের গুরুত্ব কী?',{scriptureSearch:'true'}),env);assert.equal(response.status,400);
  response=await worker.fetch(req('নামাজের গুরুত্ব কী?',{siteSearchFailed:'true'}),env);assert.equal(response.status,400);
  console.log('assistant topic scripture: primary evidence, identity, strict matching and partial fallbacks pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
