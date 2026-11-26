#!/usr/bin/env node
'use strict';
// Derived, candidate-only index for the site's own hadith-reader snapshots.
// Results must still be loaded and verified against the original shard.
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'unified-search');fs.mkdirSync(out,{recursive:true});
const ctx={window:{}};for(const f of ['scripture-hadith-index.js','scripture-surahs.js','scripture-quran-data.js','scripture-bn-index.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
for(let i=1;i<=114;i++)vm.runInNewContext(fs.readFileSync(path.join(root,'scripture-bn-'+i+'.js'),'utf8'),ctx);
const {HADITH_INDEX:H,SURAHS,QURAN,BN_SURAHS}=ctx.window;
const normalize=x=>String(x||'').normalize('NFC').toLowerCase().replace(/[০-৯]/g,d=>String('০১২৩৪৫৬৭৮৯'.indexOf(d))).replace(/[\u200b-\u200d\ufeff\u00ad]/g,'');
const tokens=x=>[...new Set((normalize(x).match(/[\p{L}\p{M}\p{N}]+/gu)||[]).filter(w=>[...w].length>=2&&[...w].length<=60).map(w=>[...w].slice(0,4).join('')))];
const hash=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0)%32;};
const books=Object.keys(H.books),docs=[],postings=new Map();
for(const [bi,id] of books.entries()){
 const book=H.books[id];if(!/^[a-z]+$/.test(id))throw Error('Invalid book id: '+id);
 let count=0;for(const section of book.sections){if(!section.count)continue;
  const file=path.join(root,`scripture-hadith-${id}-${section.id}.json.gz`),rows=JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
  if(!Array.isArray(rows)||rows.length!==section.count)throw Error('Section count mismatch: '+file);
  for(const row of rows){if(!Array.isArray(row)||row.length!==11||!Number.isInteger(row[0])||row[0]<1)throw Error('Invalid record: '+file);
   const doc=docs.length;docs.push([bi,section.id,row[0]]);count++;
   // Both displayed language fields and source-provided narrator/notes.
   for(const key of tokens([row[3],row[4],row[6],row[8]].join(' '))){let a=postings.get(key);if(!a)postings.set(key,a=[]);a.push(doc)}
  }
 }
 if(count!==book.total)throw Error('Book count mismatch '+id);
}
function encode(ids){const bytes=[];let prev=0;for(const [i,id] of ids.entries()){let n=i?id-prev:id;prev=id;do{let b=n&127;n>>>=7;bytes.push(b|(n?128:0))}while(n)}return Buffer.from(bytes).toString('base64')}
const shards=Array.from({length:32},()=>({}));for(const [key,ids] of postings)shards[hash(key)][key]=encode(ids);
fs.writeFileSync(path.join(out,'hadith-meta.json'),JSON.stringify({version:1,books:books.map(id=>({id,name:H.books[id].bn,edition:H.books[id].edition,source:H.books[id].source})),docs,shards:32})+'\n');
shards.forEach((x,i)=>fs.writeFileSync(path.join(out,`hadith-${String(i).padStart(2,'0')}.json`),JSON.stringify(x)+'\n'));
const quran=[];for(let i=0;i<114;i++){const bn=BN_SURAHS[i+1],ar=QURAN.verses[i];if(!Array.isArray(bn)||!Array.isArray(ar)||bn.length!==ar.length||bn.length!==QURAN.counts[i])throw Error('Quran mismatch '+(i+1));quran.push({n:i+1,name:SURAHS[i].bn,verses:bn.map((b,j)=>[b,ar[j]])});}
fs.writeFileSync(path.join(out,'quran.json'),JSON.stringify(quran)+'\n');
console.log(`Unified search indexed ${docs.length} records in ${books.length} editions and ${quran.reduce((n,s)=>n+s.verses.length,0)} Quran verses.`);
