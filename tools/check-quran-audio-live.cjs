'use strict';
// Optional network check against the fixed public audio catalogues.
// No tracking, user requests or bulk audio downloads.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const base='https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/';
 const get=url=>fetch(url,{signal:AbortSignal.timeout(30000),redirect:'error'});
 const r=await get(base+'000_checksum.md5');assert(r.ok,'audio catalogue HTTP '+r.status);
 const body=await r.text(),names=new Set([...body.matchAll(/\b(\d{6})\.mp3\b/g)].map(m=>m[1]));
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync('scripture-quran-data.js','utf8'),ctx);const counts=ctx.window.QURAN.counts;
 const missing=[];for(let s=1;s<=114;s++)for(let a=1;a<=counts[s-1];a++){let id=String(s).padStart(3,'0')+String(a).padStart(3,'0');if(!names.has(id))missing.push(id)}
 assert.equal(missing.length,0,'recitation catalogue misses '+missing.length+' ayahs: '+missing.slice(0,10).join(', '));
 for(const file of ['001001','002255','036001','114006']){
  const audio=await fetch(base+file+'.mp3',{headers:{Range:'bytes=0-255'},signal:AbortSignal.timeout(30000),redirect:'error'});
  assert(audio.ok,'audio '+file+' HTTP '+audio.status);assert(/^audio\//i.test(audio.headers.get('content-type')||''),'audio MIME '+file);await audio.body?.cancel();
 }
 const fullBase='https://download.quranicaudio.com/quran/yasser_ad-dussary/';
 const catalogue=await fetch('https://quranicaudio.com/quran/97',{signal:AbortSignal.timeout(30000)});
 assert(catalogue.ok,'QuranicAudio catalogue HTTP '+catalogue.status);
 const html=await catalogue.text();
 for(let s=1;s<=114;s++) assert(html.includes(fullBase+String(s).padStart(3,'0')+'.mp3'),'full-surah link '+s+' missing');
 for(const file of ['001','002','055','114']){
  const audio=await fetch(fullBase+file+'.mp3',{headers:{Range:'bytes=0-255'},signal:AbortSignal.timeout(30000)});
  assert(audio.ok,'full-surah '+file+' HTTP '+audio.status);
  assert(/^audio\//i.test(audio.headers.get('content-type')||''),'full-surah MIME '+file);
  await audio.body?.cancel();
 }
 console.log('EveryAyah: 6,236 names and 4 samples; QuranicAudio: 114 full-surah links and 4 samples passed.');
})().catch(e=>{console.error(e);if(process.env.GITHUB_ACTIONS==='true')console.log('::error::Quran audio check: '+String(e.message).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1});
