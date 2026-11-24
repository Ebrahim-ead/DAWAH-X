'use strict';
// Real search index and article; the model is mocked to abstain. This checks
// attributed source display, not whether the ruling is theologically correct.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* ===== /মিলে-যাওয়া লেখা ও ভিডিও ===== */',start);assert(start>=0&&end>start);
 const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async u=>new Response(fs.readFileSync(path.join(root,String(u))))};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',sandbox);
 const {default:worker}=await import('../ai-worker/worker.mjs'),old=global.fetch,origin='https://ebrahim-ead.github.io';
 const key='08d0113908f2a6',article=JSON.parse(fs.readFileSync(path.join(root,'texts',key.slice(-3)+'.json')))[key];
 const found=await sandbox.suggest.find('কোর্টে বিবাহ কি জায়েজ',{includeVideos:false,includeBodyMatches:true});assert(found.texts.slice(0,6).some(x=>x.k===key));
 global.fetch=async u=>{u=String(u);if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"পরীক্ষার তথ্য"]];');if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});const m=u.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(texts\/[a-f0-9]{3}\.json|hadith-search\/(?:meta|\d\d)\.json)$/);if(m)return new Response(fs.readFileSync(path.join(root,m[1])));throw Error('unexpected upstream '+u)};
 let response='NOT_ENOUGH_INFORMATION';const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async()=>({response})}};
 const ask=async(message,ids=[key],history=[],allSources=false)=>{const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,ids,history,lookupComplete:true,allSources,scriptureSearch:allSources,siteSearchLimited:allSources})});return (await worker.fetch(req,env)).json()};
 try{
  for(const q of ['কোর্টে বিবাহ কি জায়েজ','কোর্ট বিবাহ কি জায়েজ']){
   const data=await ask(q);assert.equal(data.mode,'source_quote',JSON.stringify(data));assert.equal(data.grounded,false);assert.equal(data.sources[0].key,key);assert(data.answer.includes(article.t));assert.match(data.answer,/এআই নিশ্চিত উত্তর দিতে পারেনি/);assert.match(data.answer,/কোর্ট ম্যারেজ শরী/);assert.match(data.answer,/শর্ত হল/);assert(!data.answer.includes('প্রশ্নকারী :'));
  }
  const full=await ask('কোর্টে বিবাহ কি জায়েজ',found.texts.slice(0,6).map(x=>x.k),[],true);assert.equal(full.mode,'source_quote',JSON.stringify(full));assert.equal(full.sources[0].key,key);assert.equal(full.grounded,false);
  for(const q of ['কোর্টে বিবাহ কি জায়েজ নয়','কোর্টে বিবাহ কি জায়েজ অভিভাবক ছাড়া','কোর্টে বিবাহ কি জায়েজ ৫ জন সাক্ষী','কোর্টে তালাক কি জায়েজ','কোর্টে বিবাহ কি জায়েজ মঙ্গলগ্রহে']){
   const data=await ask(q);assert.notEqual(data.mode,'source_quote',q);assert.equal(data.grounded,false,q);
  }
  let data=await ask('এর বিষয়ে বলুন',[key],[{role:'user',content:'কোর্টে বিবাহ কি জায়েজ'}]);assert.notEqual(data.mode,'source_quote','no follow-up shortcut');
  response='উৎসভিত্তিক ব্যাখ্যা [1]';data=await ask('কোর্টে বিবাহ কি জায়েজ');assert.equal(data.grounded,true);assert.equal(data.answer,response,'successful AI answers stay unchanged');
  const client=fs.readFileSync(path.join(root,'assistant.js'),'utf8');assert(client.includes("data.mode==='source_quote'?'source_quote'"));assert(client.includes("citations(data.sources,data.mode==='source_quote')"));
  console.log('assistant source quote: real court-marriage title, attributed complete excerpt, abstention and condition safeguards pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
