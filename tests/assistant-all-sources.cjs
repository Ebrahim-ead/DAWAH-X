'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default;
 const origin='https://ebrahim-ead.github.io',old=global.fetch,events=[];let siteBroken=false,allBroken=false,modelAnswer='তথ্য [1] [2] [3]';
 global.fetch=async u=>{u=String(u);events.push(u);if(allBroken)return new Response('',{status:503});
  if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[2,3,"সালাত কায়েম"]];');
  if(u.endsWith('/assets/quran/data/suras/2.json'))return Response.json({n:2,bnName:'আল-বাকারা',verses:[{a:3,bn:'সালাত কায়েম'}, {a:255,bn:'নির্দিষ্ট আয়াত'}]});
  if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[{slug:'bukhari',bn:'সহীহ বুখারী',chapters:[{id:8,bn:'সালাত',from:8,to:58}]}]});
  if(u.endsWith('/hadith-search/meta.json'))return Response.json({version:1,shards:32,books:['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat'],docs:[[0,8,8]]});
  if(/\/hadith-search\/\d\d\.json$/.test(u))return Response.json({});
  if(u.endsWith('/bukhari/8.json'))return Response.json({book:'bukhari',chapter:8,verses:[{i:8,b:'সালাত বিষয়ে পাঠ',g:'সহিহ'}]});
  if(u.endsWith('/texts/000.json'))return siteBroken?new Response('',{status:503}):Response.json({'034d218703d000':{t:'সাইটের লেখা',h:'<p>সালাত প্রসঙ্গে লেখা</p>'}});
  throw Error('unexpected '+u);
 };
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(model,args)=>{events.push('AI:'+model);if(model.includes('8b'))return {response:'CHAT'};assert(args.messages[1].content.includes('সালাত কায়েম'));assert(args.messages[1].content.includes('সালাত বিষয়ে পাঠ'));if(!siteBroken)assert(args.messages[1].content.includes('সালাত প্রসঙ্গে লেখা'));return {response:modelAnswer}}}};
 const req=(message,extra={})=>new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,ids:['034d218703d000'],pages:[],history:[],lookupComplete:true,allSources:true,...extra})});
 try{
  let r=await worker.fetch(req('সালাত কী?',{lookupComplete:false}),env),data=await r.json();assert.deepEqual(data,{needs_sources:true,all_sources:true});assert.equal(events.length,0,'no answer before site search');
  allBroken=true;r=await worker.fetch(req('সালাত কী?'),env);data=await r.json();assert.equal(data.grounded,false);assert.equal(data.partial,true);assert.deepEqual(data.search_failures,['quran','hadith','articles']);assert.match(data.answer,/পর্যাপ্ত তথ্য পাওয়া যায়নি/);assert(!events.some(x=>x.startsWith('AI:')),'outage must not call the model');allBroken=false;events.length=0;
  r=await worker.fetch(req('সালাত কী?'),env);data=await r.json();assert.equal(data.grounded,true);assert.deepEqual(data.sources.map(x=>x.type||'article'),['quran','hadith','article']);let ai=events.findIndex(x=>x.startsWith('AI:'));for(const suffix of ['search-ayahs.js','hadith/data/index.json','bukhari/8.json','texts/000.json'])assert(events.findIndex(x=>x.endsWith(suffix))<ai,'must search '+suffix+' before generating');
  // A failure does not block usable evidence, but must be disclosed.
  events.length=0;siteBroken=true;modelAnswer='তথ্য [1] [2]';r=await worker.fetch(req('সালাত কী?'),env);data=await r.json();assert.equal(data.grounded,true);assert.equal(data.partial,true);assert.deepEqual(data.search_failures,['articles']);assert(events.some(x=>x.startsWith('AI:')));
  modelAnswer='তথ্য [99]';events.length=0;r=await worker.fetch(req('সালাত কী?'),env);data=await r.json();assert.equal(data.grounded,false);assert.equal(data.verification_failed,true);assert.deepEqual(data.search_failures,['articles']);
  siteBroken=false;modelAnswer='তথ্য [1] [2] [3]';events.length=0;r=await worker.fetch(req('সালাত কী?',{siteSearchFailed:true}),env);data=await r.json();assert.equal(data.grounded,true);assert.equal(data.partial,true);assert.deepEqual(data.search_failures,['site_search']);assert(events.some(x=>x.startsWith('AI:')));
  events.length=0;r=await worker.fetch(req('কুরআন ২:২৫৫',{ids:[],lookupComplete:false}),env);data=await r.json();assert.equal(data.direct_lookup,true);assert.equal(events.length,0);
  events.length=0;r=await worker.fetch(req('কুরআন ২:২৫৫',{ids:[]}),env);data=await r.json();assert.equal(data.grounded,true);assert.equal(data.sources[0].verse,255);assert(!events.some(x=>x.startsWith('AI:')),'literal direct text remains unchanged');assert(!events.some(x=>x.endsWith('search-ayahs.js')),'direct lookup avoids unrelated search');
  allBroken=true;events.length=0;r=await worker.fetch(req('কুরআন ২:২৫৫',{ids:[]}),env);data=await r.json();assert.equal(data.grounded,false);assert.equal(data.partial,true);assert.deepEqual(data.search_failures,['direct_lookup']);assert(!events.some(x=>x.startsWith('AI:')));allBroken=false;
  // General chat is routed and generated only after searches finish.
  events.length=0;const chatEnv={...env,AI:{run:async(model)=>{events.push('AI:'+model);return {response:model.includes('8b')?'CHAT':'আমি ভালো আছি।'}}}};
  r=await worker.fetch(req('হ্যালো',{ids:['034d218703d000']}),chatEnv);data=await r.json();assert.equal(data.mode,'chat');assert(events.findIndex(x=>x.endsWith('texts/000.json'))<events.findIndex(x=>x.startsWith('AI:')));
  r=await worker.fetch(req('হ্যালো',{siteSearchLimited:true}),chatEnv);data=await r.json();assert.equal(data.search_limited,true);
  events.length=0;r=await worker.fetch(req('hm',{ids:[]}),chatEnv);data=await r.json();assert.equal(data.mode,'chat');assert.match(data.answer,/আর কী জানতে চান/);assert.equal(data.search_limited,true);assert(!events.some(x=>x.startsWith('AI:')),'bare acknowledgement does not need model inference');
  r=await worker.fetch(req('হ্যালো',{allSources:'true'}),chatEnv);assert.equal(r.status,400);
  const client=fs.readFileSync(path.join(__dirname,'../assistant.js'),'utf8');assert.match(client,/allSources:true/);assert.match(client,/data\.all_sources!==true/);assert(client.includes('data.direct_lookup!==true'));
  console.log('assistant all-source search: sequencing, failures, direct lookup and chat pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
