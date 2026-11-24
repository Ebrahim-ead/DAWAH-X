'use strict';
// Real generated indexes and source texts; Workers AI and network are mocked.
// These tests check retrieval and evidence flow, not factual or legal accuracy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* ===== /মিলে-যাওয়া লেখা ও ভিডিও ===== */',start);assert(start>=0&&end>start);
 const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async u=>new Response(fs.readFileSync(path.join(root,String(u))))};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.search=assistantSearch;globalThis.suggest=SUGGEST;',sandbox);sandbox.suggest.videos=async()=>null;
 const {default:worker,queryTerms,excerpt}=await import('../ai-worker/worker.mjs');const {articleCandidate,topics}=await import('../ai-worker/topic-search.mjs');
 const samples=[
  {q:'জোহরের নামাজ কখন পড়বো',key:'0d23f645a6b8cf'},
  {q:'ফজরের নামাজ কখন পড়বো',key:'0f1c531eed7f93'},
  {q:'ফরজ গোসল কিভাবে করব',key:'1dea5c19f66f76'},
  {q:'কাকে যাকাত দিতে পারবো',key:'0fdc4a2fc82cd4'}
 ];
 for(const s of samples){
  const found=await sandbox.search(s.q);assert(found);s.ids=Array.from(found.texts.slice(0,6),v=>v.k);assert(s.ids.includes(s.key),'relevant candidate must survive ranking for '+s.q);
  const source=JSON.parse(fs.readFileSync(path.join(root,'texts',s.key.slice(-3)+'.json')))[s.key];s.title=source.t;
  assert(articleCandidate(excerpt(source.h,s.q),queryTerms(s.q),null,source.t),'source must reach model after prefilter: '+s.q);
 }
 for(const q of ['জোহরের নামাজ কখন পড়বো কোয়ান্টামফটোনিক্স','ফরজ গোসল কিভাবে করব কোয়ান্টামফটোনিক্স'])assert.equal((await sandbox.search(q)).texts.length,0,'unknown condition must not be silently ignored: '+q);
 const bathing=JSON.parse(fs.readFileSync(path.join(root,'texts/f76.json')))['1dea5c19f66f76'];
 assert(!articleCandidate(excerpt(bathing.h,'ফরজ গোসল কিভাবে করব মঙ্গলগ্রহে'),queryTerms('ফরজ গোসল কিভাবে করব মঙ্গলগ্রহে'),null,bathing.t),'extra condition must remain required by the Worker');
 assert(topics(queryTerms('কাকে যাকাত দিতে পারবো')).some(g=>g.includes('দিতে')),'giving remains a substantive action');
 assert(topics(queryTerms('কাকে যাকাত নিতে পারবো')).some(g=>g.includes('নিতে')),'receiving must not become giving');
 assert(topics(queryTerms('জোহরের নামাজ কখন পড়বো ৩ রাকাত')).some(g=>g.numeric),'explicit numbers remain required');
 const old=global.fetch,origin='https://ebrahim-ead.github.io';let prompt='',system='';
 global.fetch=async u=>{u=String(u);if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"অন্য পরীক্ষা"]];');if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});const m=u.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(texts\/[a-f0-9]{3}\.json|hadith-search\/(?:meta|\d\d)\.json)$/);if(m)return new Response(fs.readFileSync(path.join(root,m[1])));throw Error('unexpected upstream '+u)};
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_,args)=>{system=args.messages[0].content;prompt=args.messages[1].content;return {response:'প্রাপ্ত উৎসের তথ্য [1]'}}}};
 try{
  for(const s of samples){const request=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:s.q,ids:s.ids,pages:[],history:[],lookupComplete:true,allSources:true,scriptureSearch:true,siteSearchLimited:true})});
   const data=await (await worker.fetch(request,env)).json();assert.equal(data.grounded,true,JSON.stringify(data));assert(prompt.includes(s.title),'the actual relevant source reaches the model: '+s.q);assert(prompt.includes('Latest question: '+s.q),'original question is preserved');assert.match(prompt,/never present an old or illustrative time/i);assert.match(system,/Do not generalize/);assert(data.sources.length);
  }
 }finally{global.fetch=old}
 console.log('general questions: time, method and recipient retrieval, original context and conservative negative cases pass');
})().catch(e=>{console.error(e);process.exitCode=1});
