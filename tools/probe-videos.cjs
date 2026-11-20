#!/usr/bin/env node
/* ডায়াগনস্টিক: কোন পথে চ্যানেলের পুরোনো ভিডিওর তালিকা পাওয়া যায় সেটি যাচাই করে।
   (স্ক্র্যাপিং, Innertube-এর ভিন্ন client, RSS, Invidious ও Piped — সবই চেষ্টা করে রিপোর্ট দেয়)
   ব্যবহার: node tools/probe-videos.cjs [channelId]
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

async function get(url, opts = {}) {
  const t0 = Date.now();
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: Object.assign({}, HEAD, opts.headers || {}), method: opts.method || 'GET', body: opts.body, redirect: 'follow', signal: ctl.signal });
    const text = await r.text();
    return { ok: r.ok, status: r.status, text, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, text: '', ms: Date.now() - t0, err: e.message };
  } finally { clearTimeout(timer); }
}
const count = (text, re) => (text.match(re) || []).length;

(async () => {
  say('# probe ' + new Date().toISOString());
  say('channel: ' + CH);

  /* ১) সাধারণ চ্যানেল পাতা */
  for (const url of [
    'https://www.youtube.com/channel/' + CH + '/videos?hl=en&gl=US',
    'https://www.youtube.com/channel/' + CH + '/videos?hl=en&gl=US&persist_hl=1&persist_gl=1&flow=grid',
  ]) {
    const r = await get(url);
    say(`\n[page] ${url.replace('https://www.youtube.com/channel/' + CH, '')} → ${r.status} ${r.ms}ms ${(r.text.length / 1024) | 0}KB`);
    say('  ytInitialData: ' + /ytInitialData/.test(r.text) + ' · videoRenderer: ' + count(r.text, /"videoRenderer"/g) +
      ' · richItemRenderer: ' + count(r.text, /"richItemRenderer"/g) + ' · continuationCommand: ' + count(r.text, /continuationCommand/g) +
      ' · consent: ' + /consent\.youtube\.com|Before you continue/.test(r.text) +
      ' · signin/bot: ' + /sign in to confirm|unusual traffic|not a robot/i.test(r.text));
    const alert = (r.text.match(/"alerts":\[.{0,160}/) || [])[0];
    if (alert) say('  alerts: ' + alert.replace(/\s+/g, ' ').slice(0, 150));
  }

  /* ২) RSS ফিড (নিশ্চিত কাজ করে) */
  const feed = await get('https://www.youtube.com/feeds/videos.xml?channel_id=' + CH);
  say(`\n[rss] ${feed.status} ${feed.ms}ms · entry: ${count(feed.text, /<entry>/g)}`);

  /* ৩) Innertube: চ্যানেলের uploads playlist (UU…) */
  const page = await get('https://www.youtube.com/channel/' + CH + '/videos?hl=en&gl=US');
  const key = (/"INNERTUBE_API_KEY":"([^"]+)"/.exec(page.text) || [])[1] || '';
  const cv = (/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(page.text) || [])[1] || '2.20240101.00.00';
  say('\n[innertube] key: ' + (key ? key.slice(0, 12) + '…' : '(none)') + ' · clientVersion: ' + cv);
  for (const client of [
    { clientName: 'WEB', clientVersion: cv },
    { clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 30 },
    { clientName: 'IOS', clientVersion: '19.09.3', deviceModel: 'iPhone14,3' },
  ]) {
    const body = JSON.stringify({
      context: { client: Object.assign({ hl: 'en', gl: 'US' }, client) },
      browseId: 'VLUU' + CH.slice(2),
    });
    const r = await get('https://www.youtube.com/youtubei/v1/browse' + (key ? '?key=' + key : '') + '&prettyPrint=false',
      { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'X-YouTube-Client-Name': '1', 'X-YouTube-Client-Version': client.clientVersion, 'Origin': 'https://www.youtube.com' } });
    say(`  ${client.clientName}: ${r.status} ${r.ms}ms · playlistVideoRenderer ${count(r.text, /"playlistVideoRenderer"/g)} · videoRenderer ${count(r.text, /"videoRenderer"/g)} · token ${count(r.text, /continuationCommand/g)}`);
  }

  /* ৪) Invidious ও Piped (YouTube নয়, তাই block হওয়ার কথা নয়) */
  for (const host of ['inv.nadeko.net', 'invidious.nerdvpn.de', 'yewtu.be', 'iv.melmac.space', 'invidious.f5.si']) {
    const r = await get('https://' + host + '/api/v1/channels/' + CH + '/videos?fields=videoId,title,published,author', { headers: { 'Accept': 'application/json' } });
    let n = 0, sample = '';
    try { const j = JSON.parse(r.text); n = (j.videos || []).length; sample = JSON.stringify((j.videos || [])[0] || {}).slice(0, 90); } catch (e) {}
    say(`[invidious] ${host}: ${r.status} ${r.ms}ms · ${n} videos ${sample}`);
  }
  for (const host of ['pipedapi.kavin.rocks', 'pipedapi.adminforge.de', 'api.piped.private.coffee']) {
    const r = await get('https://' + host + '/channel/' + CH, { headers: { 'Accept': 'application/json' } });
    let n = 0, sample = '', next = '';
    try { const j = JSON.parse(r.text); n = (j.relatedStreams || j.items || []).length; next = String(j.nextpage || '').slice(0, 20); sample = JSON.stringify((j.relatedStreams || j.items || [])[0] || {}).slice(0, 90); } catch (e) {}
    say(`[piped] ${host}: ${r.status} ${r.ms}ms · ${n} items · next ${next} ${sample}`);
  }

  try { fs.writeFileSync(path.join(ROOT, 'tools', 'probe-report.txt'), out.join('\n') + '\n'); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
