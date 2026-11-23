'use strict';
// Real site vocabulary, search indexes and article shards. Scripture and model
// are mocked; a retrieval/citation check is not proof of religious accuracy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const {default:worker,queryTerms}=await import('../ai-worker/worker.mjs');
 const {articleCandidate}=await import('../ai-worker/topic-search.mjs');
 const vocab=JSON.parse(fs.readFileSync(path.join(root,'search/typo-vocab.json'))),expected=[];
 for(let i=0;i<64;i++){const shard=JSON.parse(fs.readFileSync(path.join(root,'search','t'+String(i).padStart(2,'0')+'.json')));for(const w of Object.keys(shard))if(/^[\u0980-\u09ff]+$/u.test(w)&&[...w].length>=4&&[...w].length<=24)expected.push(w)}
 const titleMeta=JSON.parse(fs.readFileSync(path.join(root,'search/titles.json')));
 assert.equal(vocab.n,titleMeta.n);assert.equal(vocab.hash,titleMeta.typoHash);assert.equal(vocab.hash,crypto.createHash('sha256').update(JSON.stringify(vocab.words)).digest('hex'));
 assert.deepEqual(vocab.words.slice().sort(),expected.sort(),'spelling vocabulary must match the current title index');
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* ===== /মিলে-যাওয়া লেখা ও ভিডিও ===== */',start);assert(start>=0&&end>start);
 const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async u=>new Response(fs.readFileSync(path.join(root,String(u))))};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',sandbox);
 const samples=[
  {q:'কোর্ট বিবাহ করা কি জায়েজ',key:'08d0113908f2a6'},
  {q:'কোর্ট বিবহ জায়েজ',key:'08d0113908f2a6',from:'বিবহ',to:'বিবাহ'},
  {q:'রোজা ইনজেকসান',key:'0ef127f864a7f3',from:'ইনজেকসান',to:'ইনজেকসন'},
  {q:'পরতিবেসি অধিকার',key:'18e9324970d732',from:'পরতিবেসি',to:'প্রতিবেসি'}
 ];
 for(const s of samples){
  const found=await sandbox.suggest.find(s.q,{includeVideos:false,includeBodyMatches:true});s.ids=Array.from(found.texts.slice(0,6),x=>x.k);s.correction=found.correction;
  assert(found.limited,'bounded search must not claim complete coverage');assert(s.ids.includes(s.key),'real index candidate for '+s.q);
  if(s.from){assert.equal(s.correction?.from,s.from);assert.equal(s.correction?.to,s.to)}else assert.equal(s.correction,undefined);
  const article=JSON.parse(fs.readFileSync(path.join(root,'texts',s.key.slice(-3)+'.json')))[s.key];
  assert(articleCandidate(article.h,queryTerms(s.q),s.correction),'source must pass independently checked filter: '+s.q);
  if(s.from)assert(!articleCandidate(article.h,queryTerms(s.q)),'typo hints must be explicit');
 }
 const unknown=await sandbox.suggest.find('কোর্ট বিবাহ জায়েজ কোয়ান্টামফটোনিক্স',{includeVideos:false,includeBodyMatches:true});assert.equal(unknown.texts.length,0);assert.equal(unknown.correction,undefined,'unknown conditions must not be silently dropped');
 const multiple=await sandbox.suggest.find('রোজা ইনজেকসান কোয়ান্টামফটোনিক্স',{includeVideos:false,includeBodyMatches:true});assert.equal(multiple.texts.length,0);assert.equal(multiple.correction,undefined,'do not guess multiple unknown terms');
 const base='ইনজেকশন ও ছিয়াম সম্পর্কে আলোচনা';
 assert(!articleCandidate(base,queryTerms('রোজা ইনজেকসান কোয়ান্টামফটোনিক্স'),{from:'ইনজেকসান',to:'ইনজেকসন'}),'other unknown conditions remain required');
 assert(!articleCandidate(base,queryTerms('রোজা ইনজেকসান'),{from:'ইনজেকসান',to:'কিছুসম্পূর্ণঅন্য'}),'client hints cannot bypass the edit bound');
 assert(!articleCandidate('ছিয়াম ১৫ বার ইনজেকশন',queryTerms('রোজা ৫ ইনজেকসান'),{from:'ইনজেকসান',to:'ইনজেকসন'}),'numbers cannot be fuzzy or discarded');
 assert(!articleCandidate('ছিয়াম। '+('অন্য ঘটনা '.repeat(50))+'ইনজেকশন',queryTerms('রোজা ইনজেকসান'),{from:'ইনজেকসান',to:'ইনজেকসন'}),'unrelated distant terms cannot become evidence');
 // The spelling index must be retried after failure, not silently ignored.
 const original=sandbox.fetch;sandbox.suggest.typo=null;sandbox.fetch=async u=>String(u)==='search/typo-vocab.json'?new Response('',{status:503}):original(u);
 assert.equal(await sandbox.suggest.find('রোজা ইনজেকসান',{includeVideos:false,includeBodyMatches:true}),null);
 sandbox.fetch=async u=>String(u)==='search/typo-vocab.json'?Response.json({...vocab,hash:'a'.repeat(64)}):original(u);assert.equal(await sandbox.suggest.find('রোজা ইনজেকসান',{includeVideos:false,includeBodyMatches:true}),null,'stale spelling index must fail visibly');
 sandbox.fetch=original;assert((await sandbox.suggest.find('রোজা ইনজেকসান',{includeVideos:false,includeBodyMatches:true})).correction);
 let prompt='',calls=0;const old=global.fetch,origin='https://ebrahim-ead.github.io';
 global.fetch=async u=>{u=String(u);if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"পরীক্ষার তথ্য"]];');if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});const m=u.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(texts\/[a-f0-9]{3}\.json|hadith-search\/(?:meta|\d\d)\.json)$/);if(m)return new Response(fs.readFileSync(path.join(root,m[1])));throw Error('Unexpected upstream '+u)};
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_,args)=>{calls++;prompt=args.messages[1].content;return {response:'প্রাসঙ্গিক উৎসের তথ্য [1]'}}}};
 const ask=async(q,ids,correction)=>{const r=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:q,ids,pages:[],history:[],lookupComplete:true,allSources:true,scriptureSearch:true,siteSearchLimited:true,...(correction?{searchCorrection:correction}:{})})});return (await worker.fetch(r,env)).json()};
 try{
  for(const s of samples){const d=await ask(s.q,s.ids,s.correction);assert.equal(d.grounded,true,s.q);assert(d.sources.some(x=>x.key===s.key),s.q);assert(prompt.includes('Latest question: '+s.q),'original question must remain unchanged');assert.match(prompt,/typo/);assert.equal(d.search_limited,true)}
  const before=calls;const d=await ask('রোজা অপরিচিতবিষয়', ['0ef127f864a7f3'],{from:'ইনজেকসান',to:'ইনজেকসন'});assert.equal(d.grounded,false,'a hint unrelated to the question must not bypass validation');assert.equal(calls,before);
 }finally{global.fetch=old}
 assert(fs.readFileSync(path.join(root,'assistant.js'),'utf8').includes('সম্ভাব্য বানান ব্যবহার'), 'users must be told about a suggested spelling');
 console.log('assistant spelling: actual indexes and sources, screenshot, ambiguity, outage and worker validation pass');
})().catch(e=>{console.error(e);process.exitCode=1});
