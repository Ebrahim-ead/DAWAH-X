'use strict';
// Regression uses the real browser indexes and site articles; upstream
// scripture and model are mocked, so a citation is not proof of correctness.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const {default:worker,queryTerms}=await import('../ai-worker/worker.mjs');
 const {topics,score,articleCandidate}=await import('../ai-worker/topic-search.mjs');
 const questions=[['ওজুর ফরজ কয়টি','04d9abe3dae2a2'],['রোজা ভাঙ্গার কারণ কি কি','008c1cb3e535f0']];
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* ===== /মিলে-যাওয়া লেখা ও ভিডিও ===== */',start);assert(start>=0&&end>start);
 const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async u=>new Response(fs.readFileSync(path.join(root,String(u))))};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',sandbox);
 const selected=[];
 for(const [q,key] of questions){
  const found=await sandbox.suggest.find(q,{includeVideos:false,includeBodyMatches:true});const ids=Array.from(found.texts.slice(0,4),x=>x.k);
  assert(ids.includes(key),'actual browser search must surface '+key+' for '+q);
  const article=JSON.parse(fs.readFileSync(path.join(root,'texts',key.slice(-3)+'.json')))[key];
  assert(articleCandidate(article.h,queryTerms(q)),'actual answer body must survive the filter: '+q);selected.push(ids);
 }
 for(const word of ['কয়টি','কয়টা','কতটি','কতটা'])assert(!topics(queryTerms('ওজুর ফরজ '+word)).some(g=>g.includes(word)),'count question word is not a required answer literal');
 const numeric=topics(queryTerms('ওজুর ৫ ফরজ কয়টি'));assert.equal(score('ওজুর ৫ ফরজ',numeric),3);assert.equal(score('ওজুর ১৫ ফরজ',numeric),2,'an explicit number must not be discarded or match a larger count');
 for(const q of ['রোজা ভাঙ্গার কারণ','রোজা ভাঙার কারণ','রোজা ভঙ্গের কারণ']){
  assert(articleCandidate('ছিয়াম ভঙ্গ করার কারণ রোগ ও ভ্রমণ।',queryTerms(q)),q);
  assert(!articleCandidate('ছিয়াম ও সুস্থতা সম্পর্কে আলোচনা।',queryTerms(q)),'both subject and condition stay mandatory: '+q);
 }
 assert(!articleCandidate('অন্য বিষয়ে লেখা।',queryTerms('সালাতের গুরুত্ব কী?')),'single topic must be present in the source');
 assert(articleCandidate('ছালাত সম্পর্কে আলোচনা।',queryTerms('সালাতের গুরুত্ব কী?')));
 const old=global.fetch,origin='https://ebrahim-ead.github.io';let prompt='',calls=0;
 global.fetch=async u=>{u=String(u);if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"পরীক্ষার তথ্য"]];');if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});const m=u.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(texts\/[a-f0-9]{3}\.json|hadith-search\/(?:meta|\d\d)\.json)$/);if(m)return new Response(fs.readFileSync(path.join(root,m[1])));throw Error('Unexpected upstream '+u)};
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_,args)=>{calls++;prompt=args.messages[1].content;return {response:'উৎসের প্রাসঙ্গিক তথ্য [1]'}}}};
 const ask=async(message,ids)=>{const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,ids,pages:[],history:[],lookupComplete:true,allSources:true,scriptureSearch:true})});return (await worker.fetch(req,env)).json()};
 try{
  {const [q,key]=questions[0],data=await ask(q,selected[0]);assert.equal(data.grounded,true,q);assert(data.sources.some(s=>s.key===key),q);assert(prompt.includes('Latest question: '+q),'original question must reach the model');}
  {const [q,key]=questions[1],data=await ask(q,selected[1]);assert(!data.sources?.some(s=>s.key===key),'reviewed contradictory source must not become automatic evidence');assert.equal(data.search_limited,true);}
  {const [q,key]=questions[1],before=calls,data=await ask(q,[key]);assert.equal(data.grounded,false,'excluded source alone cannot produce an answer');assert.equal(data.search_limited,true);assert.equal(calls,before,'excluded source is never sent to the answer model');}
  const before=calls,data=await ask('সালাতের গুরুত্ব কী?',['008c1cb3e535f0']);assert.equal(data.grounded,false,'unrelated one-topic candidate must not become evidence');assert.equal(calls,before);
 }finally{global.fetch=old}
 console.log('count questions and Bengali inflections: real browser and worker retrieval, numeric and unrelated-source safeguards pass');
})().catch(e=>{console.error(e);process.exitCode=1});
