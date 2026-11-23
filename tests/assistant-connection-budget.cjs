'use strict';
// Simulate slow response streams: enforce the Worker's concurrent-connection budget.
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default,old=global.fetch;let active=0,max=0;const seen=[];
 const payload=url=>{
  if(url.endsWith('search-ayahs.js'))return 'window.SITE_AYAHS=[[2,3,"সালাত বাবা সন্তান"],[3,3,"সালাত বাবা সন্তান"],[4,3,"সালাত বাবা সন্তান"]];';
  const sura=url.match(/suras\/(\d+)\.json$/);if(sura)return JSON.stringify({n:+sura[1],bnName:'পরীক্ষা',verses:[{a:3,bn:'সালাত বাবা সন্তান'}]});
  if(url.endsWith('hadith/data/index.json'))return JSON.stringify({books:[]});
  if(url.endsWith('hadith-search/meta.json'))return JSON.stringify({version:1,shards:32,books:['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat'],docs:[[0,1,1]]});
  if(/hadith-search\/\d\d\.json$/.test(url))return '{}';
  if(/texts\/[0-9a-f]{3}\.json$/.test(url)){const shard=url.match(/([0-9a-f]{3})\.json$/)[1],key='00000000000'+shard;return JSON.stringify({[key]:{t:'পরীক্ষা',h:'সালাত বাবা সন্তান'}})}
  if(/(?:about|services|contact|policy)\.html$/.test(url))return '<main>সালাত বাবা সন্তান</main>';
  throw Error('unexpected '+url);
 };
 global.fetch=async url=>{url=String(url);seen.push(url);const bytes=new TextEncoder().encode(payload(url));active++;max=Math.max(max,active);
  return new Response(new ReadableStream({start(c){setTimeout(()=>{active--;c.enqueue(bytes);c.close()},5)}}));};
 const origin='https://ebrahim-ead.github.io',env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async()=>({response:'পরীক্ষা [1]'})}};
 try{
  const body={message:'নামাজ বাবা সন্তান',ids:['00000000000001','00000000000002','00000000000003','00000000000004'],pages:['about.html','services.html','contact.html','policy.html'],history:[],lookupComplete:true,allSources:true};
  const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await (await worker.fetch(req,env)).json();assert.equal(data.grounded,true,JSON.stringify(data));assert(max<=6,'at most six open source streams, got '+max);
  for(const name of ['search-ayahs.js','hadith/data/index.json','hadith-search/meta.json','texts/001.json','about.html'])assert(seen.some(x=>x.endsWith(name)),'all categories attempted: '+name);
  assert(seen.filter(x=>/hadith-search\/\d\d\.json$/.test(x)).length>2,'exercise multiple hadith index batches');
  console.log('assistant sources: every category attempted within concurrent stream budget');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
