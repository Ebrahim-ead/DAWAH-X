'use strict';
// Simulated GitHub Pages outage; no live AI or claims about religious accuracy.
const assert=require('node:assert/strict');
(async()=>{
 const {sourceText,EAD_SNAPSHOT,SITE_SNAPSHOT}=await import('../ai-worker/source-fetch.mjs');
 const worker=(await import('../ai-worker/worker.mjs')).default,old=global.fetch,oldWarn=console.warn,logs=[],seen=[];
 console.warn=(...args)=>logs.push(args.join(' '));
 let outage=true,mirrorOutage=false,model='উৎসের তথ্য [1] [2] [3]',calls=0;
 const site='https://ebrahim-ead.github.io/DAWAH-X/',ead='https://ebrahim-ead.github.io/ead/';
 const contents=url=>{
  if(url.endsWith('/assets/search-ayahs.js'))return 'window.SITE_AYAHS=[[2,3,"সালাত কায়েম"]];';
  if(url.endsWith('/assets/quran/data/suras/2.json'))return JSON.stringify({n:2,bnName:'আল-বাকারা',verses:[{a:3,bn:'সালাত কায়েম'},{a:255,bn:'নির্দিষ্ট আয়াত'}]});
  if(url.endsWith('/assets/hadith/data/index.json'))return JSON.stringify({books:[{slug:'bukhari',bn:'সহীহ বুখারী',chapters:[{id:8,bn:'সালাত',from:8,to:58}]}]});
  if(url.endsWith('/hadith-search/meta.json'))return JSON.stringify({version:1,shards:32,books:['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat'],docs:[[0,8,8]]});
  if(/\/hadith-search\/\d\d\.json$/.test(url))return '{}';
  if(url.endsWith('/hadith/data/bukhari/8.json'))return JSON.stringify({book:'bukhari',chapter:8,verses:[{i:8,b:'সালাত বিষয়ে পাঠ',g:'সহিহ'}]});
  if(url.endsWith('/texts/000.json'))return JSON.stringify({'034d218703d000':{t:'সাইটের লেখা',h:'সালাত প্রসঙ্গে লেখা'}});
  throw Error('unexpected fixture');
 };
 global.fetch=async (url,options)=>{url=String(url);seen.push(url);assert.match(options.headers['User-Agent'],/^DAWAH-X-Assistant\//);assert.equal(options.redirect,'manual');
  if(url.startsWith('https://ebrahim-ead.github.io/')){if(outage)return new Response('',{status:403});return new Response(contents(url))}
  if(url.startsWith('https://raw.githubusercontent.com/')){if(mirrorOutage)return new Response('',{status:503});return new Response(contents(url))}
  throw Error('unexpected host');
 };
 const origin='https://ebrahim-ead.github.io',env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async()=>{calls++;return {response:model}}}};
 const req=msg=>new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:msg,ids:['034d218703d000'],pages:[],history:[],lookupComplete:true,allSources:true})});
 try{
  let data=await (await worker.fetch(req('সালাত কী?'),env)).json();
  assert.equal(data.grounded,true,JSON.stringify(data));assert.equal(data.snapshot_search,true);assert.deepEqual(data.sources.map(x=>x.snapshot),[EAD_SNAPSHOT,EAD_SNAPSHOT,SITE_SNAPSHOT]);
  assert(seen.some(x=>x.startsWith('https://raw.githubusercontent.com/Ebrahim-ead/ead/'+EAD_SNAPSHOT+'/')));assert(seen.some(x=>x.startsWith('https://raw.githubusercontent.com/Ebrahim-ead/DAWAH-X/'+SITE_SNAPSHOT+'/')));
  assert(logs.some(x=>x.includes('quran published http-403')));assert(!logs.some(x=>x.includes('সালাত')||x.includes('192.0.2.1')||x.includes('http://')||x.includes('https://')),'diagnostics contain no question, IP or URL');
  // Cached search indexes retain their snapshot provenance in later requests.
  outage=false;data=await (await worker.fetch(req('সালাত কী?'),env)).json();assert.equal(data.snapshot_search,true);assert(data.sources.every(x=>!x.snapshot),'live evidence is not mislabeled when only cached indexes are snapshots');
  outage=true;data=await (await worker.fetch(req('কুরআন ২:২৫৫'),env)).json();assert.equal(data.grounded,true);assert.equal(data.sources[0].snapshot,EAD_SNAPSHOT);assert.equal(data.snapshot_search,true);
  // Failure of both origins never authorizes an answer without evidence.
  mirrorOutage=true;const before=calls;data=await (await worker.fetch(req('কুরআন ২:২৫৫'),env)).json();assert.equal(data.grounded,false);assert.equal(data.partial,true);assert.deepEqual(data.search_failures,['direct_lookup']);assert.deepEqual(data.source_diagnostics,[{category:'quran',origin:'published',reason:'http-403'},{category:'quran',origin:'snapshot',reason:'http-503'}]);assert.equal(calls,before);
  let requested=[];global.fetch=async url=>{requested.push(String(url));return new Response('',{status:404})};
  await assert.rejects(sourceText(site+'texts/000.json',10));assert.equal(requested.length,1,'deleted or missing published content is not silently restored from an old snapshot');
  requested=[];await assert.rejects(sourceText(ead+'../private.json',10));assert.equal(requested.length,1,'unrecognized paths never mirror');
  requested=[];global.fetch=async url=>{requested.push(String(url));return new Response('12345678901')};await assert.rejects(sourceText(site+'texts/000.json',10),/too large/);assert.equal(requested.length,1,'size limits fail closed');
  console.log('assistant snapshot fallback: separate fixed origins, labelled sources, cached provenance and failures pass');
 }finally{global.fetch=old;console.warn=oldWarn}
})().catch(e=>{console.error(e);process.exitCode=1});
