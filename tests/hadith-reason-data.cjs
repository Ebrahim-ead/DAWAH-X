'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const context={window:{}};vm.runInNewContext(fs.readFileSync('scripture-hadith-reasons.js','utf8'),context);
const data=context.window.HADITH_REASON_NOTES;
assert.deepEqual(Object.keys(data).sort(),[2017,2018,2038,2051,2054,2057,2060,2097].map(n=>'ibnmajah:'+n).sort());
const rows=[10,11].flatMap(n=>JSON.parse(zlib.gunzipSync(fs.readFileSync(`scripture-hadith-ibnmajah-${n}.json.gz`))));
for(const [key,note] of Object.entries(data)) {
  const n=Number(key.split(':')[1]),r=rows.find(x=>x[0]===n);
  assert(r && r[1]===n && r[7]==='Daif');assert.equal(note.ar,r[4]);
  assert.equal(note.url,`https://ihadis.com/ibn-majah/hadith/${n}`);assert(note.note.length>20);
}
assert(fs.readFileSync('hadith.html','utf8').indexOf('scripture-hadith-reasons.js') < fs.readFileSync('hadith.html','utf8').indexOf('scripture-app.js'));
console.log('hadith reasons: eight source-linked, exact-chain guarded records pass');
