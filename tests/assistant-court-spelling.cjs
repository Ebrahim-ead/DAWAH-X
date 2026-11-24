'use strict';
// Screenshot spelling against actual local index and sources. The model and
// network are mocked; these tests cannot prove live AI or semantic accuracy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* ===== /মিলে-যাওয়া লেখা ও ভিডিও ===== */',start);assert(start>=0&&end>start);
 const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async u=>new Response(fs.readFileSync(path.join(root,String(u))))};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.search=assistantSearch;globalThis.suggest=SUGGEST;',sandbox);
 sandbox.suggest.videos=async()=>null;
 const q='কোটে বিবাহ কি জায়েজ',key='08d0113908f2a6',found=await sandbox.search(q);
 assert(found);assert.equal(found.correction?.from,'কোটে');assert.equal(found.correction?.to,'কোর্ট');assert(found.texts.slice(0,6).some(x=>x.k===key),'specific general article should be found for screenshot wording');
 const second=await sandbox.search('কোট বিবাহ কি জায়েজ');assert(second.texts.some(x=>x.k===key));assert.equal(second.correction?.from,'কোট');
 const ordinary=await sandbox.search('কোটের বোতাম কি জায়েজ');assert(!ordinary?.correction||ordinary.correction.to!=='কোর্ট','no marriage context: do not assume court');
 const unknown=await sandbox.search('কোটে বিবাহ জায়েজ কোয়ান্টামফটোনিক্স');assert.equal(unknown.texts.length,0,'other unknown conditions must not be discarded');
 const article=JSON.parse(fs.readFileSync(path.join(root,'texts',key.slice(-3)+'.json')))[key];
 const {default:worker,queryTerms}=await import('../ai-worker/worker.mjs');const {articleCandidate}=await import('../ai-worker/topic-search.mjs');
 const hint={from:'কোটে',to:'কোর্ট'};assert(articleCandidate(article.h,queryTerms(q),hint,article.t));
 assert(!articleCandidate(article.h,queryTerms(q),null,article.t),'corrected candidates require an explicit hint');
 assert(!articleCandidate(article.h,queryTerms('কোটে বিবাহ জায়েজ মঙ্গলগ্রহে'),hint,article.t),'extra conditions cannot be dropped');
 assert(!articleCandidate(article.h,queryTerms(q),{from:'কোটে',to:'অন্যসম্পূর্ণবিষয়'},article.t),'arbitrary client hint rejected');
 assert(!articleCandidate(article.h,queryTerms('কোটে গাড়ি জায়েজ'),hint,article.t),'do not correct unrelated topics');
 let modelAnswer='NOT_ENOUGH_INFORMATION',prompt='';const old=global.fetch,origin='https://ebrahim-ead.github.io';
 global.fetch=async u=>{u=String(u);if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"পরীক্ষার তথ্য"]];');if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});const m=u.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(texts\/[a-f0-9]{3}\.json|hadith-search\/(?:meta|\d\d)\.json)$/);if(m)return new Response(fs.readFileSync(path.join(root,m[1])));throw Error('unexpected upstream '+u)};
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_,args)=>{prompt=args.messages[1]?.content||'';return {response:modelAnswer}}}};
 const ask=async(message,ids=Array.from(found.texts,x=>x.k),correction=hint)=>{const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,ids,history:[],pages:[],lookupComplete:true,allSources:true,scriptureSearch:true,siteSearchLimited:true,searchCorrection:correction})});return (await worker.fetch(req,env)).json()};
 try{
  let data=await ask(q);assert.equal(data.mode,'source_quote',JSON.stringify(data));assert.equal(data.grounded,false);assert.equal(data.sources[0].key,key);assert(data.answer.includes(article.t));assert(prompt.includes('Latest question: '+q),'original question is retained for model');
  const negative=await ask('কোটে বিবাহ কি জায়েজ মঙ্গলগ্রহে');assert.notEqual(negative.mode,'source_quote','additional conditions must never be ignored');
  data=await ask(q,Array.from(found.texts,x=>x.k),{from:'ভিন্ন',to:'কোর্ট'});assert.notEqual(data.mode,'source_quote','unrelated client hint cannot bypass validation');
  modelAnswer='প্রাসঙ্গিক উৎসের তথ্য [1]';data=await ask(q);assert.equal(data.grounded,true);assert(data.sources.length);
 }finally{global.fetch=old}
 console.log('court spelling: screenshot query, original context, source quote and negative safeguards pass');
})().catch(e=>{console.error(e);process.exitCode=1});
