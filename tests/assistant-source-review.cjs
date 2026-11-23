'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {inspect,format,GROUPS}=require('../tools/check-assistant-sources.cjs');
const old='a'.repeat(40),head='b'.repeat(40),v1='1'.repeat(40),v2='2'.repeat(40);
const row=(name,sha=v1,type='file')=>({name,sha,type});
function mock(options={}){return async url=>{
 if(url.endsWith('/commits/main'))return {sha:head};
 const isHead=url.endsWith(head);
 if(url.includes('/hadith/data?'))return isHead&&options.changed?[row('index.json',v2),row('bukhari',v1,'dir'),row('new-book',v1,'dir')]:[row('index.json'),row('bukhari',v1,'dir'),row('_trigger',isHead?v2:v1,'dir')];
 if(url.includes('/quran/data?'))return [row('index.json'),row('suras',isHead&&options.quran?v2:v1,'dir')];
 if(url.includes('/search-ayahs.js?'))return row('search-ayahs.js',isHead&&options.search?v2:v1);
 throw Error('unexpected request');
}}
(async()=>{
 let r=await inspect(mock(),old);assert.equal(r.head,head);assert.equal(r.results.length,3);assert(r.results.every(x=>x.changed.length===0));assert.match(format(r),/not.*deployed Pages/i);
 r=await inspect(mock({changed:true,quran:true,search:true}),old);assert.deepEqual(r.results[0].changed,['index.json','new-book']);assert.deepEqual(r.results[1].changed,['suras']);assert.deepEqual(r.results[2].changed,['search-ayahs.js']);assert.match(format(r),/No changes are applied automatically/);
 await assert.rejects(()=>inspect(mock(),'main'),/baseline/);
 await assert.rejects(()=>inspect(async()=>{throw Error('network')},old),/network/);
 await assert.rejects(()=>inspect(async url=>url.endsWith('/commits/main')?{sha:head}:[row('evil\nrow')],old),/Invalid/);
 await assert.rejects(()=>inspect(async url=>url.endsWith('/commits/main')?{sha:head}:[row('x'),row('x')],old),/Invalid/);
 assert.equal(GROUPS.length,3);
 // The actual CLI must fail closed and still leave a reviewable report on outage.
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dawah-review-'));
 try{
  const gh=path.join(tmp,'gh');fs.writeFileSync(gh,'#!/bin/sh\nexit 1\n',{mode:0o755});
  const report=path.join(tmp,'report.md');const p=spawnSync(process.execPath,[path.resolve(__dirname,'../tools/check-assistant-sources.cjs'),report],{encoding:'utf8',env:{...process.env,PATH:tmp+path.delimiter+process.env.PATH}});
  assert.equal(p.status,1);assert.match(fs.readFileSync(report,'utf8'),/Status: \*\*ERROR\*\*/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
 console.log('assistant source review: unchanged, drift, malformed responses and outage reports pass');
})().catch(e=>{console.error(e);process.exitCode=1});
