#!/usr/bin/env node
/* DAWAH X — ikhlasbd.com-এর গঠন দেখা (এক-বারের ডায়াগনস্টিক; ফল: tools/ik-probe-report.txt)
   প্রশ্ন: লেখা কোন অংশে, তারিখ/লেখক কোথায়, তালিকার পাতা কীভাবে এগোয় (pagination)। */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const out = [];
const say = (...a) => { const line = a.join(' '); out.push(line); console.log(line); };

async function get(url) {
  const t0 = Date.now();
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'bn,en;q=0.9' }, redirect: 'follow', signal: ctl.signal });
    const html = await r.text();
    return { status: r.status, final: r.url, html, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, html: '', ms: Date.now() - t0, err: String(e && e.message || e) };
  } finally { clearTimeout(timer); }
}

/* cheerio-র বদলে ছোট সহায়ক: নির্দিষ্ট class/id-এর ভেতরের লেখার দৈর্ঘ্য */
const textOf = h => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function blocks(html) {
  const rows = [];
  const re = /<(div|article|section|main|h1|h2|span|time)\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[2] || '';
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
    const id = (attrs.match(/id="([^"]*)"/) || [])[1] || '';
    if (!cls && !id && m[1].toLowerCase() !== 'h1') continue;
    /* ওই ট্যাগের ভেতরের টুকরো (পরের ৬০০০ অক্ষর) থেকে লেখা মাপা — সঠিক নয়, তবে আকার বোঝা যায় */
    const chunk = html.slice(re.lastIndex, re.lastIndex + 12000);
    rows.push({ tag: m[1].toLowerCase(), cls: cls.slice(0, 70), id: id.slice(0, 30), len: textOf(chunk).length });
  }
  return rows;
}

(async () => {
  say('# ikhlasbd probe ' + new Date().toISOString());

  /* ১) একটি লেখার পাতা */
  const art = await get('https://ikhlasbd.com/article_details/11619');
  say(`\n[article] ${art.status} ${art.ms}ms ${(art.html.length / 1024) | 0}KB final=${art.final}`);
  say('  title: ' + ((art.html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').trim().slice(0, 90));
  for (const meta of ['og:title', 'description', 'og:image', 'article:published_time']) {
    const v = (art.html.match(new RegExp('<meta[^>]+(?:property|name)="' + meta + '"[^>]+content="([^"]*)"')) || [])[1];
    if (v) say('  meta ' + meta + ': ' + v.slice(0, 90));
  }
  const h1s = [...art.html.matchAll(/<h1[^>]*>([\s\S]{0,160}?)<\/h1>/gi)].map(m => textOf(m[1]).slice(0, 80));
  say('  h1: ' + JSON.stringify(h1s.slice(0, 3)));
  const dates = [...art.html.matchAll(/([০-৯0-9]{1,2}\s+(?:জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর)\s*[০-৯0-9]{4})/g)].map(m => m[1]);
  say('  bangla dates: ' + JSON.stringify([...new Set(dates)].slice(0, 4)));
  const timeTags = [...art.html.matchAll(/<time[^>]*>([\s\S]{0,60}?)<\/time>/gi)].map(m => m[0].slice(0, 120));
  say('  time tags: ' + JSON.stringify(timeTags.slice(0, 3)));
  const classes = blocks(art.html).sort((a, b) => b.len - a.len).slice(0, 22);
  say('  biggest blocks (tag.class · text-length of the following 12k chars):');
  for (const b of classes) say(`    ${b.tag}.${b.cls}${b.id ? ' #' + b.id : ''} · ${b.len}`);
  /* সবচেয়ে বড় লেখার ব্লকের ভেতরের গঠন */
  const best = classes[0];
  if (best) {
    const at = art.html.indexOf('class="' + best.cls + '"');
    const snippet = art.html.slice(Math.max(0, at - 200), at + 2600);
    say('\n  snippet around the biggest block:');
    say('  ' + snippet.replace(/\s+/g, ' ').slice(0, 2400));
  }

  /* ২) তালিকা ও pagination */
  for (const url of ['https://ikhlasbd.com/category_archive/8', 'https://ikhlasbd.com/category_archive/8?page=2',
    'https://ikhlasbd.com/monthly_archive', 'https://ikhlasbd.com/category-list']) {
    const r = await get(url);
    const links = [...r.html.matchAll(/href="([^"]*(?:page|category_archive|article_details|monthly)[^"]*)"/g)].map(m => m[1]);
    const uniq = [...new Set(links)];
    say(`\n[list] ${url} → ${r.status} ${r.ms}ms ${(r.html.length / 1024) | 0}KB · links ${uniq.length}`);
    say('  sample: ' + JSON.stringify(uniq.slice(0, 12).map(u => u.slice(0, 70))));
    say('  article ids on page: ' + [...new Set([...r.html.matchAll(/article_details\/(\d+)/g)].map(m => m[1]))].length);
    const pager = uniq.filter(u => /page|\?p=|\/p\//.test(u)).slice(0, 10);
    if (pager.length) say('  pager-ish: ' + JSON.stringify(pager.map(u => u.slice(0, 60))));
  }

  /* ৩) sitemap */
  for (const url of ['https://ikhlasbd.com/sitemap.xml', 'https://ikhlasbd.com/robots.txt']) {
    const r = await get(url);
    say(`\n[sitemap] ${url} → ${r.status} ${r.ms}ms ${(r.html.length / 1024) | 0}KB`);
    say('  head: ' + r.html.slice(0, 500).replace(/\s+/g, ' '));
    const n = (r.html.match(/<loc>/g) || []).length;
    if (n) say('  loc count: ' + n);
  }

  fs.writeFileSync(path.join(__dirname, 'ik-probe-report.txt'), out.join('\n') + '\n');
})().catch(e => { console.error(e); process.exit(1); });
