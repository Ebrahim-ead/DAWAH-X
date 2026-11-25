#!/usr/bin/env node
'use strict';
// Append the separately labelled older Darimi mirror to an existing EAD/iHadis build.
// Re-running is idempotent and never edits the 25 existing books or bookmarks.
const fs=require('node:fs'), vm=require('node:vm'), zlib=require('node:zlib'), crypto=require('node:crypto'), cp=require('node:child_process');
const extracted=cp.execFileSync('python3',['tools/extract-tauhiderdak-darimi.py'],{maxBuffer:40*1024*1024});
const snapshot=JSON.parse(extracted),ctx={window:{}};
vm.runInNewContext(fs.readFileSync('scripture-hadith-index.js','utf8'),ctx);
const index=ctx.window.HADITH_INDEX,grades=ctx.window.HADITH_GRADE_INDEX,manifest=JSON.parse(fs.readFileSync('scripture-manifest.json'));
const id='darimimirror';delete index.books[id];delete manifest.books[id];
manifest.shards=manifest.shards.filter(s=>s.book!==id);
for(const kind of ['daif','mawdu'])grades[kind]=grades[kind].filter(v=>v[0]!==id);
const freq=new Map();for(const s of snapshot.sections)for(const r of s.entries)freq.set(r.number,(freq.get(r.number)||0)+1);
let serial=0;const sections=[];
snapshot.sections.forEach((s,i)=>{
 const sec=i+1,first=serial+1;
 const rows=s.entries.map(v=>{
  const row=[++serial,v.number,'',v.bn,v.ar,'',v.narrator,v.grade,v.full,freq.get(v.number)>1?1:0,v.section];
  if(/জাল|মাওদু|মাওযূ/.test(v.grade)) grades.mawdu.push([id,serial,sec,v.number,v.grade]);
  else if(/দুর্বল|যঈফ/.test(v.grade)) grades.daif.push([id,serial,sec,v.number,v.grade]);
  return row;
 });
 const raw=Buffer.from(JSON.stringify(rows)),file=`scripture-hadith-${id}-${sec}.json.gz`;
 if(raw.length>8*1024*1024)throw Error('Shard exceeds reader limit');
 fs.writeFileSync(file,zlib.gzipSync(raw,{level:9,mtime:0}));
 manifest.shards.push({book:id,section:sec,count:rows.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),file});
 sections.push({id:sec,name:s.title,count:rows.length,first,last:serial,hadithFirst:s.first,hadithLast:s.last,site:s.url});
});
if(serial!==3542)throw Error('Unexpected count');
index.books[id]={bn:'সুনান আদ-দারেমী (পুরোনো অনুলিপি)',short:'দারেমী',ar:'سنن الدارمي',en:'Sunan ad-Darimi',edition:'HadithBD-এর পুরোনো অনুলিপি · অসম্পূর্ণ',site:'https://www.tauhiderdak.com/sunan-darimi-bangla',source:'tauhiderdak-mirror',slug:'darimi',id,total:serial,shards:sections.length,langs:{bn:true,ar:true,en:false},sections};
manifest.books[id]=serial;manifest.total=Object.values(manifest.books).reduce((a,b)=>a+b,0);
manifest.darimiSource='Tauhiderdak mirror of HadithBD, older partial snapshot; see scripture-credits.md';
fs.writeFileSync('scripture-hadith-index.js','/* Generated from EAD, iHadis and Darimi mirror snapshots; see scripture-credits.md. */\nwindow.HADITH_DATA='+JSON.stringify(Object.fromEntries(Object.keys(index.books).map(k=>[k,{}])))+';\nwindow.HADITH_INDEX='+JSON.stringify(index)+';\nwindow.HADITH_GRADE_INDEX='+JSON.stringify(grades)+';\n');
fs.writeFileSync('scripture-manifest.json',JSON.stringify(manifest));
console.log('Built',serial,'older mirror records in',sections.length,'parts; current HadithBD version is not complete.');
