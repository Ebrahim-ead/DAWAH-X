'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default,old=global.fetch,origin='https://ebrahim-ead.github.io',records=[];
 let answer='NOT_ENOUGH_INFORMATION',failPut=false,rateOK=true,logRateOK=true;
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:rateOK})},UNANSWERED_LIMITER:{limit:async()=>({success:logRateOK})},UNANSWERED_QUESTIONS:{put:async(k,v,o)=>{if(failPut)throw Error('secret details must not be logged');records.push({key:k,value:JSON.parse(v),options:o})}},AI:{run:async model=>{if(answer==='quota')throw Error('model unavailable');return {response:model==='@cf/openai/gpt-oss-20b'?'GROUNDED':answer}}}};
 const body={message:'রোজার অতিবিরল বিষয়ে জানুন',ids:[],pages:[],history:[],lookupComplete:true,allSources:true,unansweredLogging:true};
 function request(extra={}){return new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({...body,...extra})})}
 async function run(extra={},workerEnv=env){const waits=[],res=await worker.fetch(request(extra),workerEnv,{waitUntil:p=>waits.push(p)});await Promise.all(waits);return {res,data:await res.json()}}
 global.fetch=async input=>{const url=String(input);
  if(url.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[2,3,"সালাতের প্রাসঙ্গিক পাঠ"]];');
  if(url.endsWith('/assets/quran/data/suras/2.json'))return Response.json({n:2,bnName:'বাকারা',verses:[{a:3,bn:'সালাতের প্রাসঙ্গিক পাঠ'}]});
  if(url.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});
  if(url.endsWith('/hadith-search/meta.json'))return Response.json({version:1,shards:32,books:['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat'],docs:[[0,1,1]]});
  if(/\/hadith-search\/\d\d\.json$/.test(url))return Response.json({});
  throw Error('unexpected source');
 };
 try{
  let d=await run({message:'রোজার অতিবিরল বিষয়ে লিখুন test@example.com 01712345678 https://example.test/page'});assert.equal(d.res.status,200);assert.equal(d.data.grounded,false);assert.equal(records.length,1);
  const {key,value,options}=records[0];assert.match(key,/^unanswered\/\d{4}-\d\d-\d\d\/[0-9a-f-]{36}$/);assert.equal(options.expirationTtl,30*86400);assert.equal(value.reason,'no_candidates');assert.equal(value.search,'bounded');assert(!JSON.stringify(value).includes('192.0.2.1'));assert(!value.question.includes('test@example.com'));assert(!value.question.includes('01712345678'));assert(!value.question.includes('https://'));assert.deepEqual(Object.keys(value).sort(),['day','question','reason','search','version']);
  records.length=0;await run({unansweredLogging:false});await run({unansweredLogging:undefined});await run({siteSearchFailed:true});await run({sourceFilter:'quran'});await run({message:'আরও বলুন',history:[{role:'user',content:'রোজার অতিবিরল বিষয়ে বলুন'},{role:'assistant',content:'আগের উত্তর'}]});assert.equal(records.length,0,'opt-out, old clients, partial, filtered and follow-up searches do not log');
  d=await run({unansweredLogging:'true'});assert.equal(d.res.status,400);
  d=await run({message:'নামাজ কী?'});assert.equal(d.data.grounded,false);assert.equal(records.length,1);assert.equal(records[0].value.reason,'model_abstained');
  records.length=0;answer='উত্তর [9]';d=await run({message:'নামাজ কী?'});assert(d.data.verification_failed);assert.equal(records.length,0,'invalid citations are not missing-content logs');
  answer='quota';d=await run({message:'নামাজ কী?'});assert.equal(d.res.status,502);assert.equal(records.length,0,'model failure is not missing content');
  answer='NOT_ENOUGH_INFORMATION';rateOK=false;d=await run();assert.equal(d.res.status,429);assert.equal(records.length,0);rateOK=true;
  logRateOK=false;d=await run();assert.equal(d.res.status,200);assert.equal(records.length,0,'independent write limiter throttles KV writes');logRateOK=true;
  failPut=true;const warn=console.warn;console.warn=()=>{};try{d=await run();assert.equal(d.res.status,200);assert.equal(records.length,0,'storage failure does not prevent an answer')}finally{console.warn=warn;failPut=false}
  const without={...env,UNANSWERED_QUESTIONS:undefined};d=await run({},without);assert.equal(d.res.status,200);assert.equal(records.length,0,'unconfigured binding does not collect or break responses');
  console.log('Unanswered tracker: user preference, bounded search, privacy, retention, outage isolation and KV failure pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
