'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 let now=Date.parse('2026-11-23T12:00:00Z');const pending=[],timers=[],events={};
 const slot={hidden:true,innerHTML:'',replaceChildren(){this.innerHTML=''}};
 const document={currentScript:{src:'https://example.test/DAWAH-X/live.js'},hidden:false,body:{classList:{contains:()=>false}},getElementById:id=>id==='live-slot'?slot:null,addEventListener:(name,fn)=>events[name]=fn};
 class Clock extends Date{static now(){return now}}
 const fetch=()=>new Promise((resolve,reject)=>pending.push({resolve,reject}));
 vm.runInNewContext(fs.readFileSync('live.js','utf8'),{document,location:{href:'https://example.test/DAWAH-X/'},Date:Clock,URL,fetch,isFinite,setInterval:(fn,ms)=>timers.push({fn,ms})});
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const response=data=>({ok:true,json:async()=>data});
 const item=(id,title)=>({id,title,channel:'পরীক্ষা'});
 // Overlapping fetches can resolve in any order; stale responses must not replace newer results.
 events.visibilitychange();assert.equal(pending.length,2);
 pending[1].resolve(response({updated:new Date(now).toISOString(),live:[item('abcdefghijk','নতুন <title>')]}));await flush();assert.equal(slot.hidden,false);assert.match(slot.innerHTML,/নতুন &lt;title&gt;/);
 pending[0].resolve(response({updated:new Date(now-1000).toISOString(),live:[item('12345678901','পুরোনো')]}));await flush();assert.match(slot.innerHTML,/নতুন/);assert.doesNotMatch(slot.innerHTML,/পুরোনো/);
 // Future timestamps should not make a stale "live" announcement last indefinitely.
 events.visibilitychange();pending[2].resolve(response({updated:new Date(now+3600000).toISOString(),live:[item('12345678901','ভবিষ্যৎ')]}));await flush();assert.equal(slot.hidden,true);
 events.visibilitychange();pending[3].resolve(response({updated:new Date(now+60000).toISOString(),live:[item('abcdefghijk','চলছে')]}));await flush();assert.equal(slot.hidden,false,'allow a small clock skew');
 now+=47*60000;timers.find(x=>x.ms===60000).fn();assert.equal(slot.hidden,true,'expired live status must disappear');
 console.log('live status: request ordering, clock skew, expiry and escaped text pass');
})().catch(e=>{console.error(e);process.exitCode=1});
