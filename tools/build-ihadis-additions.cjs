#!/usr/bin/env node
'use strict';
// Append independently acquired iHadis editions to the existing EAD build.
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const specs=[['nawawi','40-hadith','নববী ৪০','ইসলাম হাউজ ডট কম'],['rafayadain','jujul-rafayel-yadain','রাফায়েল ইয়াদাইন','তাওহীদ পাবলিকেশন্স'],['daifseries','dhaif-hadis-sirij','জাল ও যঈফ সিরিজ','তাওহীদ পাবলিকেশন্স'],['hundredsunnah','100-hadith','১০০ সুসাব্যস্ত হাদীস','হাদিস প্রজেক্ট টীম'],['ramadandaif','ramadaner-durbol-hadis','রমজানের দুর্বল হাদিস','সানাউল্লাহ নজির আহমদ'],['silsilasahih','silsila-sahiha','সিলসিলা সহিহা','আতিফা পাবলিকেশন্স'],['mishkatdaif','miskate-dhaif-hadis','মিশকাতে যঈফ হাদীস','আছ-সিরাত প্রকাশনী']];
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('scripture-hadith-index.js','utf8'),ctx);const index=ctx.window.HADITH_INDEX,grades=ctx.window.HADITH_GRADE_INDEX,manifest=JSON.parse(fs.readFileSync('scripture-manifest.json'));
const names=new Set(specs.map(x=>x[0]));for(const id of names){delete index.books[id];delete manifest.books[id]}
manifest.shards=manifest.shards.filter(x=>!names.has(x.book));for(const key of ['daif','mawdu'])grades[key]=grades[key].filter(x=>!names.has(x[0]));
for(const [id,slug,short,edition] of specs){
 const s=JSON.parse(zlib.gunzipSync(fs.readFileSync(`tools/ihadis-${slug}-snapshot.json.gz`)));if(s.meta.slug!==slug||s.sections.flatMap(c=>c.rows).length!==s.meta.expected)throw Error('Incomplete snapshot '+slug);let serial=0,sections=[];
 for(const c of s.sections){const first=serial+1,rows=c.rows.map(v=>{if(v.id!==v.number||!v.bn||!v.grade)throw Error('Ambiguous identity '+slug+':'+v.id);const r=[++serial,v.number,'',v.bn,v.ar,'',v.narrator,v.grade,v.notes,0,''];if(/জাল|মাওদু|মাওযূ/.test(v.grade))grades.mawdu.push([id,serial,c.id,v.number,v.grade]);else if(/দুর্বল|যঈফ/.test(v.grade))grades.daif.push([id,serial,c.id,v.number,v.grade]);return r;});
  let raw=Buffer.from(JSON.stringify(rows)),file=`scripture-hadith-${id}-${c.id}.json.gz`;fs.writeFileSync(file,zlib.gzipSync(raw,{level:9,mtime:0}));manifest.shards.push({book:id,section:c.id,count:rows.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),file});sections.push({id:c.id,name:c.name,count:rows.length,first,last:serial,hadithFirst:rows[0][1],hadithLast:rows.at(-1)[1]});
 }
 index.books[id]={bn:s.meta.title,short,ar:'',en:'',edition,site:s.source,source:'ihadis-direct',slug,id,total:serial,shards:sections.length,langs:{bn:true,ar:s.sections.some(c=>c.rows.some(r=>r.ar)),en:false},sections};manifest.books[id]=serial;
}
manifest.total=Object.values(manifest.books).reduce((a,b)=>a+b,0);manifest.additionalSource='iHadis public pages; see scripture-credits.md';
fs.writeFileSync('scripture-hadith-index.js','/* Generated from EAD and iHadis snapshots; see scripture-credits.md. */\nwindow.HADITH_DATA='+JSON.stringify(Object.fromEntries(Object.keys(index.books).map(k=>[k,{}])))+';\nwindow.HADITH_INDEX='+JSON.stringify(index)+';\nwindow.HADITH_GRADE_INDEX='+JSON.stringify(grades)+';\n');
fs.writeFileSync('scripture-manifest.json',JSON.stringify(manifest));console.log('Hadith records:',manifest.total);
