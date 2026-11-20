#!/usr/bin/env node
/* ডায়াগনস্টিক: চ্যানেলের পুরো তালিকা ও ভিডিওর সঠিক তারিখ কোন পথে পাওয়া যায়।
   ব্যবহার: node tools/probe-videos.cjs [channelId]   (ফল: tools/probe-report.txt + stdout)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CH = process.argv[2] || (() => {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'video-channels.json'), 'utf8'));
    const c = (cfg.channels || []).find(x => x.backfill && x.channelId);
    return c && c.channelId;
  } catch (e) { return ''; }
})() || 'UCc6cxJCSSaLxd4JE_GHxsEA';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const HEAD = { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', 'Cookie': 'CONSENT=YES+cb; SOCS=CAI' };
const out = [];
const say = line => { out.push(line); console.log(line); };
const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

async function get(url, opts = {}) {
  const t0 = Date.now();
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: Object.assign({}, HEAD, opts.headers || {}), method: opts.method || 'GET', body: opts.body, redirect: 'follow', signal: ctl.signal });
    const text = await r.text();
    return { ok: r.ok, status: r.status, text, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, text: '', ms: Date.now() - t0, err: e.message };
  } finally { clearTimeout(timer); }
}
const count = (text, re) => (text.match(re) || []).length;
const jsonAfter = (html, name) => {
  const at = html.indexOf('var ' + name + ' = ');
  const start = at >= 0 ? at + ('var ' + name + ' = ').length : html.indexOf('window["' + name + '"] = ');
  if (start < 0) return null;
  const from = html.indexOf('{', start);
  if (from < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = from; i < html.length; i++) {
    const c = html[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { try { return JSON.parse(html.slice(from, i + 1)); } catch (e) { return null; } }
  }
  return null;
};
const ID_RE = /^[\w-]{11}$/;

function collect(node, bag) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) collect(n, bag); return; }
  const lv = node.lockupViewModel;
  if (lv && ID_RE.test(lv.contentId || '')) bag.ids.push(lv.contentId);
  const vr = node.videoRenderer || node.gridVideoRenderer || node.playlistVideoRenderer;
  if (vr && ID_RE.test(vr.videoId || '')) bag.ids.push(vr.videoId);
  const cc = node.continuationCommand;
  if (cc && cc.token) bag.tokens.push(cc.token);
  for (const k in node) collect(node[k], bag);
}

(async () => {
  say('# probe ' + new Date().toISOString());
  say('channel: ' + CH);

  const page = await get('https://www.youtube.com/channel/' + CH + '/videos?hl=en&gl=US');
  say(`\n[page] ${page.status} ${page.ms}ms ${(page.text.length / 1024) | 0}KB · lockup ${count(page.text, /"lockupViewModel"/g)} · contentId ${count(page.text, /"contentId":"[\w-]{11}"/g)}`);
  const vc = page.text.match(/"videoCount"?\s*:\s*"?([\d,]+)"?/) || page.text.match(/"content":"([\d,K.]+ videos)"/);
  say('  declared video count: ' + (vc ? vc[1] : '(none found)'));
  const metaAt = page.text.indexOf('contentMetadataViewModel');
  if (metaAt > 0) say('  header meta: ' + clip(page.text.slice(metaAt, metaAt + 260), 240));

  const data = jsonAfter(page.text, 'ytInitialData');
  say('  ytInitialData parsed: ' + !!data);

  /* ধাপে ধাপে হাঁটা: প্রতি পাতায় কতটি, কোথায় থামে */
  const key = (/"INNERTUBE_API_KEY":"([^"]+)"/.exec(page.text) || [])[1] || '';
  const cv = (/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(page.text) || [])[1] || '2.20240101.00.00';
  const visitor = (/"VISITOR_DATA":"([^"]+)"/.exec(page.text) || [])[1] || '';
  say(`\n[walk] key ${key ? key.slice(0, 10) + '…' : '(none)'} · cv ${cv} · visitor ${visitor ? 'yes' : 'no'}`);
  const seen = new Set();
  const bag = { ids: [], tokens: [] };
  if (data) collect(data, bag);
  bag.ids.forEach(id => seen.add(id));
  let tokens = Array.from(new Set(bag.tokens)), used = new Set(), pages = 1, total = seen.size;
  say(`  page 1: ${bag.ids.length} ids (unique ${total}) · tokens ${tokens.length}`);
  const browseBody = token => JSON.stringify({
    context: { client: { clientName: 'WEB', clientVersion: cv, hl: 'en', gl: 'US', ...(visitor ? { visitorData: visitor } : {}) } },
    continuation: token,
  });
  let lastSnippet = '';
  while (tokens.length && pages < 40) {
    const token = tokens.shift();
    if (used.has(token)) continue;
    used.add(token);
    const r = await get('https://www.youtube.com/youtubei/v1/browse' + (key ? '?key=' + key : '') + '&prettyPrint=false', {
      method: 'POST', body: browseBody(token),
      headers: { 'Content-Type': 'application/json', 'X-YouTube-Client-Name': '1', 'X-YouTube-Client-Version': cv, 'Origin': 'https://www.youtube.com', ...(visitor ? { 'X-Goog-Visitor-Id': visitor } : {}) },
    });
    pages++;
    let items = [], newTokens = [];
    try {
      const d = JSON.parse(r.text);
      const b2 = { ids: [], tokens: [] };
      collect(d, b2);
      items = b2.ids; newTokens = b2.tokens;
      const msg = (r.text.match(/"message":\{"(?:simpleText|content)":"([^"]{0,120})"/) || [])[1];
      if (msg) lastSnippet = 'message: ' + msg;
    } catch (e) { lastSnippet = 'parse failed: ' + clip(r.text, 120); }
    const before = total;
    items.forEach(id => seen.add(id));
    total = seen.size;
    newTokens.forEach(t => { if (!used.has(t) && !tokens.includes(t)) tokens.push(t); });
    say(`  page ${pages}: ${r.status} ${r.ms}ms · ${items.length} ids · unique ${total} (+${total - before}) · tokens ${tokens.length}${lastSnippet ? ' · ' + lastSnippet : ''}`);
    if (!items.length && !newTokens.length) break;
    await new Promise(res => setTimeout(res, 150));
  }
  say(`  walk total: ${total} unique ids in ${pages} pages`);

  /* তারিখ: player API বনাম watch পাতা */
  const id = [...seen][0] || '';
  if (id) {
    const pb = JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: cv, hl: 'en', gl: 'US', ...(visitor ? { visitorData: visitor } : {}) } }, videoId: id, contentCheckOk: true, racyCheckOk: true });
    const pr = await get('https://www.youtube.com/youtubei/v1/player' + (key ? '?key=' + key : '') + '&prettyPrint=false', {
      method: 'POST', body: pb,
      headers: { 'Content-Type': 'application/json', 'X-YouTube-Client-Name': '1', 'X-YouTube-Client-Version': cv, 'Origin': 'https://www.youtube.com', ...(visitor ? { 'X-Goog-Visitor-Id': visitor } : {}) },
    });
    const ps = (pr.text.match(/"playabilityStatus":\{"status":"([A-Z_]+)"(?:,"reason":"([^"]{0,160})")?/) || []);
    const pd = (pr.text.match(/"publishDate":"([^"]+)"/) || [])[1] || '';
    say(`\n[player] ${id}: ${pr.status} ${pr.ms}ms ${(pr.text.length / 1024) | 0}KB · status ${ps[1] || '?'}${ps[2] ? ' (' + clip(ps[2], 90) + ')' : ''} · videoDetails ${/"videoDetails"/.test(pr.text)} · publishDate ${pd || '(none)'}`);

    const w = await get('https://www.youtube.com/watch?v=' + id + '&hl=en&gl=US');
    const wd = (w.text.match(/itemprop="datePublished"\s+content="([^"]+)"/) || [])[1] || (w.text.match(/"uploadDate":"([^"]+)"/) || [])[1] || '';
    say(`[watch] ${w.status} ${w.ms}ms ${(w.text.length / 1024) | 0}KB · datePublished ${wd || '(none)'} · botcheck ${/sign in to confirm|unusual traffic|not a robot/i.test(w.text)}`);
  }

  const feed = await get('https://www.youtube.com/feeds/videos.xml?channel_id=' + CH);
  say(`\n[rss] ${feed.status} ${feed.ms}ms · entry ${count(feed.text, /<entry>/g)}`);

  try { fs.writeFileSync(path.join(ROOT, 'tools', 'probe-report.txt'), out.join('\n') + '\n'); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
