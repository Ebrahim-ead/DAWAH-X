'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const context={window:{}};vm.runInNewContext(fs.readFileSync('scripture-hadith-reasons.js','utf8'),context);
const data=context.window.HADITH_REASON_NOTES;
assert.equal(Object.keys(data).length,22);
for(const [key,note] of Object.entries(data)) {
  const [book,id]=key.split(':'),n=Number(id);
  const files=fs.readdirSync('.').filter(f=>new RegExp('^scripture-hadith-'+book+'-[0-9]+[.]json[.]gz$').test(f));
  const rows=files.flatMap(f=>JSON.parse(zlib.gunzipSync(fs.readFileSync(f))));
  const r=rows.find(x=>x[0]===n);assert(r);assert.equal(note.ar,r[4]);
  assert(['daif','mawdu'].includes(note.grade));assert.equal(r[7],note.grade==='mawdu'?'Mawdu':'Daif');
  const slug={ibnmajah:'ibn-majah',tirmidhi:'tirmidhi',abudawud:'abu-dawud'}[book];
  assert.equal(note.url,`https://ihadis.com/${slug}/hadith/${r[1]}`);assert(note.note.length>20);
  if(note.correctedBn){assert.equal(note.originalBn,r[3]);assert.notEqual(note.correctedBn,r[3]);assert(note.correctionNote);}
}
assert(data['ibnmajah:21'].note.includes('মুনকার'));
assert(data['ibnmajah:21'].correctedBn.includes('আমি যেন এমন লোককে না দেখি'));
assert(data['ibnmajah:968'].note.includes('অতিরিক্ত অংশ'));
assert.equal(data['tirmidhi:2727'].url,'https://ihadis.com/tirmidhi/hadith/2714');
assert(fs.readFileSync('hadith.html','utf8').indexOf('scripture-hadith-reasons.js') < fs.readFileSync('hadith.html','utf8').indexOf('scripture-app.js'));
console.log('hadith reasons: 22 source-linked, exact-chain guarded records pass');
