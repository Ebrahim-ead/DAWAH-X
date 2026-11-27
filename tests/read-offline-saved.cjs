'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const app=fs.readFileSync('app.js','utf8'),start=app.indexOf('const readTools=$("read-tools")'),end=app.indexOf('/* ===== সাইট জুড়ে সার্চ',start);assert(start>=0&&end>start);
 function el(){return {style:{setProperty(){},getPropertyValue(){return '1'}},dataset:{},textContent:'',events:{},attrs:{},addEventListener(t,f){this.events[t]=f},setAttribute(n,v){this.attrs[n]=v}}}
 const nodes=Object.fromEntries(['read-tools','read','read-body','read-title','read-cat','read-save','read-save-label','read-saved-count'].map(id=>[id,el()]));nodes['read-title'].textContent='একটি লেখা';nodes['read-body'].dataset.loaded='true';
 const values={},localStorage={getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v},store=new Map();
 const cache={match:async k=>store.get(typeof k==='string'?k:k.url)?.clone(),put:async(k,v)=>store.set(typeof k==='string'?k:k.url,v.clone()),delete:async k=>store.delete(typeof k==='string'?k:k.url),keys:async()=>[...store.keys()].map(url=>({url}))};
 const key1='00000000000abc',key2='11111111111abc',other='22222222222abc',location={search:'?k='+key1,href:'https://example.test/DAWAH-X/read.html?k='+key1};
 const context={$:id=>nodes[id]||null,URL,URLSearchParams,Response,Promise,location,localStorage,formatCount:x=>String(x),textBucket:k=>k.slice(-3),window:{caches:{open:async()=>cache}},fetch:async()=>Response.json({[key1]:{t:'first'},[key2]:{t:'second'},[other]:{t:'not saved'}})};
 vm.runInNewContext(app.slice(start,end),context);
 const flush=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r))};
 nodes['read-save'].events.click();await flush();let stored=await store.values().next().value.clone().json();assert.deepEqual(Object.keys(stored),[key1], 'only explicitly saved article is pinned, not the full shard');
 location.search='?k='+key2;nodes['read-save'].events.click();await flush();stored=await store.values().next().value.clone().json();assert.deepEqual(Object.keys(stored).sort(),[key1,key2].sort(),'multiple bookmarks in same shard coexist');
 location.search='?k='+key1;nodes['read-save'].events.click();await flush();stored=await store.values().next().value.clone().json();assert.deepEqual(Object.keys(stored),[key2],'removing one does not delete the other');
 location.search='?k='+key2;nodes['read-save'].events.click();await flush();assert.equal(store.size,0,'last removal frees cached data');
 console.log('reader offline pin: per-record storage, same-shard coexistence and removal pass');
})().catch(e=>{console.error(e);process.exitCode=1});
