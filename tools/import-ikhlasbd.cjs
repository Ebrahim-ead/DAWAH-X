#!/usr/bin/env node
/* DAWAH X — মাসিক আল-ইখলাছ (ikhlasbd.com) থেকে লেখা ও ফতোয়া আমদানি
   ধরন: texts/<bucket>.json-এ একই রেকর্ড (u,s,c,t,l,d,a,h) — সাইটের পাঠক, সার্চ ও শেয়ার ঠিক আগের মতোই কাজ করে।

   ধাপ:
     1) --discover   প্রতিটি বিভাগের তালিকা (category_archive) ও সংখ্যা (monthly_archive) পড়ে সব article ID জোগাড় করে
                     tools/ik-ids.json-এ রাখে (নতুন আইডি এলে সেটিই বাৎচের ভিত্তি)।
     2) (স্বাভাবিক)  যে আইডি আগে আনা হয়নি, শুধু সেগুলোর পাতা আনে → লেখা ছেঁটে texts/-এ রাখে।
     3) --probe N    ১ম Nটি লেখার কাঠামো/নমুনা দেখায় (নতুন উৎস যাচাইয়ের জন্য)।

   ব্যবহার:
     node tools/import-ikhlasbd.cjs --discover
     node tools/import-ikhlasbd.cjs --limit 300 --minutes 45
*/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'texts');
const IDS = path.join(__dirname, 'ik-ids.json');
const HOST = 'https://ikhlasbd.com';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SOURCE = 'ik';
const LABEL = 'মাসিক আল-ইখলাছ';       /* সাইটের উৎস-নাম (app.js-এর TEXT_SOURCES-এ একই কোড) */

const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const DISCOVER = process.argv.includes('--discover');
const PROBE = +(arg('probe', 0)) || 0;
const LIMIT = +(arg('limit', 0)) || 0;
const MINUTES = +(arg('minutes', 40)) || 40;
const DEADLINE = Date.now() + MINUTES * 60000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

async function get(url) {
  for (let i = 0; i < 3; i++) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'bn,en;q=0.9' }, redirect: 'follow', signal: ctl.signal });
      const html = r.ok ? await r.text() : '';
      if (r.ok) return { status: r.status, html, final: r.url };
      if (r.status === 404) return { status: 404, html: '', final: r.url };
      await sleep(1200 * (i + 1));
    } catch (e) {
      await sleep(1200 * (i + 1));
    } finally { clearTimeout(timer); }
  }
  return { status: 0, html: '', final: url };
}

/* app.js-এর textKey() — হুবহু এক হতে হবে */
const keyOfUrl = u => {
  try { u = decodeURI(u); } catch (e) {}
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < u.length; i++) { const c = u.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
};
const bucketOf = k => k.slice(-3);

/* ---------------- ধাপ ১: তালিকা থেকে আইডি ---------------- */
function idsIn(html) {
  const out = new Set();
  for (const m of html.matchAll(/article_details\/(\d+)/g)) out.add(m[1]);
  return out;
}

async function discover() {
  const prev = fs.existsSync(IDS) ? JSON.parse(fs.readFileSync(IDS, 'utf8')) : { v: 1, cats: {}, ids: {} };
  const cat = await get(HOST + '/category_archive/8');
  const catIds = [...new Set([...cat.html.matchAll(/category_archive\/(\d+)/g)].map(m => m[1]))].sort((a, b) => a - b);
  log('বিভাগ: ' + catIds.join(', '));

  const all = new Map(Object.entries(prev.ids || {}));
  const stats = {};
  for (const id of catIds) {
    const r = await get(HOST + '/category_archive/' + id);
    const found = idsIn(r.html);
    let added = 0;
    for (const a of found) if (!all.has(a)) { all.set(a, { c: '', cat: +id }); added++; }
    for (const a of found) if (all.has(a) && !all.get(a).cat) all.get(a).cat = +id;
    stats[id] = { page: r.status, found: found.size, added };
    log('  বিভাগ ' + id + ': ' + r.status + ' · ' + found.size + 'টি লেখা · নতুন ' + added);
    await sleep(400);
  }
  /* সংখ্যা-ভিত্তিক তালিকা (যে লেখা কোনো বিভাগে নেই) */
  const monthly = await get(HOST + '/monthly_archive');
  const issues = [...new Set([...monthly.html.matchAll(/monthly_archive\/(\d+)/g)].map(m => m[1]))];
  log('সংখ্যা: ' + issues.length);
  for (const n of issues) {
    const r = await get(HOST + '/monthly_archive/' + n);
    const found = idsIn(r.html);
    let added = 0;
    for (const a of found) if (!all.has(a)) { all.set(a, { c: '', issue: +n }); added++; }
    if (added) log('  সংখ্যা ' + n + ': নতুন ' + added);
    await sleep(300);
    if (Date.now() > DEADLINE) { log('  (সময় শেষ — বাকি সংখ্যা পরের বার)'); break; }
  }

  const ids = Array.from(all.keys()).sort((a, b) => +a - +b);
  fs.writeFileSync(IDS, JSON.stringify({ v: 1, updated: new Date().toISOString(), cats: catIds, stats, ids: Object.fromEntries(ids.map(i => [i, all.get(i)])) }) + '\n');
  log('\nমোট আইডি: ' + ids.length + ' · নতুন যোগ: ' + (ids.length - Object.keys(prev.ids || {}).length));
}

/* ---------------- ধাপ ২: লেখা পড়া ---------------- */
let cheerio;
function loadCheerio() {
  if (!cheerio) cheerio = require('cheerio');
  return cheerio;
}

function textLen(h) { return String(h).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().length; }

/* বাংলা সংখ্যা/তারিখ → ইংরেজি ISO (জানা না থাকলে ফাঁকা) */
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const bnToEn = s => String(s).replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
function isoDate(text) {
  const t = bnToEn(text);
  const m = new RegExp('(\\d{1,2})\\s*(?:' + BN_MONTHS.join('|') + ')\\s*,?\\s*(\\d{4})').exec(t) ||
    /(\d{1,2})\s*([A-Za-z]{3,9})\s*,?\s*(\d{4})/.exec(t);
  if (!m) return '';
  const mon = BN_MONTHS.indexOf(m[2]) >= 0 ? BN_MONTHS.indexOf(m[2]) + 1 : ('janfebmaraprmayjunjulaugsepoctnovdec'.indexOf(m[2].slice(0, 3).toLowerCase()) / 3 + 1);
  if (!mon) return '';
  return m[3] + '-' + String(mon).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
}

function clean($, root) {
  root.find('script,style,noscript,iframe,ins,.adsbygoogle,nav,.share-bar,.social-share,.sharing,.fb-comments,#fb-root,.comments-area,.comment-box,.related-posts,.related-articles,.newsletter,.pagination,.advertisement,.ads').remove();
  root.find('a[href]').each((i, a) => {
    const href = $(a).attr('href') || '';
    if (href && !/^(https?:|mailto:|tel:|#)/.test(href)) $(a).attr('href', new URL(href, HOST).href);
  });
  root.find('img[src]').each((i, img) => {
    const src = $(img).attr('src') || '';
    if (src && !/^https?:/.test(src)) $(img).attr('src', new URL(src, HOST).href);
    $(img).removeAttr('srcset').removeAttr('sizes').attr('loading', 'lazy').attr('decoding', 'async');
  });
  let html = root.html() || '';
  html = html.replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, '').replace(/\s{2,}/g, ' ').trim();
  return html;
}

function extract(html) {
  const $ = loadCheerio().load(html);
  $('#fb-root,script,style,noscript').remove();

  const body = $('.article-details').first();
  if (!body.length) return { error: 'no .article-details container', title: ($('title').text() || '').slice(0, 60) };

  /* শিরোনাম: লেখার অংশের ভেতরের/আগের h1, নইলে og:title */
  let title = ($('.article-details h1').first().length ? $('.article-details h1').first() : $('h1').first()).text().replace(/\s+/g, ' ').trim();
  if (!title) title = ($('meta[property="og:title"]').attr('content') || '').replace(/,\s*[^,]*?\d{4}\s*-\s*.*$/, '').trim();
  title = title.replace(/\s*[-–|]\s*মাসিক আল-ইখলাছ\s*$/, '').trim();

  /* তারিখ: পাতার শিরোনামেই সংখ্যার মাস থাকে — "…,নভেম্বর ২০২৬ - মাসিক আল-ইখলাছ"
     (অন্য সূত্রগুলোর মতো বাংলা লেখা-রূপেই রাখা হয়, যেমন "জানুয়ারী ২০২৫") */
  const headTitle = ($('title').text() || '').replace(/\s*[-–|]\s*মাসিক আল-ইখলাছ.*$/, '').trim();
  const issueDate = (() => {
    const m = /(?:^|,)\s*((?:জানু|ফেব্রু|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর)[^,]{0,24}?\s*[০-৯0-9]{4})\s*$/.exec(headTitle);
    return m ? m[1].replace(/\s+/g, ' ').trim() : '';
  })();

  /* লেখক: লেখার ঠিক উপরে-নিচে যেটুকু আছে (পাতার হেডারের "আজকের তারিখ" নয়) */
  const around = body.prevAll().slice(0, 4).add(body.nextAll().slice(0, 2)).text().replace(/\s+/g, ' ');
  const date = issueDate || isoDate(around) || isoDate($('.article-details').text().slice(0, 400));
  let author = (() => {
    const t = around;
    const m = /(?:লেখক|লিখেছেন|প্রশ্নকারী)\s*[:：]\s*([^\d।]{2,60})/.exec(t);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
    const a = $('.article-details').find('.author,.writer,a[href*="author"]').first().text().replace(/\s+/g, ' ').trim();
    return a.slice(0, 80);
  })();

  /* লেখার শুরুতে শিরোনামটি আবার থাকলে (h1–h4) বাদ */
  const flat = t => String(t).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
  const titleKey = flat(title);
  body.children('h1,h2,h3,h4').slice(0, 2).each((i, el) => {
    if (titleKey && flat($(el).text()).includes(titleKey.slice(0, Math.min(28, titleKey.length)))) $(el).remove();
  });
  let htmlOut = clean($, body);

  /* লেখক: লেখার শুরুতে "-ড. অমুক*" ধরনের লাইন, নইলে আগের অংশে "লেখক:" */
  if (!author) {
    const head = $('<div>').html(htmlOut).text().replace(/\s+/g, ' ').slice(0, 400);
    const m = /[-–—]\s*([^–—*]{2,60}?)\s*\*/.exec(head) || /^(?:মূল|অনুবাদ)\s*:\s*([^,।]{2,60})/.exec(head.replace(/\s+/g, ' ').trim());
    if (m) author = m[1].replace(/\s+/g, ' ').trim();
  }
  /* লেখার ভেতরে থাকা "শেয়ার করুন / প্রিন্ট / ← আগের লেখা" জাতীয় সারি বাদ */
  htmlOut = htmlOut.replace(/<p[^>]*>\s*(?:শেয়ার|প্রিন্ট|আরো পড়ুন)[\s\S]{0,120}?<\/p>/g, '');
  const len = textLen(htmlOut);
  /* ছোট উত্তরও (যেমন "উত্তর : যঈফ") পূর্ণ লেখা — সীমা ৪০, যেখানে নেভিগেশন-আবর্জনা ৪০ ছাড়ায় না */
  if (!title || len < 40) return { error: 'too short (len ' + len + ', title ' + JSON.stringify(title.slice(0, 40)) + ')', title, len };
  return { title, html: htmlOut, date, author, len };
}

/* ---------------- principale ---------------- */
function loadBuckets() {
  const cache = new Map();
  return {
    get(b) {
      if (!cache.has(b)) {
        const f = path.join(OUT, b + '.json');
        cache.set(b, { file: f, data: fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}, dirty: false });
      }
      return cache.get(b);
    },
    all() { return cache; },
    flush() { for (const [, o] of cache) if (o.dirty) { fs.writeFileSync(o.file, JSON.stringify(o.data)); o.dirty = false; } },
  };
}

(async () => {
  if (DISCOVER) { await discover(); return; }
  if (!fs.existsSync(IDS)) { console.error('আগে --discover চালান (tools/ik-ids.json নেই)'); process.exit(1); }

  const state = JSON.parse(fs.readFileSync(IDS, 'utf8'));
  const allIds = Object.keys(state.ids || {}).sort((a, b) => +a - +b);
  const buckets = loadBuckets();

  /* আগে আনা লেখা: key → আছে কি না (আমাদের নিজের key নিয়মে) */
  const have = new Set();
  for (const f of fs.readdirSync(OUT)) {
    if (!/^[0-9a-f]{3}\.json$/.test(f)) continue;
    const o = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
    for (const k in o) if (o[k] && o[k].s === SOURCE) have.add(o[k].u);
  }
  log('তালিকায় ' + allIds.length + 'টি · আগে আনা ' + have.size + 'টি');

  const todo = allIds.filter(id => !have.has(HOST + '/article_details/' + id));
  log('নতুন আনতে হবে ' + todo.length + 'টি' + (PROBE ? ' (প্রোব: প্রথম ' + PROBE + 'টি)' : ''));
  let list = LIMIT ? todo.slice(0, LIMIT) : todo;
  if (PROBE) {
    const newest = todo.slice(-Math.ceil(PROBE / 2));
    const oldest = todo.slice(0, Math.floor(PROBE / 2));
    list = [...new Set([...oldest, ...newest])];
  }

  let done = 0, failed = 0, skipped = 0;
  for (const id of list) {
    if (Date.now() > DEADLINE) { log('সময় শেষ — বাকিগুলো পরের রানে'); break; }
    const url = HOST + '/article_details/' + id;
    const r = await get(url);
    if (r.status !== 200 || !r.html) { failed++; log('  ✗ ' + id + ' (HTTP ' + r.status + ')'); await sleep(350); continue; }
    let x = null;
    try { x = extract(r.html); } catch (e) { x = { error: 'parse: ' + String((e && e.stack) || e).slice(0, 200) }; }
    if (!x || x.error) {
      failed++;
      log('  ✗ ' + id + ' (' + ((x && x.error) || 'লেখা পাওয়া যায়নি') + ')');
      if (PROBE) {
        const $ = loadCheerio().load(r.html);
        const classes = [];
        $('div[class],article[class]').each((i, e) => { const c = $(e).attr('class') || ''; const l = $(e).text().replace(/\s+/g, ' ').trim().length; classes.push(c.slice(0, 44) + ' · ' + l); });
        classes.sort((a, b) => (+b.split('· ')[1]) - (+a.split('· ')[1]));
        log('     page title: ' + $('title').text().slice(0, 70));
        log('     biggest: ' + JSON.stringify(classes.slice(0, 5)));
      }
      await sleep(350); continue;
    }

    if (PROBE) {
      log('\n--- ' + id + ' · ' + x.title.slice(0, 70));
      log('    date=' + (x.date || '-') + ' author=' + (x.author || '-') + ' len=' + textLen(x.html));
      log('    html: ' + x.html.replace(/\s+/g, ' ').slice(0, 400));
      {
        const $p = loadCheerio().load(r.html);
        const box = $p('.article-details').first();
        if (box.length) {
          const prev = box.prevAll().slice(0, 3).toArray().map(e => $p(e).prop('tagName') + '.' + ($p(e).attr('class') || '') + ' :: ' + $p(e).text().replace(/\s+/g, ' ').trim().slice(0, 90));
          const next = box.nextAll().slice(0, 2).toArray().map(e => $p(e).prop('tagName') + '.' + ($p(e).attr('class') || '') + ' :: ' + $p(e).text().replace(/\s+/g, ' ').trim().slice(0, 90));
          log('    before: ' + JSON.stringify(prev));
          log('    after: ' + JSON.stringify(next));
          const dates = [...r.html.matchAll(/([০-৯0-9]{1,2}\s+(?:জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর)\s*,?\s*[০-৯0-9]{4})/g)].map(m => m[1]);
          log('    bangla dates on page: ' + JSON.stringify([...new Set(dates)]));
        }
      }
      skipped++; await sleep(350); continue;
    }

    const key = keyOfUrl(url);
    const b = buckets.get(bucketOf(key));
    b.data[key] = {
      u: url, s: SOURCE, c: LABEL, t: x.title, l: x.title,
      d: x.date || '', a: x.author || '', h: x.html, v: 1,
    };
    b.dirty = true;
    done++;
    if (done % 100 === 0) { buckets.flush(); log('  ' + done + '/' + list.length + ' · বাকি ' + Math.round((DEADLINE - Date.now()) / 1000) + 's'); }
    await sleep(320);
  }
  buckets.flush();
  log('\nসম্পন্ন: যোগ ' + done + ' · ব্যর্থ ' + failed + (skipped ? ' · প্রোব ' + skipped : ''));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'added=' + done + '\n');
})().catch(e => { console.error(e); process.exit(1); });
