'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
(async()=>{const listeners={},calls=[],stored=[];let active=0,max=0,skipped=false;
 const ctx={self:{addEventListener:(type,cb)=>listeners[type]=cb,skipWaiting:()=>{skipped=true},registration:{scope:'https://example.test/'}},
 caches:{open:async()=>({put:async(u)=>stored.push(u)})},Request:class{constructor(url){this.url=url}},fetch:async req=>{active++;max=Math.max(max,active);calls.push(req.url);await new Promise(r=>setTimeout(r,2));active--;if(req.url==='about.html')throw Error('offline');return{ok:true}},setTimeout,Promise,Set,URL};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),ctx);let work;listeners.install({waitUntil(p){work=p}});await work;
 assert(max<=3&&max>1,'precache concurrency must be bounded');assert(calls.length>20);assert(calls.includes('about.html'));for(let s=108;s<=114;s++)assert(calls.includes('scripture-bn-'+s+'.js'),'short surah translation precached');assert(!stored.includes('about.html'));assert.equal(stored.length,calls.length-1);assert(skipped,'failed optional fetch must not prevent activation');console.log('service worker: bounded precache concurrency and failure recovery pass');
})().catch(e=>{console.error(e);process.exitCode=1});
