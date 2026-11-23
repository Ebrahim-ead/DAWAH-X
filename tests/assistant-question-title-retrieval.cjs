'use strict';
// Real browser indexes and real Q&A article. Scripture sources and model are
// mocked: this checks retrieval and prompt context, not theological accuracy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const {default:worker,queryTerms}=await import('../ai-worker/worker.mjs');
 const {articleCandidate,topics}=await import('../ai-worker/topic-search.mjs');
 const q='যাকাত কাদেরকে দেওয়া যাবে',key='0fdc4a2fc82cd4';
 const article=JSON.parse(fs.readFileSync(path.join(root,'texts',key.slice(-3)+'.json')))[key];
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* সাইটে সংরক্ষিত প্রশ্নোত্তর খোঁজ:',start);assert(start>=0&&end>start);
 const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async u=>new Response(fs.readFileSync(path.join(root,String(u))))};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',sandbox);
 const found=await sandbox.suggest.find(q,{includeVideos:false,includeBodyMatches:true});assert(found.texts.slice(0,6).some(x=>x.k===key));
 const terms=queryTerms(q);assert.equal(topics(terms).length,2);assert(!articleCandidate(article.h,terms),'answer alone lacks the subject');
 assert(articleCandidate(article.h,terms,null,article.t),'real question title and related answer must reach model together');
 assert(!articleCandidate('সম্পূর্ণ ভিন্ন একটি উত্তর।',terms,null,article.t),'title alone is insufficient');
 assert(!articleCandidate(article.h,queryTerms('যাকাত কাদেরকে ৫ টাকা দেওয়া যাবে'),null,article.t),'explicit amount must not be dropped');
 assert(!articleCandidate(article.h,queryTerms('যাকাত কার কাছ থেকে নেওয়া যাবে'),null,article.t),'giving and receiving are distinct');
 assert(!articleCandidate(article.h,queryTerms('যাকাত কাদেরকে দেওয়া যাবে মঙ্গলগ্রহে'),null,article.t),'unknown condition remains mandatory');
 assert(!articleCandidate('সম্পূর্ণ ভিন্ন একটি উত্তর।',queryTerms('যাকাত কী'),null,article.t),'a single subject must still occur in the answer');
 const old=global.fetch,origin='https://ebrahim-ead.github.io';let prompt='',system='',calls=0;
 global.fetch=async u=>{u=String(u);if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"পরীক্ষার তথ্য"]];');if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});const m=u.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(texts\/[a-f0-9]{3}\.json|hadith-search\/(?:meta|\d\d)\.json)$/);if(m)return new Response(fs.readFileSync(path.join(root,m[1])));throw Error('Unexpected upstream '+u)};
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_,args)=>{calls++;system=args.messages[0].content;prompt=args.messages[1].content;return {response:'উৎসে অভাবী নিকটাত্মীয় সম্পর্কে বলা হয়েছে। [1] সব প্রাপকের পূর্ণ তালিকা এই উৎসে নেই।'}}}};
 const ask=async message=>{const r=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,ids:[key],pages:[],history:[],lookupComplete:true,allSources:true,scriptureSearch:true,siteSearchLimited:true})});return (await worker.fetch(r,env)).json()};
 try{
  let data=await ask(q);assert.equal(data.grounded,true,JSON.stringify(data));assert.equal(data.sources[0].key,key);assert.match(prompt,/নিকটাত্মীয়দের মধ্যে/);assert.match(prompt,/অভাবী হন/);assert(prompt.includes('Latest question: '+q));assert.match(system,/titles may be questions/);assert.match(system,/Do not generalize/);
  const before=calls;data=await ask('যাকাত কাদেরকে ৫ টাকা দেওয়া যাবে');assert.equal(data.grounded,false);assert.equal(calls,before,'unmet constraint must not reach model as evidence');
  env.AI.run=async()=>{throw Error('private provider details')};data=await ask(q);assert.equal(data.error_code,'model_unavailable');assert(!JSON.stringify(data).includes('private provider details'),'provider errors must not expose sensitive details');
 }finally{global.fetch=old}
 console.log('question-title retrieval: real Q&A candidate and safeguards pass');
})().catch(e=>{console.error(e);process.exitCode=1});
