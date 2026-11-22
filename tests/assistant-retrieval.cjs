'use strict';
// Exercise the real, generated site index without loading the large video catalogue.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* সাইটে সংরক্ষিত প্রশ্নোত্তর খোঁজ:',start);assert(start>=0&&end>start);
const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async url=>{const file=path.resolve(root,url);assert(file.startsWith(root+path.sep));const text=fs.readFileSync(file,'utf8');return {ok:true,json:async()=>JSON.parse(text),text:async()=>text}}};
vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',sandbox);
(async()=>{
 const q='স্বাস্থ্য রক্তচাপ কোলেস্টেরল';
 const titles=await sandbox.suggest.find(q,{includeVideos:false});
 const full=await sandbox.suggest.find(q,{includeVideos:false,includeBodyMatches:true});
 assert(full.texts.length>titles.texts.length,'body matching should find additional articles');
 assert(full.texts.some(x=>x.title.includes('মাহে রামাযান')),'real body-only match should be discoverable');
 const found=await sandbox.suggest.find('পাইথন প্রোগ্রামিং কি হালাল?',{includeVideos:false,includeBodyMatches:true});assert.equal(found.texts.length,0);
 console.log('assistant retrieval: real body-only matches and unavailable-topic handling pass');
})().catch(e=>{console.error(e);process.exitCode=1});
