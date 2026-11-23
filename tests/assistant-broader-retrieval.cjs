'use strict';
// Retrieval is bounded and lexical; these tests do not prove semantic accuracy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* ===== /মিলে-যাওয়া লেখা ও ভিডিও ===== */',start);assert(start>=0&&end>start);
function browser(fetch){const context={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch};vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;globalThis.deep=DEEP;',context);return context}
(async()=>{
 const actual=browser(async url=>new Response(fs.readFileSync(path.join(root,String(url)))));
 for(const q of ['তাওহীদ','রোজা','জাকাত','সুন্নাত','মৃত্যু']){
  const found=await actual.suggest.find(q,{includeVideos:false,includeBodyMatches:true});assert(found?.texts.length,q+' must find title candidates');assert.equal(found.limited,true);
 }
 const general=await actual.suggest.find('পর্দার গুরুত্ব কী?',{includeVideos:false,includeBodyMatches:true});
 assert(general.texts.slice(0,3).every(x=>/পর্দা/u.test(x.title)),'specific subject titles should precede generic body matches');
 const health=await actual.suggest.find('স্বাস্থ্য রক্তচাপ কোলেস্টেরল',{includeVideos:false,includeBodyMatches:true});
 assert(health.texts.filter(x=>x.side==='f').length>3,'unused source slots are filled by the other category');assert(health.texts.length<=6);
 const ordinary=await actual.suggest.find('তাওহীদ',{includeVideos:false});assert.equal(ordinary.texts.length,0,'normal suggestions keep their previous strict gate');
 const unknown=await actual.suggest.find('রোজা কোয়ান্টামফটোনিক্স',{includeVideos:false,includeBodyMatches:true});assert.equal(unknown.texts.length,0,'unknown condition is not silently dropped');
 // Deterministic 60 tied body-only candidates: first real proximity match is
 // after the old cutoff. A bounded scan should find six without >6 concurrent reads.
 const fake=browser(()=>{throw Error('unexpected network')});const keys=Array.from({length:60},(_,i)=>(i+1).toString(16).padStart(14,'0'));
 fake.deep.meta={n:60,shards:512};fake.deep.stop=new Set();fake.deep.keys=keys.join('');
 fake.suggest.init=async()=>{fake.suggest.tm={len:'B'.repeat(60),shards:64};fake.suggest.side=()=> 'q';return true};
 const posting=Buffer.from(Array(60).fill(1)).toString('base64');fake.deep.shard=async()=>({alpha:posting,beta:posting});fake.suggest.tshard=async()=>({});
 let active=0,max=0,checks=[];fake.suggest.bodyNear=async key=>{active++;max=Math.max(max,active);checks.push(key);await Promise.resolve();active--;return keys.indexOf(key)>=22};
 fake.suggest.rel=async key=>['title '+keys.indexOf(key),''];
 let found=await fake.suggest.find('alpha beta',{includeVideos:false,includeBodyMatches:true});assert(found);assert.equal(found.texts.length,6);assert(found.texts.some(x=>x.k===keys[22]),'match beyond first 20 is considered');assert.equal(checks.length,48,'work remains bounded');assert(max<=6);
 fake.suggest.bodyNear=async()=>{throw Error('offline')};found=await fake.suggest.find('alpha beta',{includeVideos:false,includeBodyMatches:true});assert.equal(found,null,'candidate fetch failure is not mistaken for no matches');
 const {excerpt,default:worker}=await import('../ai-worker/worker.mjs');
 const html='<p>ভূমিকা</p><p>পর্দা '+('ক'.repeat(450))+' নারী আগের বিচ্ছিন্ন আলোচনা</p>'+Array(8).fill('<p>'+('প্রসঙ্গ '.repeat(180))+'</p>').join('')+'<p>পর্দা নারী প্রাসঙ্গিক নিকটবর্তী বক্তব্য</p>';
 const selected=excerpt(html,'পর্দা নারী');assert(selected.includes('প্রাসঙ্গিক নিকটবর্তী বক্তব্য'),'prefer nearby matching topics in long article');assert(selected.length<=5500);
 const old=global.fetch,origin='https://ebrahim-ead.github.io',key='00000000000001';let prompt='',router=0;
 global.fetch=async url=>{url=String(url);if(url.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"অন্য বিষয়"]];');if(url.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});if(url.endsWith('/hadith-search/meta.json'))return Response.json({version:1,shards:32,books:['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat'],docs:[[0,1,1]]});if(/\/hadith-search\/\d\d\.json$/.test(url))return Response.json({});if(url.endsWith('/texts/001.json'))return Response.json({[key]:{t:'পর্দার গুরুত্ব',h:'<p>পর্দা সম্পর্কে উৎসের বক্তব্য।</p>'}});throw Error('unexpected '+url)};
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(model,args)=>{if(model==='@cf/openai/gpt-oss-20b'){router++;return {response:'CHAT'}}prompt=args.messages[1].content;return {response:'উৎসে পর্দার কথা আছে। [1]'}}}};
 try{const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'পর্দার গুরুত্ব কী?',ids:[key],pages:[],history:[],lookupComplete:true,allSources:true})});const data=await (await worker.fetch(req,env)).json();assert.equal(data.grounded,true);assert.equal(data.sources[0].key,key);assert(prompt.includes('পর্দা সম্পর্কে উৎসের বক্তব্য'));assert.equal(router,0,'implicit topic with evidence must not be routed away to unsourced chat');}finally{global.fetch=old}
 console.log('assistant broader retrieval: single topics, six slots, bounded body scan, long excerpts and evidence-first routing pass');
})().catch(e=>{console.error(e);process.exitCode=1});
