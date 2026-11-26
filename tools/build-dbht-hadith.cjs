#!/usr/bin/env node
'use strict';
// Append two independently labelled, incomplete DBHT editions without editing
// existing books. Source-number anomalies are preserved, not silently repaired.
const fs=require('node:fs'), vm=require('node:vm'), zlib=require('node:zlib'), crypto=require('node:crypto');
const source=fs.readFileSync('tools/dbht-hadith-posts.json.gz');
const sha=crypto.createHash('sha256').update(source).digest('hex');
if(sha!=='da10eba8fcf3fb194aa2b1cddef7136e06fdd277224892a00f687310dc533a3b') throw Error('DBHT snapshot checksum mismatch');
const snapshot=JSON.parse(zlib.gunzipSync(source));
if(snapshot.posts.length!==5896 || snapshot.skipped.length!==1 || snapshot.skipped[0].id!==108107) throw Error('Unexpected snapshot coverage');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('scripture-hadith-index.js','utf8'),ctx);
const index=ctx.window.HADITH_INDEX, grades=ctx.window.HADITH_GRADE_INDEX, manifest=JSON.parse(fs.readFileSync('scripture-manifest.json'));
const specs=[
 {id:'dbhtsombhar',group:'sombhar',bn:'হাদীস সম্ভার (DBHT অনুলিপি)',short:'সম্ভার · DBHT',expected:3898},
 {id:'dbhtdaif',group:'daif',bn:'যয়িফ ও জাল হাদিস সিরিজ (DBHT অনুলিপি)',short:'যয়িফ-জাল · DBHT',expected:1998}
];
const ids=new Set(specs.map(s=>s.id));for(const id of ids){delete index.books[id];delete manifest.books[id];}
manifest.shards=manifest.shards.filter(x=>!ids.has(x.book));for(const key of ['daif','mawdu']) grades[key]=grades[key].filter(x=>!ids.has(x[0]));
function gradeFor(p) {
  const lines=p.bn.split('\n');
  if(p.group==='sombhar') {
    const matches=lines.map(x=>x.match(/^তাহক্বীক\s*::\s*(সহীহ|সহিহ|হাসান|যঈফ|সহিহ\/যঈফ|হাসান সহীহ)\s*$/)).filter(Boolean);
    return matches.length===1?matches[0][1]:'';
  }
  // Only a short, explicit verdict line is used. Other verdicts remain in the
  // source text, but are not guessed into the filter or a misleading badge.
  const re=/^হাদীসটি\s+(দুর্বল|খুবই দুর্বল|নিতান্তই দুর্বল|জাল|বানোয়াট|মুনকার|বাতিল)[।\s]*$|^হাদিসটি\s+(দুর্বল|খুবই দুর্বল|নিতান্তই দুর্বল|জাল|বানোয়াট|মুনকার|বাতিল)[।\s]*$/;
  const found=lines.slice(0,9).filter(x=>re.test(x.trim()));
  return found.length===1?found[0].trim():'';
}
for(const spec of specs){
 const posts=snapshot.posts.filter(x=>x.group===spec.group);
 if(posts.length!==spec.expected)throw Error('Unexpected '+spec.id+' count');
 const freq=new Map();posts.forEach(p=>freq.set(p.title_number,(freq.get(p.title_number)||0)+1));
 let serial=0,sections=[];
 for(let offset=0;offset<posts.length;offset+=50){
  const part=posts.slice(offset,offset+50),sec=sections.length+1,first=serial+1;
  const rows=part.map(p=>{
   if(!Number.isSafeInteger(p.id)||!Number.isSafeInteger(p.title_number)||typeof p.bn!=='string'||typeof p.ar!=='string')throw Error('Bad source post');
   const grade=gradeFor(p), body=p.body_number===null?'পাঠের শিরোনাম নম্বর শনাক্ত হয়নি': 'পাঠের শিরোনাম নম্বর: '+p.body_number;
   const label='উৎস শিরোনাম: '+p.title+' · '+body+' · DBHT পোস্ট ID: '+p.id+(p.body_number!==null&&p.body_number!==p.title_number?' · শিরোনাম ও পাঠের নম্বর আলাদা':'');
   const row=[++serial,p.title_number,'',p.bn,p.ar,'','',grade,'',freq.get(p.title_number)>1?1:0,label];
   if(/জাল|মাওদু|মাওযূ/.test(grade))grades.mawdu.push([spec.id,serial,sec,p.title_number,grade]);
   else if(/দুর্বল|যঈফ/.test(grade))grades.daif.push([spec.id,serial,sec,p.title_number,grade]);
   return row;
  });
  const raw=Buffer.from(JSON.stringify(rows)),file=`scripture-hadith-${spec.id}-${sec}.json.gz`;
  if(raw.length>8*1024*1024)throw Error('Shard exceeds reader limit');
  fs.writeFileSync(file,zlib.gzipSync(raw,{level:9,mtime:0}));
  manifest.shards.push({book:spec.id,section:sec,count:rows.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),file});
  sections.push({id:sec,name:`পাঠক্রম ${first}–${serial}`,count:rows.length,first,last:serial,hadithFirst:rows[0][1],hadithLast:rows[rows.length-1][1]});
 }
 index.books[spec.id]={id:spec.id,bn:spec.bn,short:spec.short,ar:'',en:'',edition:'DBHT 7 · পুরোনো অসম্পূর্ণ অনুলিপি',site:'https://www.waytojannah.com/blog/2017/12/25/dbht-hadith-software-version-7/',source:'dbht',slug:spec.group,total:serial,shards:sections.length,langs:{bn:true,ar:true,en:false},sections};
 manifest.books[spec.id]=serial;
}
manifest.total=Object.values(manifest.books).reduce((a,b)=>a+b,0);
manifest.dbhtSource='DBHT 7 source tabs, partial, differing numbers; see scripture-credits.md';
fs.writeFileSync('scripture-hadith-index.js','/* Generated from EAD, iHadis, Darimi mirror and DBHT snapshots; see scripture-credits.md. */\nwindow.HADITH_DATA='+JSON.stringify(Object.fromEntries(Object.keys(index.books).map(k=>[k,{}])))+';\nwindow.HADITH_INDEX='+JSON.stringify(index)+';\nwindow.HADITH_GRADE_INDEX='+JSON.stringify(grades)+';\n');
fs.writeFileSync('scripture-manifest.json',JSON.stringify(manifest));
console.log('DBHT source posts:',specs.map(x=>`${x.group} ${x.expected}`).join(', '),'total indexed',manifest.total);
