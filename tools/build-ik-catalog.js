#!/usr/bin/env node
/* DAWAH X — মাসিক আল-ইখলাছের (ik) লেখাগুলোকে সূচিতে (catalog) যোগ করে।
   imported texts/ থেকে s:"ik" রেকর্ড পড়ে দুইটি chunk ফাইল বানায় —
     · questions-catalog-part-03.js   (যে বিভাগের শিরোনামগুলো «প্রশ্ন…»)
     · fatwa-catalog-part-05.js      (বাকি লেখা ও প্রবন্ধ)
   তারপর app.js-এর QUESTION_PARTS / FATWA_PARTS-এ count হালনাগাদ করে,
   আর build-stats.cjs সংখ্যা মিলিয়ে নেয়।  চালানো: node tools/build-ik-catalog.js  (--dry) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), TEXTS = path.join(ROOT, 'texts');
const DRY = process.argv.includes('--dry');
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, 'ik-ids.json'), 'utf8'));

/* প্রতিটি লেখা: url → { cat } (ik-ids.json-এর বিভাগ) */
const catOf = url => {
  const m = /article_details\/(\d+)/.exec(url || '');
  const row = m && IDS.ids && IDS.ids[m[1]];
  return row ? String(row.cat || '') : '';
};

const rows = [];
for (const f of fs.readdirSync(TEXTS)) {
  if (!/^[0-9a-f]{3}\.json$/.test(f)) continue;
  const bucket = JSON.parse(fs.readFileSync(path.join(TEXTS, f), 'utf8'));
  for (const key in bucket) {
    const r = bucket[key];
    if (!r || r.s !== 'ik' || !r.u || !r.t) continue;
    rows.push({ key, url: r.u, title: r.t, cat: catOf(r.u) });
  }
}
rows.sort((a, b) => a.title.localeCompare(b.title, 'bn'));

/* বিভাগ ধরে ধরে দেখা: শিরোনামের বেশিরভাগ «প্রশ্ন…» হলে সেটি প্রশ্নোত্তর */
const byCat = new Map();
for (const r of rows) {
  const c = byCat.get(r.cat) || { n: 0, q: 0, sample: [] };
  c.n++;
  if (/^\s*প্রশ্ন/.test(r.title)) c.q++;
  if (c.sample.length < 3) c.sample.push(r.title.slice(0, 48));
  byCat.set(r.cat, c);
}
const qCats = new Set();
for (const [cat, c] of byCat) if (c.n >= 5 && c.q / c.n >= 0.7) qCats.add(cat);

const isQ = r => qCats.has(r.cat) || /^\s*প্রশ্ন/.test(r.title);
const qRows = rows.filter(isQ), fRows = rows.filter(r => !isQ(r));

console.log('মোট ik লেখা: ' + rows.length + ' · প্রশ্নোত্তর: ' + qRows.length + ' · ফতোয়া/প্রবন্ধ: ' + fRows.length);
for (const [cat, c] of [...byCat].sort((a, b) => b[1].n - a[1].n).slice(0, 12)) {
  console.log('  বিভাগ ' + (cat || '—') + ': ' + c.n + 'টি · প্রশ্ন-শিরোনাম ' + c.q + 'টি · ' + JSON.stringify(c.sample[0] || ''));
}
if (DRY) return;

const esc = v => JSON.stringify(String(v));
const write = (file, partsKey, groups) => {
  let out = 'window.' + partsKey + '=window.' + partsKey + '||{};\n';
  for (const [label, list] of groups) {
    if (!list.length) continue;
    out += 'window.' + partsKey + '[' + esc(label) + ']=[\n'
      + list.map(r => '[' + esc(label) + ',' + esc(r.title) + ',' + esc(r.url) + ']').join(',\n')
      + '\n];\n';
  }
  fs.writeFileSync(path.join(ROOT, file), out);
  console.log('লেখা হলো ' + file + ' (' + (Buffer.byteLength(out) / 1024).toFixed(0) + ' KB)');
};
write('questions-catalog-part-03.js', 'DAWAH_QUESTIONS_PARTS', [['মাসিক আল-ইখলাছ · প্রশ্নোত্তর', qRows]]);
write('fatwa-catalog-part-05.js', 'DAWAH_FATWAS_PARTS', [['মাসিক আল-ইখলাছ', fRows]]);

/* app.js-এর manifest-এ সংখ্যা বসানো */
const appPath = path.join(ROOT, 'app.js');
let src = fs.readFileSync(appPath, 'utf8');
const setEntry = (block, category, entry) => {
  const re = new RegExp('(\\{[^{}]*category:"' + category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^{}]*\\})');
  if (re.test(block)) return block.replace(re, entry);
  return block.replace(/(const (?:QUESTION|FATWA)_PARTS=\[\n)/, '$1 ' + entry + ',\n');
};
let qBlock = /const QUESTION_PARTS=\[[\s\S]*?\n\];/.exec(src)[0];
const fBlock = /const FATWA_PARTS=\[[\s\S]*?\n\];/.exec(src)[0];
const qNew = setEntry(qBlock, 'মাসিক আল-ইখলাছ · প্রশ্নোত্তর', '{category:"মাসিক আল-ইখলাছ · প্রশ্নোত্তর",src:"questions-catalog-part-03.js",count:' + qRows.length + '}');
const fNew = setEntry(fBlock, 'মাসিক আল-ইখলাছ', '{category:"মাসিক আল-ইখলাছ",src:"fatwa-catalog-part-05.js",count:' + fRows.length + '}');
src = src.replace(qBlock, qNew).replace(fBlock, fNew);
fs.writeFileSync(appPath, src);
console.log('app.js-এ সূচির সংখ্যা বসানো হলো');
