'use strict';
// Real website article data, synthetic scripture and model: exercises the
// exact screenshot question without claiming that mock output is religious truth.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default,old=global.fetch,origin='https://ebrahim-ead.github.io',requests=[];let prompt='',failHadith=false,modelCalls=0;
 global.fetch=async url=>{url=String(url);requests.push(url);
  if(url.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"অন্য পরীক্ষা"]];');
  if(url.endsWith('/assets/hadith/data/index.json'))return failHadith?new Response('',{status:503}):Response.json({books:[{slug:'bukhari',bn:'সহীহ বুখারী',chapters:[{id:1,bn:'তাওহীদ'}]}]});
  if(url.endsWith('/hadith/data/bukhari/1.json'))return Response.json({book:'bukhari',chapter:1,verses:[]});
  if(url.includes('/hadith-search/'))return new Response(fs.readFileSync(path.join(__dirname,'..','hadith-search',url.split('/').pop())));
  const shard=url.match(/\/texts\/([a-f0-9]{3})\.json$/);if(shard)return new Response(fs.readFileSync(path.join(__dirname,'..','texts',shard[1]+'.json')));
  throw Error('unexpected '+url);
 };
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_,args)=>{modelCalls++;prompt=args.messages[1].content;return {response:'উৎসে তাওহীদ নিয়ে আলোচনা আছে [1]'}}}};
 const question='কুরআন ও সুন্নাহর আলোকে তাওহীদের গুরুত্ব কী?';
 const req=()=>new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:question,ids:['0c11409ae22b68'],pages:[],history:[],lookupComplete:true,allSources:true})});
 try{
  failHadith=true;let data=await (await worker.fetch(req(),env)).json();assert.equal(data.partial,true);assert.deepEqual(data.search_failures,['hadith']);assert.equal(data.grounded,true);assert.equal(data.source_coverage.hadith,'failed');assert.equal(modelCalls,1);assert.match(prompt,/Some source searches failed/);
  failHadith=false;data=await (await worker.fetch(req(),env)).json();assert.equal(data.grounded,true,JSON.stringify(data));assert.equal(data.sources[0].key,'0c11409ae22b68');assert(prompt.includes('আধুনিক সমাজে তাওহীদী চেতনার গুরুত্ব'));assert(prompt.includes('Latest question: '+question),'original source request must remain in the model question');assert.match(prompt,/Direct Quran excerpts retrieved: no; direct hadith excerpts retrieved: no/);assert.equal(data.search_limited,true,'chapter-title-only hadith discovery must be disclosed');assert.deepEqual(data.source_coverage,{quran:'no_match',hadith:'no_match'});
  assert(requests.some(x=>x.endsWith('/assets/search-ayahs.js')));assert(requests.some(x=>x.endsWith('/assets/hadith/data/index.json')));assert(requests.some(x=>x.endsWith('/texts/b68.json')));
  console.log('tawhid screenshot: source-preface, original request and limited/unavailable coverage pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
