'use strict';
const assert=require('assert'),{select,apply,MIN_SPAN}=require('../tools/audit-videos.cjs');
const videos=Array.from({length:30},(_,i)=>({id:String(i).padStart(11,'0')})),id=videos[0].id,good=videos[1].id;
let state={v:1,cursor:'',pending:{},blocked:{}};const t=Date.parse('2026-01-01T00:00:00Z');
const go=(time,kind)=>{const selection=select(videos,state,time);const results=selection.all.map(i=>({id:i,status:i===id?kind:'ok'}));const result=apply(videos,state,selection,results,time);state=result.state;return result};
let r=go(t,'missing');assert.equal(state.pending[id].count,1);assert.equal(r.removed.length,0);
r=go(t+3600e3,'missing');assert.equal(state.pending[id].count,1);
r=go(t+24*3600e3,'missing');assert.equal(state.pending[id].count,2);assert.equal(r.removed.length,0);
r=go(t+MIN_SPAN,'missing');assert.deepEqual(r.removed,[id]);assert(state.blocked[id]);assert(!r.videos.some(v=>v.id===id));
state={v:1,cursor:'',pending:{[id]:{first:new Date(t).toISOString(),last:new Date(t).toISOString(),count:1}},blocked:{}};
r=go(t+24*3600e3,'ok');assert(!state.pending[id]);
state={v:1,cursor:'',pending:{},blocked:{}};const selection=select(videos,state,t);
r=apply(videos,state,selection,selection.all.map(i=>({id:i,status:'missing'})),t);assert(r.aborted);assert.equal(r.removed.length,0);assert.deepEqual(r.state,state);
r=apply(videos,state,selection,selection.all.map(i=>({id:i,status:'unknown'})),t);assert(r.aborted);assert.equal(r.removed.length,0);
r=apply(videos,state,selection,selection.all.map(i=>({id:i,status:i===id?'unknown':'ok'})),t);assert(!r.aborted);assert(!r.state.pending[id]);
// The newest videos get a dedicated portion of each batch; history still advances by cursor.
const newer=Array.from({length:400},(_,i)=>({id:String(i).padStart(11,'0'),publishedAt:i>=350?'2026-01-01T00:00:00Z':'2020-01-01T00:00:00Z'}));
let batch=select(newer,{cursor:'',pending:{}},t+86400e3);assert.equal(batch.scan.length,250);
for(const v of newer.slice(350))assert(batch.scan.includes(v.id));assert(batch.scan.includes(newer[0].id));assert.equal(batch.cursor,newer[199].id);
batch=select(newer,{cursor:batch.cursor,pending:{}},t+86400e3);assert(batch.scan.includes(newer[200].id));assert(batch.scan.includes(newer[399].id));
console.log('video audit: confirmation, recovery, throttling and systemic failure safeguards pass');
(async()=>{
 const {probe}=require('../tools/audit-videos.cjs');
 global.fetch=async()=>({status:404,ok:false});assert.equal((await probe(id)).status,'missing');
 for(const status of [401,403,429,500]){global.fetch=async()=>({status,ok:false});assert.equal((await probe(id)).status,'unknown')}
 global.fetch=async()=>({status:200,ok:true,json:async()=>({type:'video',title:'test'})});assert.equal((await probe(good)).status,'ok');
 global.fetch=async()=>({status:200,ok:true,json:async()=>({})});assert.equal((await probe(good)).status,'unknown');
 global.fetch=async()=>{throw Error('network')};assert.equal((await probe(good)).status,'unknown');
 console.log('video audit: HTTP and network failure classification passes');
})().catch(e=>{console.error(e);process.exitCode=1});
