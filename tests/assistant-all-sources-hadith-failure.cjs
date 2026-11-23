'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default,old=global.fetch;let models=0,seen=[];
 global.fetch=async u=>{u=String(u);seen.push(u);if(u.endsWith('search-ayahs.js'))return new Response('window.SITE_AYAHS=[[2,3,"সালাত কায়েম"]];');if(u.endsWith('suras/2.json'))return Response.json({n:2,bnName:'বাকারা',verses:[{a:3,bn:'সালাত কায়েম'}]});if(u.endsWith('hadith/data/index.json'))return new Response('',{status:503});if(u.endsWith('texts/000.json'))return Response.json({'034d218703d000':{t:'লেখা',h:'সালাত'}});throw Error('unexpected '+u)};
 const origin='https://ebrahim-ead.github.io',env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async()=>{models++;return {response:'অযাচাইকৃত [1]'}}}};
 try{
  const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'সালাত কী?',ids:['034d218703d000'],history:[],lookupComplete:true,allSources:true})});
  const data=await (await worker.fetch(req,env)).json();assert.equal(data.partial,true);assert.deepEqual(data.search_failures,['hadith']);assert.equal(data.grounded,true);assert.equal(models,1);assert.equal(data.source_coverage.hadith,'failed');assert(seen.some(x=>x.endsWith('suras/2.json')));assert(seen.some(x=>x.endsWith('hadith/data/index.json')));
  console.log('assistant all-source search: hadith outage permits cited partial answer with disclosure');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
