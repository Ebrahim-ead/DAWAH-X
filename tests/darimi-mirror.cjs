'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),vm=require('node:vm'),cp=require('node:child_process');
const data=JSON.parse(cp.execFileSync('python3',['tools/extract-tauhiderdak-darimi.py'],{maxBuffer:40*1024*1024}));
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('scripture-hadith-index.js','utf8'),ctx);
const book=ctx.window.HADITH_INDEX.books.darimimirror;assert.equal(book.source,'tauhiderdak-mirror');assert.match(book.edition,/অসম্পূর্ণ/);assert.equal(book.total,3542);assert.equal(book.sections.length,59);
const all=data.sections.flatMap(s=>s.entries), counts=new Map();for(const v of all)counts.set(v.number,(counts.get(v.number)||0)+1);
let serial=0;
for(let i=0;i<data.sections.length;i++){
 const source=data.sections[i], section=book.sections[i];assert.equal(section.site,source.url);assert.equal(section.name,source.title);
 const rows=JSON.parse(zlib.gunzipSync(fs.readFileSync(`scripture-hadith-darimimirror-${i+1}.json.gz`)));
 assert.equal(rows.length,source.entries.length);
 source.entries.forEach((v,j)=>assert.deepEqual(rows[j],[++serial,v.number,'',v.bn,v.ar,'',v.narrator,v.grade,v.full,counts.get(v.number)>1?1:0,v.section]));
}
assert.equal(serial,3542);assert.deepEqual([...counts].filter(([,n])=>n>1).map(([n])=>n),[113,914,3312]);
const missing=Array.from({length:3542},(_,i)=>i+1).filter(n=>!counts.has(n));assert.deepEqual(missing,[114,915,3313]);
const first=JSON.parse(zlib.gunzipSync(fs.readFileSync('scripture-hadith-darimimirror-1.json.gz')))[0];
assert.equal(first[1],1);assert.match(first[3],/জাহিলী যুগে/);assert.match(first[4],/حَدَّثَنَا/);assert.match(first[8],/তাহক্বীক্ব/);assert.equal(first[7],'সহিহ (Sahih)');
console.log('Darimi older mirror: all 3,542 extracted records, original paragraphs, source grades and numbering anomalies verified');
