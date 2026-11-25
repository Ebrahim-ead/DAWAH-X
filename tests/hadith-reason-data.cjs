'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const c={window:{}};vm.runInNewContext(fs.readFileSync('scripture-hadith-index.js','utf8'),c);
const idx=c.window.HADITH_INDEX,manifest=JSON.parse(fs.readFileSync('scripture-manifest.json'));let missing=0,notes=0;const grades={daif:[],mawdu:[]};
for(const sh of manifest.shards){const rows=JSON.parse(zlib.gunzipSync(fs.readFileSync(sh.file)));for(const r of rows){
 assert(r[3].trim());if(!r[4].trim())missing++;if(r[8])notes++;
 if(/জাল|মাওদু|মাওযূ/.test(r[7]))grades.mawdu.push([sh.book,r[0],sh.section,r[1],r[7]]);
 else if(/দুর্বল|যঈফ/.test(r[7]))grades.daif.push([sh.book,r[0],sh.section,r[1],r[7]]);
}}
assert.equal(missing,255);assert.equal(notes,10422);assert.equal(JSON.stringify(c.window.HADITH_GRADE_INDEX),JSON.stringify(grades));
const m=idx.books.mishkat.sections.find(s=>s.hadithFirst<=4457&&s.hadithLast>=4457);if(m){const r=JSON.parse(zlib.gunzipSync(fs.readFileSync(`scripture-hadith-mishkat-${m.id}.json.gz`)));assert(!r.some(x=>x[1]===4457));}
console.log('EAD notes, source grades, Arabic gaps and missing Mishkat 4457 verified');
