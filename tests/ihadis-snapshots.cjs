'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto'),vm=require('node:vm');
const c={window:{}};vm.runInNewContext(fs.readFileSync('scripture-hadith-index.js','utf8'),c);
const reports=JSON.parse(fs.readFileSync('tools/ihadis-collection-report.json'));
for(const [id,slug,count] of [['nawawi','40-hadith',42],['rafayadain','jujul-rafayel-yadain',48],['daifseries','dhaif-hadis-sirij',102],['hundredsunnah','100-hadith',101],['ramadandaif','ramadaner-durbol-hadis',36],['silsilasahih','silsila-sahiha',60],['mishkatdaif','miskate-dhaif-hadis',106]]){
 const data=zlib.gunzipSync(fs.readFileSync(`tools/ihadis-${slug}-snapshot.json.gz`));const r=reports.find(x=>x.slug===slug);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),r.sha256);
 const snap=JSON.parse(data),book=c.window.HADITH_INDEX.books[id];assert.equal(snap.meta.expected,count);assert.equal(book.total,count);assert.equal(book.site,'https://ihadis.com/'+slug);assert.equal(book.source,'ihadis-direct');let serial=0;
 for(const s of snap.sections){const rows=JSON.parse(zlib.gunzipSync(fs.readFileSync(`scripture-hadith-${id}-${s.id}.json.gz`)));assert.equal(rows.length,s.rows.length);s.rows.forEach((v,i)=>assert.deepEqual(rows[i],[++serial,v.number,'',v.bn,v.ar,'',v.narrator,v.grade,v.notes,0,'']));}
 assert.equal(serial,count);
}
const d=JSON.parse(zlib.gunzipSync(fs.readFileSync('scripture-hadith-daifseries-1.json.gz')));assert.equal(d[0][7],'জাল হাদিস');assert.match(d[0][3],/বর্ণনাকারী/);assert(d[13][8]);assert(!d[13][4]);
// Representative source pages checked separately: retain the exact grade,
// Arabic gap and the source's commentary rather than just matching counts.
function row(file,number){return JSON.parse(zlib.gunzipSync(fs.readFileSync(file))).find(r=>r[1]===number)}
const hundred=row('scripture-hadith-hundredsunnah-6.json.gz',60);
assert.equal(hundred[7],'সহিহ হাদিস');assert.equal(hundred[4],'');assert.equal(hundred[8],'(মুসলিম ৩৭৩)');
const ramadan=row('scripture-hadith-ramadandaif-1.json.gz',15);
assert.equal(ramadan[7],'দুর্বল হাদিস');assert.match(ramadan[4],/^إني رأيت/);assert.match(ramadan[8],/ত্বাবারানি দুটি সনদে/);
const silsila=row('scripture-hadith-silsilasahih-1.json.gz',33);
assert.equal(silsila[7],'সহিহ হাদিস');assert.match(silsila[6],/ইসহাক ইবনু সাঈদ/);assert.match(silsila[8],/আলবানী/);
const mishkatWeak=row('scripture-hadith-mishkatdaif-2.json.gz',35);
assert.equal(mishkatWeak[7],'দুর্বল হাদিস');assert.equal(mishkatWeak[4],'');assert.match(mishkatWeak[8],/হাসান ইবনু ইয়াহইয়া নামে পরিত্যক্ত রাবী/);
console.log('Seven iHadis editions exactly match collected snapshot fields, grades, notes and gaps');
