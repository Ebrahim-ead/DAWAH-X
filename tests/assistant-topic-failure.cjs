'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {searchScripture}=await import('../ai-worker/topic-search.mjs');
 const worker=(await import('../ai-worker/worker.mjs')).default;
 const old=global.fetch;let corrupt=true,stale=false;
 global.fetch=async u=>{
  u=String(u);
  if(u.endsWith('search-ayahs.js'))return new Response(corrupt?'globalThis.evil=1;window.SITE_AYAHS=[];':'window.SITE_AYAHS=[[2,3,"সালাত কায়েম"]];');
  if(u.endsWith('texts/000.json'))return Response.json({'034d218703d000':{t:'সাইটের আলোচনা',h:'<p>সালাতের বিষয়ে তথ্য</p>'}});
  if(u.endsWith('hadith/data/index.json'))return new Response('',{status:503});
  if(u.endsWith('suras/2.json'))return Response.json({n:2,bnName:'বাকারা',verses:[{a:3,bn:stale?'ভিন্ন বিষয়':'সালাত কায়েম'}]});
  throw Error('unexpected '+u);
 };
 try{
  let r=await searchScripture([['সালাত']]);assert.deepEqual(r.items,[]);assert.equal(r.failed,true);assert.equal(globalThis.evil,undefined,'remote index must never be evaluated');
  corrupt=false;r=await searchScripture([['সালাত']]);assert.equal(r.items.length,1);assert.equal(r.failed,true,'one broken source must be reported');
  stale=true;r=await searchScripture([['সালাত']]);assert.equal(r.items.length,0,'stale index must not be treated as original evidence');assert.equal(r.failed,true);
  const origin='https://ebrahim-ead.github.io',env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async()=>({response:'সাইটের আলোচনা [1]'})}};
  const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'সালাতের গুরুত্ব কী?',ids:['034d218703d000'],history:[],lookupComplete:true,scriptureSearch:true})});
  const res=await worker.fetch(req,env),body=await res.json();assert.equal(body.grounded,true);assert.equal(body.partial,true);assert.equal(body.sources[0].title,'সাইটের আলোচনা');
  console.log('assistant topic scripture: malformed index, outage, site fallback, recovery, stale candidates pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
