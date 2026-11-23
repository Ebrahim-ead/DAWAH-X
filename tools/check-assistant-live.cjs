#!/usr/bin/env node
'use strict';
// Explicit/manual live smoke: sends only the fixed public sample questions below.
// This consumes Workers AI inference; it does not train a model or change data.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const SITE='https://ebrahim-ead.github.io/DAWAH-X/',API='https://dawahx-assistant.www-mdrazu55555.workers.dev',ORIGIN='https://ebrahim-ead.github.io';
const read=async(url,options={})=>{const response=await fetch(url,{...options,signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(`HTTP ${response.status} at ${new URL(url).pathname}`);return response};
const request=async payload=>{const r=await read(API,{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify(payload)});return r.json()};
(async()=>{
 const app=await (await read(SITE+'app.js',{cache:'no-store'})).text();
 const expected=fs.readFileSync('app.js','utf8');assert.equal(app,expected,'live app.js does not match this revision; deployment may still be propagating');
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* সাইটে সংরক্ষিত প্রশ্নোত্তর খোঁজ:',start);assert(start>=0&&end>start,'live search implementation');
 const context={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async url=>read(new URL(String(url),SITE).href)};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',context);
 for(const q of ['কুরআন ও সুন্নাহর আলোকে তাওহীদের গুরুত্ব কী?', 'নামাজে হাত কোথায় বাঁধবো বুকে নাকি নাভির নিচে', 'hm']){
  const first=await request({message:q,ids:[],pages:[],history:[],lookupComplete:false,allSources:true});
  assert.equal(first.needs_sources,true,'worker must first request source search');assert.equal(first.all_sources,true,'worker must support all-source mode');
  const found=await context.suggest.find(q,{includeVideos:false,includeBodyMatches:true});
  if(!found)throw Error('Live site search failed for the sample question');
  const data=await request({message:q,ids:found.texts.slice(0,4).map(x=>x.k),pages:[],history:[],lookupComplete:true,scriptureSearch:true,siteSearchFailed:false,siteSearchLimited:found.limited===true,allSources:true});
  console.log(JSON.stringify({question:q,candidates:found.texts.slice(0,4).map(x=>x.title),response:data}));
  assert.notEqual(data.partial,true,'a source failed; inspect search_failures above');
  if(q==='hm')assert.equal(data.mode,'chat','acknowledgement should receive a chat response');
  else{assert.equal(data.grounded,true,'no usable cited answer was generated for this sample');assert(Array.isArray(data.sources)&&data.sources.length,'grounded response must cite at least one source')}
 }
 console.log('Live smoke completed. Generated claims still require independent review; searching is bounded.');
})().catch(error=>{console.error('Live smoke failed:',error.message);process.exitCode=1});
