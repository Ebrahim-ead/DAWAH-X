'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),vm=require('node:vm'),crypto=require('node:crypto');
const gz=fs.readFileSync('tools/dbht-hadith-posts.json.gz');assert.equal(crypto.createHash('sha256').update(gz).digest('hex'),'da10eba8fcf3fb194aa2b1cddef7136e06fdd277224892a00f687310dc533a3b');
const snapshot=JSON.parse(zlib.gunzipSync(gz));assert.equal(snapshot.skipped.length,1);assert.equal(snapshot.skipped[0].id,108107);
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('scripture-hadith-index.js','utf8'),ctx);
for(const [id,group,count,missAr,missBn,mismatches,unknown] of [['dbhtsombhar','sombhar',3898,60,0,12,1],['dbhtdaif','daif',1998,2,3,36,6]]){
 const posts=snapshot.posts.filter(p=>p.group===group),b=ctx.window.HADITH_INDEX.books[id];assert.equal(posts.length,count);assert.equal(b.total,count);assert.equal(b.source,'dbht');assert.match(b.edition,/অসম্পূর্ণ/);
 const rows=b.sections.flatMap(s=>JSON.parse(zlib.gunzipSync(fs.readFileSync(`scripture-hadith-${id}-${s.id}.json.gz`))));
 const freq=new Map();for(const p of posts)freq.set(p.title_number,(freq.get(p.title_number)||0)+1);
 posts.forEach((p,i)=>{const r=rows[i];assert.equal(r[0],i+1);assert.equal(r[1],p.title_number);assert.equal(r[3],p.bn);assert.equal(r[4],p.ar);assert.equal(r[9],freq.get(p.title_number)>1?1:0);assert(r[10].includes(p.title));assert(r[10].includes('DBHT পোস্ট ID: '+p.id));if(p.body_number!==null)assert(r[10].includes('পাঠের শিরোনাম নম্বর: '+p.body_number));else assert(r[10].includes('শনাক্ত হয়নি'));if(p.body_number!==null&&p.body_number!==p.title_number)assert(r[10].includes('নম্বর আলাদা'));});
 assert.equal(rows.filter(r=>!r[4].trim()).length,missAr);assert.equal(rows.filter(r=>!r[3].trim()).length,missBn);
 assert.equal(posts.filter(p=>p.body_number!==null&&p.body_number!==p.title_number).length,mismatches);assert.equal(posts.filter(p=>p.body_number===null).length,unknown);
}
console.log('DBHT: all 5,896 pinned tabs, numbers, duplicates, gaps and skipped malformed post verified');
