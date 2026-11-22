'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {parseScripture,lookupScripture}=await import('../ai-worker/scripture.mjs');
 const worker=(await import('../ai-worker/worker.mjs')).default;
 assert.deepEqual(parseScripture('কুরআন ২:২৫৫ দেখান'),{kind:'quran',surah:2,verse:255});
 assert.deepEqual(parseScripture('সূরা ১ আয়াত ২'),{kind:'quran',surah:1,verse:2});
 assert.deepEqual(parseScripture('বুখারী হাদিস নম্বর ৮'),{kind:'hadith',book:'bukhari',number:8});
 assert.deepEqual(parseScripture('সহীহ মুসলিম ২৩০'),{kind:'hadith',book:'muslim',number:230});
 assert.deepEqual(parseScripture('কুরআন ২:২৫৫-২৫৭'),{kind:'unsupported'});
 assert.deepEqual(parseScripture('সূরা আলে ইমরান ২:২৫৫'),{kind:'unsupported'},'a conflicting named surah must not be ignored');
 assert.deepEqual(parseScripture('বুখারী ৮, ৯'),{kind:'unsupported'});
 assert.deepEqual(parseScripture('সূরা ২:২৫৫ এবং ২:২৫৬'),{kind:'unsupported'});
 assert.equal(parseScripture('সময় ২:২৫'),null,'a time is not a Quran reference');
 const old=global.fetch,urls=[];
 const index={books:[{slug:'bukhari',bn:'সহীহ বুখারী',chapters:[{id:2,from:8,to:58}]}]};
 const verse={n:2,bnName:'আল-বাকারা',verses:[{a:255,bn:'পরীক্ষার জন্য অপরিবর্তিত অনুবাদ [১]'}]};
 let hadith={book:'bukhari',chapter:2,verses:[{i:8,b:'পরীক্ষার জন্য পূর্ণ হাদিস পাঠ',g:'সহিহ হাদিস'}]};
 global.fetch=async u=>{urls.push(u);if(String(u).endsWith('/suras/2.json'))return Response.json(verse);if(String(u).endsWith('/hadith/data/index.json'))return Response.json(index);if(String(u).endsWith('/bukhari/2.json'))return Response.json(hadith);throw Error('Unexpected URL '+u)};
 const origin='https://ebrahim-ead.github.io',env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async()=>{throw Error('numbered source should not invoke a model')}}};
 const req=(message,lookupComplete)=>new Request('https://example.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,lookupComplete,ids:[],pages:[],history:[]})});
 try{
  let res=await worker.fetch(req('কুরআন ২:২৫৫ দেখান',false),env),data=await res.json();assert.equal(data.needs_sources,true);assert.equal(data.direct_lookup,true);
  res=await worker.fetch(req('কুরআন ২:২৫৫ দেখান',true),env);data=await res.json();assert.equal(data.grounded,true);assert.match(data.answer,/পরীক্ষার জন্য অপরিবর্তিত অনুবাদ \[১\]/);assert.deepEqual(data.sources,[{number:1,title:'সূরা আল-বাকারা · 2:255',type:'quran',surah:2,verse:255}]);
  res=await worker.fetch(req('বুখারী হাদিস নম্বর ৮',false),env);data=await res.json();assert.equal(data.needs_sources,true);
  res=await worker.fetch(req('বুখারী হাদিস নম্বর ৮',true),env);data=await res.json();assert.equal(data.grounded,true);assert.match(data.answer,/পরীক্ষার জন্য পূর্ণ হাদিস পাঠ/);assert.match(data.answer,/সহিহ হাদিস/);assert.deepEqual(data.sources,[{number:1,title:'সহীহ বুখারী · হাদিস 8',type:'hadith',book:'bukhari',chapter:2,hadith:8}]);
  res=await worker.fetch(req('কুরআন ২:২৫৫-২৫৭',true),env);data=await res.json();assert.equal(data.grounded,false,'range must not show a single verse as if complete');
  res=await worker.fetch(req('কুরআন ২:২৮৭',true),env);data=await res.json();assert.equal(data.grounded,false);
  hadith.verses.push({...hadith.verses[0],dup:1});res=await worker.fetch(req('বুখারী ৮',true),env);data=await res.json();assert.equal(data.grounded,false,'ambiguous editions must not be conflated');
  assert.equal(await lookupScripture({kind:'hadith',book:'../../bad',number:8}),null);
  assert(urls.every(x=>String(x).startsWith('https://ebrahim-ead.github.io/ead/')),'never fetch arbitrary user-supplied origins');
  global.fetch=async()=>new Response('',{status:503});res=await worker.fetch(req('কুরআন ২:২৫৫',true),env);assert.equal(res.status,502,'source outage is not a missing verse');
  console.log('assistant scripture: numbered lookups, provenance, ambiguity and failures pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
