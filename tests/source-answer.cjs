'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* সাইটে সংরক্ষিত প্রশ্নোত্তর খোঁজ:',start);assert(start>=0&&end>start);
const loaded=[];const sandbox={atob,console,Float32Array,Uint8Array,Promise,Set,Map,fetch:async url=>{
 loaded.push(url);const file=path.resolve(root,url);assert(file.startsWith(root+path.sep));const text=fs.readFileSync(file,'utf8');return {ok:true,json:async()=>JSON.parse(text),text:async()=>text};}};
vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',sandbox);
(async()=>{
 const exact=await sandbox.suggest.find('লুক্বমান (আলাইহিস সালাম) কি নবী ছিলেন, না-কি ছালিহ ব্যক্তিদের অন্তর্ভুক্ত ছিলেন?',{includeVideos:false});assert(exact.texts.some(x=>x.k==='0007877b4d24f5'));
 for(const q of ['পাইথন প্রোগ্রামিং কি হালাল?','মঙ্গলে নামাজ পড়া যাবে কি?']){const matches=await sandbox.suggest.find(q,{includeVideos:false});assert.equal(matches.texts.length,0,`irrelevant answers for ${q}`)}
 const related=await sandbox.suggest.find('রোজা রেখে ইনজেকশন নিলে কি রোজা ভেঙে যায়?',{includeVideos:false});assert(related.texts.some(x=>x.k==='1ca1e6d1dec45f'));
 assert(!loaded.some(p=>/youtube/.test(p)),'text-only retrieval must not load videos');
 const html=fs.readFileSync(path.join(root,'ask.html'),'utf8');assert(html.includes('নতুন এআই উত্তর তৈরি করে না'));assert(html.includes('id="source-answer-form"'));assert(html.includes('id="askbtn"'));
 console.log('source answer: exact source, related results, irrelevant-query abstention and text-only retrieval pass');
})().catch(e=>{console.error(e);process.exitCode=1});
