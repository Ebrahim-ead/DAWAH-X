#!/usr/bin/env node
/* পুরোনো (পুরো) ভিডিও তালিকা একবারে নামানো — channel এর সব আপলোড।

   কেন আলাদা স্ক্রিপ্ট: tools/update-videos.cjs শুধু RSS ফিড দেখে (সর্বশেষ ১৫টি),
   তাই নতুন চ্যানেল যোগ করলে তার পুরোনো ৪ হাজার ভিডিও কখনো আসে না।
   এই স্ক্রিপ্ট channel এর "/videos" তালিকা ধরে ধরে (continuation token) সব
   videoId বের করে, তারপর প্রতিটির watch-তথ্য (youtubei player) থেকে
   শিরোনাম ও প্রকাশের তারিখ আনে — **কোনো API key লাগে না**।

   ব্যবহার:
     node tools/backfill-videos.cjs                     # সব backfill:true চ্যানেল
     node tools/backfill-videos.cjs --channel @attahreektv
     node tools/backfill-videos.cjs --limit 400         # এক রানে সর্বোচ্চ ৪০০টি নতুন
     node tools/backfill-videos.cjs --minutes 45        # সময়-বাজেট (ডিফল্ট ৫০)
     node tools/backfill-videos.cjs --dry

   আচরণ:
   - যেসব ভিডিও youtube-videos.json-এ আগেই আছে, সেগুলো বাদ যায় — তাই রান বারবার
     চালালে আবার শুরু থেকে ধরে, কিন্তু কাজ এগোয় (resume)। কোনো state ফাইল লাগে না।
   - `backfill` চিহ্নিত চ্যানেলের ভিডিওতে `addSince` ছাঁকনি খাটে না (পুরোটাই ইচ্ছা করে আনা)।
   - চ্যানেলের নাম/channelId ফাঁকা থাকলে চ্যানেলের পাতা থেকে বের করে
     tools/video-channels.json-এ লিখে রাখে (og:title, externalId)।
   - কিছু videoId-র তারিখ না পেলে publishedAt ফাঁকা রাখে (তালিকায় শেষে যায়) — মিথ্যা তারিখ লিখে না।
   - ব্যর্থ হলে রান জারি থাকে, বাকিগুলো আনে; শেষে যা যোগ হয়েছে তা কমিট করার জন্য লেখা থাকে।
*/
'use strict';
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const LIST = path.join(ROOT, 'youtube-videos.json');
const CONFIG = path.join(__dirname, 'video-channels.json');
const STATS = path.join(ROOT, 'stats.json');

const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const DRY = process.argv.includes('--dry');
/* --fill-dates: তালিকায় আগেই থাকা কিন্তু তারিখ-ফাঁকা সারিগুলোর তারিখ আবার খোঁজা */
const FILL = process.argv.includes('--fill-dates') || process.env.BACKFILL_FILL === '1';
/* ওয়ার্কফ্লো ইনপুট env দিয়ে আসে (bash-এ উদ্ধৃতি নিয়ে ঝামেলা এড়াতে) */
const ONLY = arg('channel', process.env.BACKFILL_CHANNEL || '');
const LIMIT = +(arg('limit', process.env.BACKFILL_LIMIT || 4000)) || 4000;
const MINUTES = +(arg('minutes', 50)) || 50;
const TAB = String(arg('tab', process.env.BACKFILL_TAB || 'videos'));
const DEADLINE = Date.now() + MINUTES * 60000;

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const UA_HEADER = 'Mozilla/5.0 (X11; Linux x86_64) DAWAH-X backfill';
const HEADERS = {
  'User-Agent': UA,
  'Accept-Language': 'en-US,en;q=0.9',
  'Cookie': 'CONSENT=YES+cb; SOCS=CAI',
};
const ID_RE = /^[\w-]{11}$/, CH_RE = /^UC[\w-]{22}$/;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const warn = m => console.log('::warning::' + String(m).replace(/\r?\n/g, ' '));
const left = () => DEADLINE - Date.now();
/* ছোট pool: একসাথে কয়েকটি অনুরোধ (YouTube ধীরে উত্তর দেয়, একটার পর একটা করলে সময় বহুগুণ লাগে) */
async function pool(items, size, worker) {
  let at = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (at < items.length) {
      const item = items[at++];
      try { await worker(item); } catch (e) { warn('  ব্যর্থ: ' + (item && item.id || '') + ' → ' + e.message); }
      await sleep(40);
    }
  });
  await Promise.all(runners);
}

async function req(url, opts = {}, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    if (i) await sleep(1200 * i);
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000);
    try {
      const r = await fetch(url, { headers: Object.assign({}, HEADERS, opts.headers || {}), method: opts.method || 'GET', body: opts.body, signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch (e) { last = e; } finally { clearTimeout(timer); }
  }
  throw new Error(url.replace(/\?.*/, '') + ' → ' + (last && last.message || last));
}

/* পৃষ্ঠার ভেতরের বড় JSON অবজেক্ট (bracket গুনে) */
function jsonAfter(text, marker) {
  const at = text.indexOf(marker);
  if (at < 0) return null;
  const start = text.indexOf('{', at);
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (!depth) { try { return JSON.parse(text.slice(start, i + 1)); } catch (e) { return null; } } }
  }
  return null;
}
const cfgValue = (html, key) => {
  const m = new RegExp('"' + key + '":"([^"]+)"').exec(html);
  return m ? m[1] : '';
};

/* ytInitialData / browse-উত্তর থেকে যেকোনো গভীরতায় videoRenderer খুঁজে বের করা */
function collectVideos(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) collectVideos(n, out); return; }
  const vr = node.videoRenderer || node.gridVideoRenderer || node.playlistVideoRenderer;
  if (vr && vr.videoId && ID_RE.test(vr.videoId)) out.push(vr);
  /* ২০২৫-এর কাঠামো: richItemRenderer > content > lockupViewModel (contentId-ই videoId) */
  const lv = node.lockupViewModel;
  if (lv && ID_RE.test(lv.contentId || '') && !/PLAYLIST|CHANNEL|ALBUM/.test(String(lv.contentType || ''))) out.push(lv);
  for (const k in node) collectVideos(node[k], out);
}
/* শুধু গ্রিডের (richGridRenderer) ভেতরের token — উপরের সারি/সার্চ-বাক্সের token ধরে হাঁটলে
   একই পাতা বারবার আসে আর ১২০টি ভিডিওর পর হাঁটা আটকে যায় (রিপোর্টে দেখা গেছে)। */
function collectGridTokens(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) collectGridTokens(n, out); return; }
  const grid = node.richGridRenderer || node.gridRenderer;
  if (grid) { collectTokens(grid, out); return; }
  for (const k in node) collectGridTokens(node[k], out);
}
/* browse উত্তরে নতুন পাতা আসে appendContinuationItemsAction-এ; ওখানে পরের token থাকে
   continuationItemRenderer-এ — তাই শুধু সেগুলোই নেওয়া হয়। */
function collectMoreTokens(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) collectMoreTokens(n, out); return; }
  if (node.continuationItemRenderer) collectTokens(node.continuationItemRenderer, out);
  for (const k in node) collectMoreTokens(node[k], out);
}
function collectTokens(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) collectTokens(n, out); return; }
  const cmd = node.continuationCommand || (node.continuationEndpoint && node.continuationEndpoint.continuationCommand);
  if (cmd && cmd.token) out.push(cmd.token);
  for (const k in node) collectTokens(node[k], out);
}
const titleOf = vr => {
  if (vr.title && vr.title.runs) return vr.title.runs.map(r => r.text).join('');
  if (vr.title && vr.title.simpleText) return vr.title.simpleText;
  const lv = vr.metadata && vr.metadata.lockupMetadataViewModel;
  if (lv && lv.title) return lv.title.content || (lv.title.runs || []).map(r => r.text).join('') || '';
  return '';
};
const idOf = vr => vr.videoId || vr.contentId || '';

/* চ্যানেলের পাতা: channelId, নাম, innertube key, প্রথম ধাপের তালিকা */
async function openChannel(channel) {
  const url = channel.channelId && CH_RE.test(channel.channelId)
    ? 'https://www.youtube.com/channel/' + channel.channelId + '/' + TAB + '?hl=en&gl=US'
    : 'https://www.youtube.com/' + (channel.handle || '') + '/' + TAB + '?hl=en&gl=US';
  const html = await req(url);
  const id = CH_RE.test(channel.channelId || '') ? channel.channelId
    : (/"(?:externalId|channelId)":"(UC[\w-]{22})"/.exec(html) || [])[1] || '';
  if (!CH_RE.test(id)) throw new Error('channelId পাওয়া যায়নি');
  const ogTitle = (/<meta property="og:title" content="([^"]+)"/.exec(html) || [])[1] || '';
  const data = jsonAfter(html, 'ytInitialData');
  if (!data) throw new Error('ytInitialData নেই (পাতার কাঠামো বদলেছে?)');
  const items = []; collectVideos(data, items);
  const tokens = []; collectGridTokens(data, tokens);
  if (!tokens.length) collectMoreTokens(data, tokens);
  return {
    id,
    title: ogTitle.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
    key: cfgValue(html, 'INNERTUBE_API_KEY'),
    clientVersion: cfgValue(html, 'INNERTUBE_CLIENT_VERSION') || '2.20240101.00.00',
    visitor: cfgValue(html, 'VISITOR_DATA'),
    items, tokens: Array.from(new Set(tokens)),
  };
}

async function browse(ch, token) {
  const body = JSON.stringify({
    context: { client: { clientName: 'WEB', clientVersion: ch.clientVersion, hl: 'en', gl: 'US', ...(ch.visitor ? { visitorData: ch.visitor } : {}) } },
    continuation: token,
  });
  const url = 'https://www.youtube.com/youtubei/v1/browse' + (ch.key ? '?key=' + ch.key : '') + '&prettyPrint=false';
  const txt = await req(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'X-YouTube-Client-Name': '1', 'X-YouTube-Client-Version': ch.clientVersion, 'Origin': 'https://www.youtube.com' } });
  const data = JSON.parse(txt);
  const items = []; collectVideos(data, items);
  const tokens = []; collectGridTokens(data, tokens);
  if (!tokens.length) collectMoreTokens(data, tokens);
  return { items, tokens };
}

/* চ্যানেলের পুরো তালিকা yt-dlp-এর ফ্ল্যাট মোডে — শিরোনামসহ, ধাপে ধাপে হাঁটার দরকার নেই।
   (GitHub রানার থেকে youtubei player/watch "Sign in to confirm you're not a bot" দেয়, কিন্তু
   ফ্ল্যাট তালিকা ঠিকঠাক আসে — ২,০৬৩টি ভিডিওর আইডি মিলেছে।) */
function ytdlpList(url) {
  try {
    const txt = execFileSync('yt-dlp', ['--no-warnings', '--ignore-errors', '--flat-playlist', '--print', '%(id)s\t%(title)s', url],
      { encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 96 * 1024 * 1024 });
    return txt.split('\n').filter(Boolean).map(line => {
      const at = line.indexOf('\t');
      const id = (at < 0 ? line : line.slice(0, at)).trim();
      const title = at < 0 ? '' : line.slice(at + 1).trim();
      return { id, title: title === 'NA' ? '' : title };
    }).filter(x => ID_RE.test(x.id));
  } catch (e) {
    warn('  yt-dlp ব্যর্থ: ' + String((e && e.message) || e).split('\n')[0].slice(0, 160));
    return [];
  }
}

/* প্রকাশের সঠিক তারিখ: Return YouTube Dislike API-র dateCreated (কোনো key লাগে না) */
/* ব্যাচে ৫০টি করে সঠিক প্রকাশের তারিখ — YouTube Data API-র প্রতিলিপি, key ছাড়া।
   (একই অনুরোধে ৫০টি ভিডিও, তাই ৪ হাজার ভিডিও ৮০টি অনুরোধেই শেষ) */
async function lemnosDates(ids) {
  const found = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    for (const base of ['https://yt.lemnoslife.com/noKey/videos', 'https://yt.lemnoslife.com/videos']) {
      try {
        const r = await fetch(base + '?part=snippet&id=' + chunk.join(','), { headers: { 'Accept': 'application/json', 'User-Agent': UA_HEADER } });
        if (!r.ok) continue;
        const j = await r.json();
        for (const it of (j && j.items) || []) {
          const iso = it && it.snippet && it.snippet.publishedAt;
          const t = iso ? Date.parse(iso) : NaN;
          if (it.id && !Number.isNaN(t)) found.set(it.id, new Date(t).toISOString());
        }
        if (found.size) break;
      } catch (e) { /* পরের base চেষ্টা */ }
    }
  }
  return found;
}

/* এই রানের শুরুর দিকে পাওয়া dateCreated মানে RYD-র নিজের রেকর্ড তৈরি হয়েছে এখনই —
   ভিডিওর প্রকাশের তারিখ নয়। এমন মান বাদ দেওয়া হয়। */
const RUN_START = Date.now() - 15 * 60000;
const rydStats = { ok: 0, miss: 0, suspect: 0, err: 0 };
async function rydDate(id) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('https://returnyoutubedislikeapi.com/votes?videoId=' + encodeURIComponent(id),
        { headers: { 'Accept': 'application/json', 'User-Agent': UA_HEADER } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j && j.dateCreated) {
        const t = Date.parse(j.dateCreated);
        if (!Number.isNaN(t)) {
          if (t >= RUN_START && t <= Date.now() + 60000) { rydStats.suspect++; return ''; }
          rydStats.ok++; return new Date(t).toISOString();
        }
      }
      rydStats.miss++;
      return '';
    } catch (e) { if (i === 2) { rydStats.err++; return ''; } await sleep(1500 * (i + 1)); }
  }
  return '';
}

/* এক videoId-র শিরোনাম ও প্রকাশের তারিখ (youtubei player) — বট-চেকের কারণে রানারে সাধারণত ব্যর্থ */
async function videoInfo(ch, id) {
  const body = JSON.stringify({
    context: { client: { clientName: 'WEB', clientVersion: ch.clientVersion, hl: 'en', gl: 'US', ...(ch.visitor ? { visitorData: ch.visitor } : {}) } },
    videoId: id,
  });
  const url = 'https://www.youtube.com/youtubei/v1/player' + (ch.key ? '?key=' + ch.key : '') + '&prettyPrint=false';
  const txt = await req(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'X-YouTube-Client-Name': '1', 'X-YouTube-Client-Version': ch.clientVersion, 'Origin': 'https://www.youtube.com' } }, 2);
  const d = JSON.parse(txt);
  const vd = d.videoDetails || {};
  const mf = (d.microformat && d.microformat.playerMicroformatRenderer) || {};
  const date = mf.publishDate || (mf.liveBroadcastDetails && mf.liveBroadcastDetails.publishDate) || '';
  return { title: vd.title || '', date, channelId: vd.channelId || '', author: vd.author || '' };
}

/* thumbnail সব সারির জন্য একই নিয়মে id থেকে তৈরি হয় (youtube-gallery.js: thumbUrl) — JSON-এ রাখা
   বাড়তি ৫০ বাইট × হাজার হাজার সারি। লেখার সময়েই মুছে দেওয়া হয়, তাই তালিকা নিজে থেকেই হালকা হয়। */
function compact(videos) {
  for (const v of videos) {
    if (v.thumbnail && v.thumbnail === 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg') delete v.thumbnail;
  }
}

(async () => {
  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const videos = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  if (!Array.isArray(videos) || videos.length < 1000) throw new Error('youtube-videos.json ঠিক নেই');
  const known = new Set(videos.map(v => v.id));
  const targets = (config.channels || []).filter(c => c.backfill || ONLY)
    .filter(c => !ONLY || (c.handle === ONLY || c.channelId === ONLY || c.title === ONLY));
  if (!targets.length) { console.log('backfill করার মতো চ্যানেল নেই (video-channels.json-এ "backfill": true দিন)।'); return; }

  const fresh = [];
  let configChanged = false;

  for (const channel of targets) {
    if (left() < 90000) { warn('সময় শেষের দিকে — বাকি চ্যানেল পরের রানে।'); break; }
    console.log('\n=== ' + (channel.title || channel.handle || channel.channelId));
    let ch;
    try {
      ch = await openChannel(channel);
    } catch (e) { warn('চ্যানেল খোলা যায়নি: ' + e.message); continue; }
    if (!channel.channelId || channel.channelId !== ch.id) { channel.channelId = ch.id; configChanged = true; }
    if (!channel.title && ch.title) { channel.title = ch.title; configChanged = true; }
    const label = channel.title || ch.title || ch.id;
    console.log('  channelId ' + ch.id + ' · ' + label);

    /* ধাপ ১: পুরো তালিকা (yt-dlp), না পেলে নিজের হাঁটা */
    const channelUrl = 'https://www.youtube.com/channel/' + ch.id + '/' + TAB + '?hl=en&gl=US';
    let ids = ytdlpList(channelUrl);
    if (!ids.length) ids = ytdlpList('https://www.youtube.com/' + (channel.handle || 'channel/' + ch.id) + '/' + TAB);
    if (ids.length) {
      console.log('  yt-dlp: ' + ids.length + 'টি videoId');
    } else {
      console.log('  yt-dlp নেই/ব্যর্থ — নিজের হাঁটায় যাচ্ছি');
      const seen = new Set();
      const push = vr => { const id = idOf(vr); if (ID_RE.test(id) && !seen.has(id)) { seen.add(id); ids.push({ id, title: titleOf(vr) }); } };
      ch.items.forEach(push);
      let tokens = ch.tokens.slice();
      const used = new Set();
      let pages = 1, bar = 0;
      while (tokens.length && left() > 60000 && pages < 600) {
        const token = tokens.shift();
        if (used.has(token)) continue;
        used.add(token);
        let res;
        try { res = await browse(ch, token); } catch (e) { warn('  তালিকার ধাপ ব্যর্থ: ' + e.message); continue; }
        pages++;
        const before = ids.length;
        res.items.forEach(push);
        for (const t of res.tokens) if (!used.has(t) && !tokens.includes(t)) tokens.push(t);
        if (pages % 10 === 0) console.log('  ' + pages + ' ধাপ · ' + ids.length + 'টি videoId');
        bar = ids.length === before ? bar + 1 : 0;
        if (bar >= 2) break;
        await sleep(120);
      }
      console.log('  নিজের হাঁটা: ' + ids.length + 'টি videoId (' + pages + ' ধাপ)');
    }

    /* ধাপ ২: যেগুলো তালিকায় নেই, তাদের প্রকাশের তারিখ */
    const todo = ids.filter(x => !known.has(x.id));
    console.log('  নতুন ' + todo.length + 'টি · তালিকায় আগেই আছে ' + (ids.length - todo.length) + 'টি');
    const batch = todo.slice(0, Math.max(0, Math.min(todo.length, LIMIT - fresh.length)));
    const dates = batch.length ? await lemnosDates(batch.map(x => x.id)) : new Map();
    console.log('  ব্যাচ-তারিখ: ' + dates.size + '/' + batch.length);
    const startedAt = Date.now();
    let added = 0, failed = 0;
    await pool(batch, 3, async it => {
      if (left() < 45000) return;
      let iso = dates.get(it.id) || '';
      if (!iso) { try { iso = await rydDate(it.id); } catch (e) { failed++; } }
      if (!iso) failed++;
      const t = iso ? Date.parse(iso) : NaN;
      fresh.push({
        id: it.id,
        title: it.title || '',
        channelTitle: label,
        publishedAt: iso,
        time: Number.isNaN(t) ? 0 : t,
      });
      known.add(it.id);
      added++;
      if (added % 200 === 0) {
        const per = (Date.now() - startedAt) / added;
        console.log('  +' + added + '/' + batch.length + ' · ' + Math.round(left() / 1000) + 's বাকি · আনুমানিক ' +
          Math.round(per * (batch.length - added) / 1000) + 's');
      }
    });
    console.log('  যোগ হবে ' + fresh.filter(v => v.channelTitle === label).length + 'টি' + (failed ? ' · তারিখ মেলেনি ' + failed + 'টি' : ''));
  }

  /* ধাপ ৩ (ঐচ্ছিক): আগে থেকেই থাকা তারিখ-ফাঁকা সারি — আবার চেষ্টা */
  let filled = 0;
  if (FILL && left() > 60000) {
    const labels = new Set(targets.map(c => c.title).filter(Boolean));
    const blank = videos.filter(v => !v.publishedAt && (labels.size === 0 || labels.has(v.channelTitle) || v.channelTitle === 'Al-Itisam TV' || v.channelTitle === 'Attahreek TV'));
    console.log('\n=== তারিখ পূরণ · ফাঁকা ' + blank.length + 'টি');
    const fillDates = blank.length ? await lemnosDates(blank.map(v => v.id)) : new Map();
    console.log('  ব্যাচ-তারিখ: ' + fillDates.size + '/' + blank.length);
    const startedFill = Date.now();
    await pool(blank, 3, async v => {
      if (left() < 45000) return;
      const iso = fillDates.get(v.id) || await rydDate(v.id);
      if (!iso) return;
      v.publishedAt = iso;
      filled++;
      if (filled % 200 === 0) console.log('  পূরণ ' + filled + '/' + blank.length + ' · ' + Math.round(left() / 1000) + 's বাকি · ' +
        Math.round((Date.now() - startedFill) / filled * (blank.length - filled) / 1000) + 's আনুমানিক');
    });
    console.log('  পূরণ হলো ' + filled + 'টি');
  }
  console.log('  RYD: পাওয়া ' + rydStats.ok + ' · এন্ট্রি নেই ' + rydStats.miss + ' · সন্দেহজনক (আজকের) ' + rydStats.suspect + ' · এরর ' + rydStats.err);

  console.log('\nযোগ হবে মোট ' + fresh.length + 'টি · এখন তালিকায় ' + videos.length + 'টি' + (DRY ? ' (dry run)' : ''));
  if (DRY || !fresh.length) return;

  /* নতুন → পুরোনো ক্রমে ঢোকানো (তারিখ না থাকলে শেষে) */
  fresh.sort((a, b) => (b.time || 0) - (a.time || 0));
  for (const v of fresh.reverse()) {
    const rec = { id: v.id, title: v.title, channelTitle: v.channelTitle, publishedAt: v.publishedAt };
    let at = 0;
    while (at < videos.length && videos[at].publishedAt && Date.parse(videos[at].publishedAt) > (v.time || 0)) at++;
    videos.splice(at, 0, rec);
  }
  /* তারিখ-পূরণের পরে আবার ক্রম (তারিখহীন শেষে, নিজেদের ক্রম অটুট) */
  const order = new Map(videos.map((v, i) => [v, i]));
  videos.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return (tb || 0) - (ta || 0) || order.get(a) - order.get(b);
  });
  compact(videos);
  fs.writeFileSync(LIST, JSON.stringify(videos));
  if (configChanged) fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');

  let stats = null;
  try { stats = JSON.parse(fs.readFileSync(STATS, 'utf8')); } catch (e) {}
  if (!stats || stats.videos !== videos.length) {
    stats = Object.assign({}, stats, { videos: videos.length });
    fs.writeFileSync(STATS, JSON.stringify(stats) + '\n');
  }
  console.log('লেখা হলো · মোট ' + videos.length + 'টি ভিডিও');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'added=' + fresh.length + '\n');
})().catch(e => { console.error(e); process.exit(1); });
