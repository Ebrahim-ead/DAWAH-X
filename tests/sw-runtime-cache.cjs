'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const base='https://example.test/DAWAH-X/',listeners={},stores=new Map();let online=true;
 const key=req=>new URL(typeof req==='string'?req:req.url,base).href;
 const caches={open:async name=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {
  put:async(req,res)=>store.set(key(req),res),keys:async()=>[...store.keys()],delete:async req=>store.delete(key(req)),
  match:async(req,options={})=>{const url=key(req);if(store.has(url))return store.get(url);if(options.ignoreSearch){const wanted=new URL(url);wanted.search='';for(const [k,v] of store){const entry=new URL(k);entry.search='';if(entry.href===wanted.href)return v}}}
 }},match:async req=>{for(const name of stores.keys()){const found=await (await caches.open(name)).match(req);if(found)return found}}};
 const response=text=>({ok:true,type:'basic',text:async()=>text,clone(){return response(text)}});
 const ctx={self:{addEventListener:(type,cb)=>listeners[type]=cb,registration:{scope:base},location:{origin:'https://example.test'}},caches,fetch:async()=>{if(!online)throw Error('offline');return response('new')},URL,Response,Request,Promise,Set};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),ctx);
 const shell=await caches.open('dawahx-shell-v45');await shell.put('app.js',response('old'));await shell.put('read.html',response('read shell'));await shell.put('index.html',response('home shell'));
 async function run(url,extra={}){let result;const waits=[];listeners.fetch({request:{url:new URL(url,base).href,method:'GET',mode:'same-origin',headers:new Headers(),...extra},respondWith:p=>{result=p},waitUntil:p=>waits.push(p)});if(!result)return null;const out=await result;await Promise.all(waits);return out}
 assert.equal(await (await run('app.js')).text(),'new');online=false;assert.equal(await (await run('app.js')).text(),'new','offline must prefer the latest runtime version to the older shell');
 assert.equal(await (await run('read.html?k=abc',{mode:'navigate'})).text(),'read shell');assert.equal(await (await run('./',{mode:'navigate'})).text(),'home shell');
 const noCache=await run('missing.html',{mode:'navigate'});assert.equal(noCache.status,503);
 assert.equal(await run('https://elsewhere.test/fonts/fake.woff2'),null,'do not intercept third-party font paths');
 assert.equal(await run('app.js',{headers:new Headers({Range:'bytes=0-1'})}),null,'range requests bypass caching');
 assert.equal(await run('fonts/a.woff2',{headers:new Headers({Range:'bytes=0-1'})}),null,'font ranges must also bypass the cache');
 const origOpen=caches.open;caches.open=async()=>{throw Error('cache denied')};assert.equal((await run('new.html',{mode:'navigate'})).status,503,'cache storage errors should still show the offline page');online=true;assert.equal(await (await run('fonts/a.woff2')).text(),'new','a cache error must not prevent online font loading');caches.open=origOpen;
 console.log('service worker: runtime cache precedence, navigation fallback and origin isolation pass');
})().catch(e=>{console.error(e);process.exitCode=1});
