#!/usr/bin/env node
'use strict';
// Explicit/manual live smoke: sends only fixed, public sample questions below.
// This consumes Workers AI inference; it does not train a model or change data.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const SITE='https://ebrahim-ead.github.io/DAWAH-X/',API='https://dawahx-assistant.www-mdrazu55555.workers.dev',ORIGIN='https://ebrahim-ead.github.io';
const read=async(url,options={})=>{const response=await fetch(url,{...options,signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(`HTTP ${response.status} at ${new URL(url).pathname}`);return response};
const request=async payload=>{const r=await read(API,{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify(payload)});return r.json()};
const annotation=(level,text)=>{if(process.env.GITHUB_ACTIONS==='true')console.log('::'+level+'::'+String(text).slice(0,500).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'))};
const report=(label,data)=>annotation('notice',label+' '+JSON.stringify({grounded:data.grounded,partial:data.partial,failures:Array.isArray(data.search_failures)?data.search_failures.filter(x=>/^(quran|hadith|site_search|site_pages|articles|direct_lookup)$/.test(x)):[],snapshot:data.snapshot_search,diagnostics:Array.isArray(data.source_diagnostics)?data.source_diagnostics:undefined,verification_failed:data.verification_failed,mode:data.mode,source_count:Array.isArray(data.sources)?data.sources.length:0}));
(async()=>{
 const [app,client]=await Promise.all(['app.js','assistant.js'].map(async file=>{
  const live=await (await read(SITE+file,{cache:'no-store'})).text();
  assert.equal(live,fs.readFileSync(file,'utf8'),`live ${file} does not match this revision; deployment may still be propagating`);return live;
 }));
 assert(client.includes('snapshot_search'),'live client must support snapshot disclosure');
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* সাইটে সংরক্ষিত প্রশ্নোত্তর খোঁজ:',start);assert(start>=0&&end>start,'live search implementation');
 const context={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async url=>read(new URL(String(url),SITE).href)};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',context);
 const failures=[];
 async function run(label,fn){try{await fn();console.log('PASS:',label);annotation('notice','PASS: '+label)}catch(error){failures.push(label+': '+error.message);console.error('FAIL:',label,error.message);annotation('error','FAIL: '+label+': '+error.message)}}
 // A fixed direct text lookup exercises source fetching without model inference.
 await run('direct Quran lookup',async()=>{
  const data=await request({message:'কুরআন ২:২৫৫',ids:[],pages:[],history:[],lookupComplete:true,allSources:true});
  console.log(JSON.stringify({question:'কুরআন ২:২৫৫',response:data}));report('direct Quran lookup',data);
  assert.equal(data.grounded,true,'direct source unavailable');assert(data.sources.some(x=>x.type==='quran'&&x.surah===2&&x.verse===255));
 });
 for(const q of ['কুরআন ও সুন্নাহর আলোকে তাওহীদের গুরুত্ব কী?', 'নামাজের সময় হাত কোথায় বাঁধবো বুকে নাকি নাভির নিচে', 'নামাজে পায়ের সাথে পা মিলানোর গুরুত্ব', 'hm'])await run(q,async()=>{
  const first=await request({message:q,ids:[],pages:[],history:[],lookupComplete:false,allSources:true});
  assert.equal(first.needs_sources,true,'worker must first request source search');assert.equal(first.all_sources,true,'worker must support all-source mode');
  const found=await context.suggest.find(q,{includeVideos:false,includeBodyMatches:true});
  if(!found)throw Error('Live site search failed for the sample question');
  const data=await request({message:q,ids:found.texts.slice(0,4).map(x=>x.k),pages:[],history:[],lookupComplete:true,scriptureSearch:true,siteSearchFailed:false,siteSearchLimited:found.limited===true,allSources:true});
  console.log(JSON.stringify({question:q,candidates:found.texts.slice(0,4).map(x=>x.title),response:data}));report(q,data);
  if(data.partial===true){assert(Array.isArray(data.search_failures)&&data.search_failures.length,'partial response must identify failures');console.warn('Some sources failed; inspect search_failures above.');}
  if(q==='hm')assert.equal(data.mode,'chat','acknowledgement should receive a chat response');
  else{assert.equal(data.grounded,true,'no usable cited answer was generated for this sample');assert(Array.isArray(data.sources)&&data.sources.length,'grounded response must cite at least one source')}
 });
 if(failures.length)throw Error(failures.join('; '));
 console.log('Live smoke completed. Generated claims still require independent review; searching is bounded.');
})().catch(error=>{console.error('Live smoke failed:',error.message);annotation('error','Live smoke failed: '+error.message);process.exitCode=1});
