'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {default:worker}=await import('../ai-worker/worker.mjs');
 const old=global.fetch,origin='https://ebrahim-ead.github.io',ids=Array.from({length:6},(_,i)=>(i+1).toString(16).padStart(14,'0'));let active=0,max=0,fetched=[];
 global.fetch=async u=>{u=String(u);if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"অন্যান্য তথ্য"]];');if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});if(u.endsWith('/hadith-search/meta.json'))return Response.json({version:1,shards:32,books:['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat'],docs:[[0,1,1]]});if(/\/hadith-search\/\d\d\.json$/.test(u))return Response.json({});const m=u.match(/\/texts\/([0-9a-f]{3})\.json$/);if(m){active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;fetched.push(m[1]);const id=ids.find(x=>x.endsWith(m[1]));return Response.json({[id]:{t:'ছালাতের গুরুত্ব',h:'ছালাতের গুরুত্ব নিয়ে পরীক্ষামূলক পাঠ।'}})}throw Error('Unexpected '+u)};
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async()=>({response:'নমুনা [6]'})}};
 try{const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'সালাতের গুরুত্ব কী?',ids,pages:[],history:[],lookupComplete:true,allSources:true,scriptureSearch:true})});const data=await (await worker.fetch(req,env)).json();assert.equal(data.grounded,true);assert.equal(data.sources[0].key,ids[5],'sixth candidate must reach model evidence');assert.equal(fetched.length,6);assert(max<=3,'article requests must remain bounded');}finally{global.fetch=old}
 console.log('six article candidates: sixth source usable and concurrent requests bounded');
})().catch(e=>{console.error(e);process.exitCode=1});
