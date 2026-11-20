#!/usr/bin/env node
/* DAWAH X — চ্যানেল লাইভ কি না, সেটি দেখা (GitHub Actions-এ চলে; দেখুন .github/workflows/live-status.yml)
   YouTube-এর "লাইভ" ঠিকানা (/channel/<id>/live) লাইভ থাকলে watch?v=<videoId>-তে পাঠিয়ে দেয়;
   লাইভ না থাকলে ২০০ দিয়ে চ্যানেলের পাতাই ফেরত দেয়। তাই redirect-ই মূল প্রমাণ — কোনো API key লাগে না।
   শিরোনাম নেওয়া হয় oEmbed থেকে (সাধারণ, বট-চেক ছাড়া চলে)।

   ফল: live.json  {"v":1,"updated":"…","live":[{"channelId","channel","id","title","since"}]}
   চ্যানেলের তালিকা: tools/video-channels.json (সেখানেই ছয়টি চ্যানেল আছে)

   ব্যবহার: node tools/live-status.cjs [--verbose]
*/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(__dirname, 'video-channels.json');
const OUT = path.join(ROOT, 'live.json');
const VERBOSE = process.argv.includes('--verbose');

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'bn,en;q=0.9', 'Cookie': 'CONSENT=YES+cb; SOCS=CAI' };
const ID_RE = /^[\w-]{11}$/;
const log = (...a) => { if (VERBOSE) console.log(...a); };

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, opts = {}) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, {
      headers: Object.assign({}, HEADERS, opts.headers || {}),
      redirect: opts.redirect || 'follow',
      signal: ctl.signal,
    });
    const text = (opts.body === true) ? await r.text() : '';
    return { status: r.status, location: r.headers.get('location') || '', ok: r.ok, text };
  } catch (e) {
    return { status: 0, location: '', ok: false, text: '', err: String(e && e.message || e) };
  } finally { clearTimeout(timer); }
}

/* redirect ছাড়া চ্যানেলের /live ঠিকানা — লাইভ থাকলে Location-এ watch?v=<id> */
async function liveIdOf(channel) {
  const targets = [];
  if (channel.channelId) targets.push('https://www.youtube.com/channel/' + channel.channelId + '/live?hl=en&gl=BD');
  if (channel.handle) targets.push('https://www.youtube.com/' + channel.handle.replace(/^@?/, '@') + '/live?hl=en&gl=BD');
  for (const url of targets) {
    const r = await get(url, { redirect: 'manual' });
    log('  ' + url + ' → ' + r.status + (r.location ? ' → ' + r.location.slice(0, 90) : '') + (r.err ? ' (' + r.err + ')' : ''));
    const m = /[?&]v=([\w-]{11})/.exec(r.location || '');
    if (r.status >= 300 && r.status < 400 && m && ID_RE.test(m[1])) return m[1];
    /* redirect না এলেও (কিছু নেটওয়ার্কে) লাইভ-চিহ্ন খোঁজা হয় */
    if (r.status === 200) {
      const body = await get(url, { body: true });
      const live = /"isLive"\s*:\s*true/.test(body.text) || /"isLiveBroadcast"\s*:\s*true/.test(body.text);
      const idm = /[?&]v=([\w-]{11})/.exec((body.text.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '');
      if (live && idm && ID_RE.test(idm[1])) return idm[1];
    }
    await sleep(200);
  }
  return '';
}

/* oEmbed শিরোনাম না দিলে (নতুন/কিছু লাইভ স্ট্রিমে হয়) ওয়াচ-পাতার og:title */
async function watchTitle(id) {
  const r = await get('https://www.youtube.com/watch?v=' + id, { body: true });
  if (r.status !== 200) return '';
  const m = /<meta property="og:title" content="([^"]*)"/.exec(r.text);
  return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() : '';
}

async function oembed(id) {
  const url = 'https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json';
  const r = await get(url, { body: true });
  if (r.status !== 200) return null;
  try {
    const j = JSON.parse(r.text);
    return { title: (j.title || '').trim(), author: (j.author_name || '').trim() };
  } catch (e) { return null; }
}

/* আগের live.json থেকে "কখন থেকে লাইভ" ধরে রাখা হয়, যাতে প্রতি রানে সময় বদলায় না */
function previous() {
  try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { return null; }
}

(async () => {
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const channels = (cfg.channels || []).filter(c => c.channelId);
  const before = previous();
  const wasLive = new Map(((before && before.live) || []).map(x => [x.channelId + '|' + x.id, x.since]));
  const found = [];
  const checked = [];

  for (const ch of channels) {
    const id = await liveIdOf(ch);
    checked.push(ch.title || ch.channelId);
    if (!id) continue;
    let meta = await oembed(id);
    if (meta && !meta.title) meta.title = await watchTitle(id);
    const since = wasLive.get(ch.channelId + '|' + id) || new Date().toISOString();
    found.push({
      channelId: ch.channelId,
      channel: ch.title || (meta && meta.author) || ch.channelId,
      id,
      title: (meta && meta.title) || '',
      since,
    });
    console.log('লাইভ: ' + (ch.title || ch.channelId) + ' → ' + id + ' · ' + ((meta && meta.title) || '(শিরোনাম নেই)'));
    await sleep(300);
  }

  const out = { v: 1, updated: new Date().toISOString(), checked, live: found };
  const text = JSON.stringify(out) + '\n';
  let old = '';
  try { old = fs.readFileSync(OUT, 'utf8'); } catch (e) {}
  /* updated বাদ দিয়ে তুলনা: লাইভ-তালিকা না বদলালে কমিট হবে না */
  const slim = o => JSON.stringify({ live: o.live });
  if (old && slim(JSON.parse(old)) === slim(out)) {
    console.log('লাইভ-তালিকা অপরিবর্তিত (' + found.length + 'টি)');
    return;
  }
  fs.writeFileSync(OUT, text);
  console.log('live.json লেখা হলো · লাইভ ' + found.length + 'টি · দেখা হয়েছে ' + checked.length + 'টি চ্যানেল');
})().catch(e => { console.error(e); process.exit(1); });
