'use strict';
// Verify every shipped chapter against its manifest and the reader's index.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const context = { window: {} };
for (const file of ['scripture-surahs.js','scripture-quran-data.js','scripture-hadith-index.js']) vm.runInNewContext(read(file).toString(), context);
const { SURAHS, QURAN, HADITH_INDEX } = context.window;
assert.equal(SURAHS.length, 114);
assert.equal(QURAN.verses.length, 114);
assert.equal(QURAN.verses.reduce((n, a) => n + a.length, 0), 6236);
// Verify every English verse and its order against the pinned source snapshot.
for (let s=1; s<=114; s++) vm.runInNewContext(read(`scripture-en-${s}.js`).toString(), context);
const en = Array.from({length:114},(_,i)=>Array.from(context.window.EN_SURAHS[i+1]));
en.forEach((verses,i)=>assert.equal(verses.length,QURAN.counts[i],`English surah ${i+1}`));
assert.equal(crypto.createHash('sha256').update(JSON.stringify(en)).digest('hex'),'5dcc56b64294142cc23e7b78e115f7e0ce076f0fe5195e6ad587c63d71fb043b');
for (let i=1; i<=114; i++) for (const group of ['bn','tafsir','tafsir-ibn-kathir']) assert.ok(fs.existsSync(path.join(root, `scripture-${group}-${i}.js`)));
const manifest = JSON.parse(read('scripture-manifest.json'));
assert.equal(manifest.shards.length, 428);
assert.equal(manifest.total, 42469);
assert.equal(Object.keys(manifest.books).length, 9);
const totals = {}, seen = new Set();
for (const shard of manifest.shards) {
  const section = HADITH_INDEX.books[shard.book].sections.find(s => s.id === shard.section);
  assert.ok(section && section.count === shard.count, shard.file);
  assert.equal(shard.file, `scripture-hadith-${shard.book}-${shard.section}.json.gz`);
  assert.ok(!seen.has(shard.file)); seen.add(shard.file);
  const data = zlib.gunzipSync(read(shard.file));
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'), shard.sha256, shard.file);
  const rows = JSON.parse(data);
  assert.equal(rows.length, section.count);
  rows.forEach((row, i) => { assert.equal(row.length, 8); assert.equal(row[0], section.first + i, shard.file); });
  totals[shard.book] = (totals[shard.book] || 0) + rows.length;
}
for (const [book, total] of Object.entries(manifest.books)) {
  assert.equal(totals[book], total, book);
  assert.equal(HADITH_INDEX.books[book].total, total, book);
  for (const section of HADITH_INDEX.books[book].sections.filter(s => s.count)) assert.ok(seen.has(`scripture-hadith-${book}-${section.id}.json.gz`));
}
assert.ok(seen.has('scripture-hadith-muslim-0.json.gz'));
assert.ok(seen.has('scripture-hadith-ibnmajah-0.json.gz'));
console.log('scripture: 114 surahs, 6,236 verses and all 42,469 indexed hadith rows verified');
