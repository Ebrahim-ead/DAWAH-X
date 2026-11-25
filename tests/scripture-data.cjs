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
