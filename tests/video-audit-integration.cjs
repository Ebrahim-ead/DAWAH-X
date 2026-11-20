'use strict';
/* End-to-end test in an isolated temporary checkout, with YouTube and time simulated. */
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dawahx-audit-'));fs.mkdirSync(path.join(dir,'tools'));
const write=(p,o)=>fs.writeFileSync(path.join(dir,p),typeof o==='string'?o:JSON.stringify(o));
try{
 fs.copyFileSync(path.join(__dirname,'../tools/audit-videos.cjs'),path.join(dir,'tools/audit-videos.cjs'));
 const videos=Array.from({length:1001},(_,i)=>({id:String(i).padStart(11,'0'),title:'ভিডিও'}));
 const id=videos[0].id;write('youtube-videos.json',videos);write('stats.json',{videos:videos.length});write('cross-links.json',{v:1,links:[{id,texts:[]}]});write('app.js','const SITE_VIDEOS={};\n');
 const stub=`const NativeDate=Date;global.Date=class extends NativeDate{static now(){return Number(process.env.FAKE_NOW)}};global.fetch=async url=>{const id=new URL(new URL(url).searchParams.get('url')).searchParams.get('v');return id===process.env.BAD_ID?{status:404,ok:false}:{status:200,ok:true,json:async()=>({type:'video',title:'OK'})}};`;
 write('mock.cjs',stub);
 const start=Date.parse('2026-01-01T00:00:00Z');
 function run(time){cp.execFileSync(process.execPath,['--require',path.join(dir,'mock.cjs'),path.join(dir,'tools/audit-videos.cjs')],{env:{...process.env,FAKE_NOW:String(time),BAD_ID:id},stdio:'pipe'})}
 const get=p=>JSON.parse(fs.readFileSync(path.join(dir,p),'utf8'));
 run(start);assert.equal(get('youtube-videos.json').length,1001);assert.equal(get('tools/video-audit-state.json').pending[id].count,1);
 run(start+24*3600e3);assert.equal(get('youtube-videos.json').length,1001);
 run(start+48*3600e3);assert.equal(get('youtube-videos.json').length,1000);assert(!get('youtube-videos.json').some(x=>x.id===id));assert.equal(get('stats.json').videos,1000);assert.equal(get('cross-links.json').links.length,0);assert(get('tools/video-audit-state.json').blocked[id]);
 console.log('video audit integration: persisted observations, removal, stats, links and blocklist pass');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
