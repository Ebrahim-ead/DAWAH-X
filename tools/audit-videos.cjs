#!/usr/bin/env node
/* Background availability audit. A feed contains only recent uploads and cannot prove deletion.
   YouTube oEmbed 404 is treated as unavailable (not necessarily deleted). Three independent
   observations over at least 48 hours are required; errors, 401 and rate limits never delete.
   The browser never calls YouTube to fetch video metadata. */
'use strict';
const fs=require('fs'),path=require('path');
const {manualBlocked}=require('./video-blocklist.cjs');
const ROOT=path.join(__dirname,'..'),LIST=path.join(ROOT,'youtube-videos.json'),STATE=path.join(__dirname,'video-audit-state.json');
const MIN_GAP=20*3600e3,MIN_SPAN=48*3600e3,MAX_SCAN=250,MAX_RECENT=50,RECENT_AGE=30*86400e3,MAX_PENDING=80,CONCURRENCY=10;
const valid=id=>/^[\w-]{11}$/.test(id||'');
const iso=now=>new Date(now).toISOString();
function select(videos,state,now){
 const ids=[...new Set(videos.map(v=>v.id).filter(valid))].sort(),set=new Set(ids),pending=Object.keys(state.pending||{}).filter(id=>set.has(id));
 const due=pending.filter(id=>now-Date.parse(state.pending[id].last||0)>=MIN_GAP).sort((a,b)=>Date.parse(state.pending[a].last)-Date.parse(state.pending[b].last)).slice(0,MAX_PENDING);
 const pendingSet=new Set(pending);
 // Recently published videos appear prominently on the site: check them sooner, while
 // keeping most of the batch for the rotating, complete historical audit.
 const recent=videos.filter(v=>set.has(v.id)&&!pendingSet.has(v.id)&&Number.isFinite(Date.parse(v.publishedAt))&&now-Date.parse(v.publishedAt)>=0&&now-Date.parse(v.publishedAt)<=RECENT_AGE)
  .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id));
 const recentIds=[...new Set(recent.map(v=>v.id))].slice(0,MAX_RECENT),recentSet=new Set(recentIds);
 const ordered=ids.filter(id=>!pendingSet.has(id)&&!recentSet.has(id)),start=ordered.findIndex(id=>id>(state.cursor||''));
 const rotated=start<0?ordered:ordered.slice(start).concat(ordered.slice(0,start));
 const rest=rotated.slice(0,MAX_SCAN-recentIds.length),scan=recentIds.concat(rest);
 return {due,scan,cursor:rest.at(-1)||state.cursor||'',all:[...due,...scan]};
}
function apply(videos,state,selection,results,now){
 const counts={ok:0,missing:0,unknown:0};for(const r of results)counts[r.status]++;
 // Systemic errors/challenges or unexpectedly widespread 404s are never evidence of deletion.
 const scanSet=new Set(selection.scan),scanResults=results.filter(r=>scanSet.has(r.id));
 const scanMissing=scanResults.filter(r=>r.status==='missing').length;
 if(results.length&&(!counts.ok||counts.unknown>results.length*.4||(scanResults.length>=10&&scanMissing>Math.max(10,scanResults.length*.45))))return {state,videos,removed:[],counts,aborted:true};
 const live=new Set(videos.map(v=>v.id)),pending={};
 for(const [id,x] of Object.entries(state.pending||{}))if(live.has(id))pending[id]={...x};
 const removed=[],blocked={...(state.blocked||{})};
 for(const r of results){
  if(r.status==='ok'){delete pending[r.id];continue}if(r.status!=='missing')continue;
  let x=pending[r.id];if(!x){pending[r.id]={first:iso(now),last:iso(now),count:1};continue}
  if(now-Date.parse(x.last)<MIN_GAP)continue;
  x.last=iso(now);x.count=(x.count||1)+1;
  if(x.count>=3&&now-Date.parse(x.first)>=MIN_SPAN){removed.push(r.id);blocked[r.id]=iso(now);delete pending[r.id]}
 }
 const drop=new Set(removed);
 return {state:{v:1,cursor:selection.cursor??selection.scan.at(-1)??state.cursor??'',pending,blocked},videos:videos.filter(v=>!drop.has(v.id)),removed,counts,aborted:false};
}
async function probe(id){
 const u='https://www.youtube.com/oembed?url='+encodeURIComponent('https://www.youtube.com/watch?v='+id)+'&format=json';
 try{
  const r=await fetch(u,{headers:{'user-agent':'DAWAH-X video availability audit/1.0','accept':'application/json'},signal:AbortSignal.timeout(8000)});
  if(r.status===404)return {id,status:'missing'};
  if(!r.ok)return {id,status:'unknown'};
  const data=await r.json();return {id,status:data&&data.type==='video'&&typeof data.title==='string'?'ok':'unknown'};
 }catch(_){return {id,status:'unknown'}}
}
async function run(){
 const videos=JSON.parse(fs.readFileSync(LIST,'utf8'));if(!Array.isArray(videos)||videos.length<1000)throw Error('ভিডিও তালিকা অস্বাভাবিক; পরীক্ষা বন্ধ');
 let state={v:1,cursor:'',pending:{},blocked:{}};if(fs.existsSync(STATE))state=JSON.parse(fs.readFileSync(STATE,'utf8'));
 if(state.v!==1||!state.pending||typeof state.pending!=='object')throw Error('অডিটের অবস্থা অবৈধ; পরীক্ষা বন্ধ');
 const appFile=path.join(ROOT,'app.js'),app=fs.readFileSync(appFile,'utf8');
 const legacy=Object.keys(JSON.parse((app.match(/const SITE_VIDEOS=(\{[^\n]+\});/)||[])[1]||'{}'));
 const manual=manualBlocked();
 const candidates=videos.concat(legacy.map(id=>({id}))).filter(v=>!state.blocked?.[v.id]&&!manual.has(v.id));
 const now=Date.now(),selection=select(candidates,state,now),results=[];let cursor=0;
 await Promise.all(Array.from({length:Math.min(CONCURRENCY,selection.all.length)},async()=>{while(cursor<selection.all.length){const id=selection.all[cursor++];results.push(await probe(id))}}));
 const next=apply(candidates,state,selection,results,now);console.log('পরীক্ষা:',results.length,'পাওয়া গেছে:',next.counts.ok,'404:',next.counts.missing,'অনিশ্চিত:',next.counts.unknown,'সরানো:',next.removed.length);
 if(next.aborted){console.log('::warning::অস্বাভাবিক প্রতিক্রিয়া — কোনো ভিডিও সরানো বা অগ্রগতি সংরক্ষণ করা হয়নি।');return}
 if(process.argv.includes('--dry'))return;
 if(!next.removed.length){fs.writeFileSync(STATE,JSON.stringify(next.state,null,2)+'\n');return}
 const drop=new Set(next.removed);
 // The three curated legacy videos are stored in app.js, not the gallery catalogue.
 let updatedApp=app;for(const id of legacy.filter(id=>drop.has(id))){
  const re=new RegExp('^\\[[^\\n]*https://www\\.youtube\\.com/watch\\?v='+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"\\],?\\n','m');
  if(!re.test(updatedApp))throw Error('পুরনো ভিডিওর সারি পাওয়া যায়নি: '+id);
  updatedApp=updatedApp.replace(re,'');
 }
 if(updatedApp!==app){const m=updatedApp.match(/const SITE_VIDEOS=(\{[^\n]+\});/);const obj=JSON.parse(m[1]);for(const id of drop)delete obj[id];updatedApp=updatedApp.replace(m[0],'const SITE_VIDEOS='+JSON.stringify(obj)+';');fs.writeFileSync(appFile,updatedApp)}
 const remaining=videos.filter(v=>!drop.has(v.id));fs.writeFileSync(LIST,JSON.stringify(remaining));
 const stats=path.join(ROOT,'stats.json');let data=JSON.parse(fs.readFileSync(stats,'utf8'));data.videos=remaining.length;fs.writeFileSync(stats,JSON.stringify(data)+'\n');
 const cross=path.join(ROOT,'cross-links.json');if(fs.existsSync(cross)){const x=JSON.parse(fs.readFileSync(cross,'utf8'));x.links=x.links.filter(v=>!drop.has(v.id));fs.writeFileSync(cross,JSON.stringify(x));}
 fs.writeFileSync(STATE,JSON.stringify(next.state,null,2)+'\n');
 console.log('সরানো ভিডিও ID:',next.removed.join(', '));
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
module.exports={select,apply,probe,MIN_GAP,MIN_SPAN};
