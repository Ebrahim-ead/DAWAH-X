'use strict';
// Real article shards and browser candidate search, with mocked upstream Quran,
// hadith metadata and model, exercise the complete worker evidence path.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const {default:worker,queryTerms}=await import('../ai-worker/worker.mjs');
 const {topics,score,articleCandidate}=await import('../ai-worker/topic-search.mjs');
 const q='নামাজে পায়ের সাথে পা মিলানোর গুরুত্ব', article=JSON.parse(fs.readFileSync(path.join(root,'texts/6ae.json')))['185d853e2426ae'];
 const terms=topics(queryTerms(q));
 assert.equal(terms.length,3,'repeated foot forms are one concept');
 assert(articleCandidate(article.h,queryTerms(q)),'the real source must survive the article filter');
 for(const phrase of ['ছালাতে পায়ে পা মিলানো','নামাজে পায়ের সাথে পা মিলিয়ে দাঁড়ানো','ছালাতে পা মিলানোর নিয়ম'])
  assert.equal(score(phrase,terms),3,phrase);
 for(const phrase of ['নামাজে পানি মিলানো','নামাজে পাপ মিলানো','নামাজে পায়েস মিলানো','নামাজে পাড় মিলানো'])
  assert.equal(articleCandidate(phrase,queryTerms(q)),false,'unrelated word must not match পা: '+phrase);
 assert.equal(articleCandidate('ছালাতে পায়ে পানি। '+('অন্য ঘটনা '.repeat(55))+'পরে নামাজ মিলানো',queryTerms(q)),false,'distant words must not suffice');
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* সাইটে সংরক্ষিত প্রশ্নোত্তর খোঁজ:',start);assert(start>=0&&end>start);
 const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async u=>new Response(fs.readFileSync(path.join(root,String(u))))};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',sandbox);
 const found=await sandbox.suggest.find(q,{includeVideos:false,includeBodyMatches:true});
 const ids=Array.from(found.texts.slice(0,4),x=>x.k);assert(ids.includes('185d853e2426ae'),'actual browser search includes the relevant article');
 const old=global.fetch;let prompt='',calls=0;
 global.fetch=async u=>{u=String(u);if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"পরীক্ষার তথ্য"]];');if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});const match=u.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(texts\/[a-f0-9]{3}\.json|hadith-search\/(?:meta|\d\d)\.json)$/);if(match)return new Response(fs.readFileSync(path.join(root,match[1])));throw Error('Unexpected upstream '+u)};
 const origin='https://ebrahim-ead.github.io',env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_,args)=>{calls++;prompt=args.messages[1].content;return {response:'উৎসে কাতার সোজা করা ও ফাঁক বন্ধ করার কথা বলা হয়েছে। [1]'}}}};
 const ask=async(message,keys)=>{const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,ids:keys,pages:[],history:[],lookupComplete:true,allSources:true,scriptureSearch:true})});return (await worker.fetch(req,env)).json()};
 try{
  let data=await ask(q,ids);assert.equal(data.grounded,true);assert(data.sources.some(s=>s.key==='185d853e2426ae'));assert.match(prompt,/পায়ে পা মিলানো একটি গুরুত্বপূর্ণ সুন্নাত/);assert.match(prompt,/কাতার সোজা করা ও ফাঁক বন্ধ করা/);
  // An unrelated source should not reach the model merely because a short word appears inside it.
  const before=calls;data=await ask('নামাজে পা মিলানোর গুরুত্ব',['11df79032aec67']);assert.equal(data.grounded,false);assert.equal(calls,before);
 }finally{global.fetch=old}
 console.log('Bengali foot inflections: real browser candidates, worker evidence and unrelated-word negatives pass');
})().catch(e=>{console.error(e);process.exitCode=1});
