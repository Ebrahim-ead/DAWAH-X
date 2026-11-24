'use strict';
// Actual generated index and articles; the remote scripture and AI are mocked.
// Candidate discovery is not a semantic or theological accuracy test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* ===== /মিলে-যাওয়া লেখা ও ভিডিও ===== */',start);assert(start>=0&&end>start);
 const browser={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async u=>new Response(fs.readFileSync(path.join(root,String(u))))};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.search=assistantSearch;globalThis.suggest=SUGGEST;',browser);browser.suggest.videos=async()=>null;
 const {default:worker,queryTerms,excerpt}=await import('../ai-worker/worker.mjs');const {articleCandidate,topics,score}=await import('../ai-worker/topic-search.mjs');
 const samples=[{q:'ওযু কিভাবে করবো',key:'15f0cb4cfc4bee'},{q:'যাকাত কাকে দেব',key:'0fdc4a2fc82cd4'},{q:'হজ কী',key:'0719c8e94d8692'}];
 for(const s of samples){const result=await browser.search(s.q);assert(result.texts.some(x=>x.k===s.key),'real candidate must be found: '+s.q);s.ids=result.texts.map(x=>x.k);const article=JSON.parse(fs.readFileSync(path.join(root,'texts',s.key.slice(-3)+'.json')))[s.key];s.title=article.t;assert(articleCandidate(excerpt(article.h,s.q),queryTerms(s.q),null,article.t),'candidate should reach model: '+s.q)}
 assert.equal((await browser.search('ওযু কিভাবে করবো কোয়ান্টামফটোনিক্স')).texts.length,0,'unknown condition is not discarded');
 const giving=topics(queryTerms('যাকাত কাকে দেব')),taking=topics(queryTerms('যাকাত কাকে নেব'));assert(giving.some(g=>g.includes('দিতে')),'giving remains required');assert(taking.some(g=>g.includes('নেব')),'receiving is not converted to giving');
 assert(score('জাকাত প্রদান',giving)>score('জাকাত প্রদান',taking),'different actions remain distinct');
 const article=JSON.parse(fs.readFileSync(path.join(root,'texts/cd4.json')))['0fdc4a2fc82cd4'];assert(!articleCandidate(article.h,queryTerms('যাকাত কাকে দেব মঙ্গলগ্রহে'),null,article.t));assert(!articleCandidate(article.h,queryTerms('যাকাত কাকে দেব ৭ জন'),null,article.t));
 const old=global.fetch,origin='https://ebrahim-ead.github.io';let model='valid',prompt='',calls=0;
 global.fetch=async u=>{u=String(u);if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"অন্য পরীক্ষা"]];');if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});const m=u.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(texts\/[a-f0-9]{3}\.json|hadith-search\/(?:meta|\d\d)\.json)$/);if(m)return new Response(fs.readFileSync(path.join(root,m[1])));throw Error('unexpected upstream '+u)};
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(name,args)=>{calls++;if(model==='chat')return {response:name==='@cf/openai/gpt-oss-20b'?'CHAT':'হ্যালো, বলুন।'};prompt=args.messages[1].content;return {response:model==='abstain'?'NOT_ENOUGH_INFORMATION':model==='invalid'?'অযাচাইকৃত দাবি [99]':'সাইটের নির্বাচিত তথ্য [1]'}}}};
 async function ask(s,ids=s.ids){const request=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:s.q,ids,pages:[],history:[],lookupComplete:true,allSources:true,scriptureSearch:true,siteSearchLimited:true})});return (await worker.fetch(request,env)).json()}
 try{
  for(const s of samples){const data=await ask(s);assert.equal(data.grounded,true,JSON.stringify(data));assert(prompt.includes(s.title));assert(prompt.includes('Latest question: '+s.q),'original question is retained');}
  model='abstain';let data=await ask(samples[0]);assert.equal(data.grounded,false);assert.equal(data.sources.length,0);assert(data.candidates.some(x=>x.key===samples[0].key));assert(!JSON.stringify(data.candidates).includes('ওযূ যারা করছি'),'unverified candidate links do not include article excerpts');
  model='invalid';data=await ask(samples[0]);assert.equal(data.grounded,false);assert.equal(data.verification_failed,true);assert.equal(data.sources.length,0);assert(data.candidates.length);assert(!data.answer.includes('অযাচাইকৃত দাবি'));
  model='chat';const before=calls;data=await ask({q:'ওযু কিভাবে করবো কোয়ান্টামফটোনিক্স',ids:[samples[0].key]});assert.equal(data.grounded,false);assert.notEqual(data.mode,'chat');assert(!data.candidates?.length);assert.equal(calls,before,'unmatched conditions cannot be ignored or routed to unsourced chat');
  data=await ask({q:'হজ কোয়ান্টামফটোনিক্স',ids:[]});assert.notEqual(data.mode,'chat');assert.equal(calls,before,'short religious spelling is guarded');
  data=await ask({q:'সহজ গল্প বলুন',ids:[]});assert.equal(data.mode,'chat','হজ must not match inside সহজ');
 }finally{global.fetch=old}
 console.log('assistant retrieval: short exact topics, giving forms and labelled abstention candidates pass');
})().catch(e=>{console.error(e);process.exitCode=1});
