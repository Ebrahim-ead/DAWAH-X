'use strict';
/* Feed integration: a user-confirmed deletion cannot be re-added by an older feed entry. */
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dawahx-block-'));const tools=path.join(dir,'tools'),fixtures=path.join(dir,'fixtures');fs.mkdirSync(tools);fs.mkdirSync(fixtures);
const write=(p,data)=>fs.writeFileSync(path.join(dir,p),typeof data==='string'?data:JSON.stringify(data));
try{
 for(const name of ['update-videos.cjs','video-blocklist.cjs'])fs.copyFileSync(path.join(__dirname,'../tools',name),path.join(tools,name));
 const blocked='YxQsc-_PAYw',added='abcdefghijk',channel='UC'+'a'.repeat(22);
 write('tools/video-blocklist.json',{v:1,ids:[blocked]});write('tools/video-channels.json',{addSince:'2020-01-01T00:00:00Z',channels:[{title:'DAWAH X',channelId:channel}]});
 const videos=Array.from({length:1001},(_,i)=>({id:String(i).padStart(11,'0'),title:'পুরোনো',channelTitle:'DAWAH X'}));write('youtube-videos.json',videos);write('stats.json',{videos:1001});
 const entry=(id,title)=>`<entry><yt:videoId>${id}</yt:videoId><yt:channelId>${channel}</yt:channelId><title>${title}</title><published>2026-11-01T00:00:00Z</published></entry>`;
 const url='https://www.youtube.com/feeds/videos.xml?channel_id='+channel;
 fs.writeFileSync(path.join(fixtures,encodeURIComponent(url)),'<feed>'+entry(blocked,'ead')+entry(added,'নতুন ভিডিও')+'</feed>');
 const run=()=>cp.execFileSync(process.execPath,[path.join(tools,'update-videos.cjs')],{env:{...process.env,VIDEO_FIXTURES:fixtures},stdio:'pipe'});
 run();let got=JSON.parse(fs.readFileSync(path.join(dir,'youtube-videos.json'),'utf8'));
 assert(!got.some(v=>v.id===blocked));assert(got.some(v=>v.id===added));assert.equal(got.length,1002);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'stats.json'),'utf8')).videos,1002);
 run();got=JSON.parse(fs.readFileSync(path.join(dir,'youtube-videos.json'),'utf8'));assert.equal(got.length,1002);assert(!got.some(v=>v.id===blocked));
 console.log('video blocklist: confirmed deletion stays removed when it appears in the feed');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
