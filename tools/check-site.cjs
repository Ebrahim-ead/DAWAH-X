#!/usr/bin/env node
/* DAWAH X — সাইটের স্বয়ংক্রিয় পরীক্ষা (CI-তে চলে; কোনো ফাইল বদলায় না)
   ধরে: ভাঙা ভেতরের লিংক/ছবি, একাধিক বা শূন্য <h1>, ডুপ্লিকেট id, আলাদা না হওয়া শিরোনাম,
         data-page ↔ section মিল, sw.js-এর প্রি-ক্যাশে পাতা বাদ পড়া, সাইটম্যাপ/robots-এর মৃত ঠিকানা,
         ভাঙা JSON, ক্যাটালগের সংখ্যা মিল না হওয়া, feed.xml-এর গঠন, s/ পাতার ধরন।
   চালানো: node tools/check-site.cjs        (সমস্যা পেলে exit 1) */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const fails=[],warns=[];
const fail=m=>fails.push(m), warn=m=>warns.push(m);
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const exists=f=>{try{return fs.existsSync(path.join(ROOT,f))}catch(e){return false}};
const files=fs.readdirSync(ROOT);
const pages=files.filter(f=>/\.html$/.test(f)&&!/^(__forms|google[0-9a-f]+)\.html$/i.test(f)).sort();

/* ---------- ১) প্রতিটি পাতা ---------- */
const titles=new Map();
for(const f of pages){
 const html=read(f);
 const h1=(html.match(/<h1[\s>]/g)||[]).length;
 if(h1!==1)fail(`${f}: <h1> সংখ্যা ${h1} (১ হওয়া উচিত)`);
 const t=(html.match(/<title>([\s\S]*?)<\/title>/)||[])[1]||'';
 if(!t.trim())fail(`${f}: <title> নেই`);
 else if(titles.has(t))fail(`${f}: শিরোনাম «${t}» অন্য পাতার (${titles.get(t)}) সাথে একই`);
 else titles.set(t,f);
 if(!/<html lang="bn"/.test(html))fail(`${f}: <html lang="bn"> নেই`);
 if(!/<meta[^>]+name="description"/i.test(html)&&f!=='__forms.html')warn(`${f}: meta description নেই`);
 /* ডুপ্লিকেট id */
 const ids={},dup=new Set();
 for(const m of html.matchAll(/\sid="([^"]+)"/g)){if(ids[m[1]])dup.add(m[1]);ids[m[1]]=1}
 if(dup.size)fail(`${f}: ডুপ্লিকেট id — ${[...dup].join(', ')}`);
 /* data-page ↔ section */
 const dp=(html.match(/<body[^>]*data-page="([^"]+)"/)||[])[1];
 if(dp&&!['home','read'].includes(dp)&&!html.includes('<section id="'+dp+'"'))
  fail(`${f}: data-page="${dp}"-এর সাথে মিলে এমন <section id="${dp}"> নেই`);
 /* ভেতরের লিংক ও ছবি */
 const local=[];
 for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const u=m[1].trim();
  if(!u||/^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(u))continue;
  local.push(u.split('#')[0].split('?')[0]);
 }
 for(const u of new Set(local)){
  if(!u)continue;
  if(/^[a-z]+:/i.test(u))continue;
  if(!exists(u))fail(`${f}: ভাঙা ঠিকানা → ${u}`);
 }
 /* ছবির alt */
 for(const m of html.matchAll(/<img\b[^>]*>/g)){
  if(!/\salt=/.test(m[0]))fail(`${f}: <img> এ alt নেই — ${m[0].slice(0,70)}…`);
 }
}

/* ---------- ২) sw.js প্রি-ক্যাশ ---------- */
const sw=read('sw.js');
const pre=(sw.match(/const PRECACHE=\[([\s\S]*?)\];/)||[])[1]||'';
if(!/const VERSION='v\d+'/.test(sw))fail('sw.js: VERSION পাওয়া যায়নি');
for(const f of pages){
 if(f==='__forms.html'||/^google[0-9a-f]+\.html$/i.test(f)||/^series-[0-9a-f]{10}\.html$/.test(f))continue; /* পৃথক সিরিজ পাতা ব্যবহারের সময় ক্যাশ হয় */
 if(!pre.includes("'"+f+"'"))fail(`sw.js: প্রি-ক্যাশ তালিকায় ${f} নেই (অফলাইনে খুলবে না)`);
}
for(const m of pre.matchAll(/'([^']+)'/g)){
 if(!exists(m[1]))fail(`sw.js: প্রি-ক্যাশে এমন ফাইল আছে যার অস্তিত্ব নেই → ${m[1]}`);
}

/* ---------- ৩) সাইটম্যাপ ও robots ---------- */
const site=JSON.parse(read('tools/site.json')).url.replace(/\/+$/,'/');
const sm=read('sitemap.xml');
if(!/<sitemapindex\b/.test(sm))fail('sitemap.xml: sitemap index নয়');
const childFiles=[];
for(const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)){
 const u=m[1].trim();
 if(!u.startsWith(site)){fail(`sitemap.xml: অন্য ডোমেইনের ঠিকানা → ${u}`);continue}
 const rel=u.slice(site.length);if(!/^sitemap-[a-z0-9-]+\.xml$/.test(rel)||!exists(rel)){fail(`sitemap.xml: মৃত বা অবৈধ সাইটম্যাপ → ${u}`);continue}childFiles.push(rel);
}
if(!childFiles.includes('sitemap-static.xml'))fail('sitemap.xml: static sitemap নেই');
const allLocations=new Set();
for(const f of childFiles){const xml=read(f);if(!/<urlset\b/.test(xml))fail(`${f}: urlset নেই`);for(const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){const u=m[1].trim();if(!u.startsWith(site)){fail(`${f}: অন্য ডোমেইনের ঠিকানা → ${u}`);continue}const rel=u.slice(site.length);if(rel&&!exists(rel))fail(`${f}: মৃত ঠিকানা → ${u}`);if(allLocations.has(u))fail(`${f}: duplicate URL → ${u}`);allLocations.add(u)}}
for(const f of pages){
 if(/^google[0-9a-f]+\.html$/i.test(f)||/<meta[^>]*noindex/i.test(read(f)))continue;
 if(!allLocations.has(site+(f==='index.html'?'':f)))fail(`sitemap-static.xml: ${f} নেই`);
}
const robots=read('robots.txt');
for(const m of robots.matchAll(/^Sitemap:\s*(\S+)$/gm)){
 const u=m[1];
 if(u.startsWith(site)&&!exists(u.slice(site.length)))fail(`robots.txt: মৃত সাইটম্যাপ → ${u}`);
}

/* ---------- ৪) JSON ফাইল ---------- */
for(const f of ['manifest.webmanifest','stats.json','live.json','youtube-videos.json','tools/site.json','tools/video-channels.json','tools/topics.json']){
 try{JSON.parse(read(f))}catch(e){fail(`${f}: JSON ভাঙা — ${e.message}`)}
}
const man=JSON.parse(read('manifest.webmanifest'));
for(const k of ['name','short_name','start_url','icons','display','theme_color'])if(!man[k])fail(`manifest: ${k} নেই`);
if(!(man.icons||[]).some(i=>/512/.test(i.sizes||'')))fail('manifest: 512px আইকন নেই');

/* ---------- ৫) ক্যাটালগের সংখ্যা ---------- */
const ctx={window:{}};vm.createContext(ctx);
const appSrc=read('app.js');
const manifestOf=(name)=>{
 const m=new RegExp('const '+name+'=\\[([\\s\\S]*?)\\];').exec(appSrc);
 if(!m)return null;
 const rows=[];
 for(const r of m[1].matchAll(/\{([^}]*)\}/g)){
  const o={};for(const kv of r[1].matchAll(/(\w+):(?:"([^"]*)"|(\d+))/g))o[kv[1]]=kv[2]!==undefined?kv[2]:+kv[3];
  rows.push(o);
 }
 return rows;
};
for(const name of ['QUESTION_PARTS','FATWA_PARTS']){
 const rows=manifestOf(name);
 if(!rows){fail(`app.js: ${name} পাওয়া যায়নি`);continue}
 for(const p of rows){
  if(!exists(p.src)){fail(`${name}: ${p.src} ফাইল নেই`);continue}
  ctx.window={};delete ctx.DAWAH_QUESTIONS_PARTS;delete ctx.DAWAH_FATWAS_PARTS;
  try{vm.runInContext(read(p.src),ctx)}catch(e){fail(`${p.src}: চালানো যায়নি — ${e.message}`);continue}
  const parts=ctx.window.DAWAH_QUESTIONS_PARTS||ctx.window.DAWAH_FATWAS_PARTS||{};
  const got=Object.values(parts).reduce((a,v)=>a+((v&&v.rows&&v.rows.length)||(Array.isArray(v)?v.length:0)),0);
  if(got&&p.count&&got!==p.count)fail(`${name}: ${p.src}-এ ${got} সারি, manifest বলছে ${p.count}`);
 }
}

/* ---------- ৬) feed.xml ---------- */
if(!exists('feed.xml'))warn('feed.xml নেই (tools/build-feed.cjs চালান)');
else{
 const fx=read('feed.xml');
 if(!/<rss version="2.0"/.test(fx))fail('feed.xml: <rss> নেই');
 const items=(fx.match(/<item>/g)||[]).length;
 if(items<5)fail(`feed.xml: মাত্র ${items}টি আইটেম`);
 for(const m of fx.matchAll(/<link>([^<]+)<\/link>/g)){if(!m[1].startsWith(site)&&m[1]!==site)fail(`feed.xml: অন্য ডোমেইনের লিংক → ${m[1]}`)}
}

/* ---------- ৭) s/ পাতার নমুনা ---------- */
const shareDir=path.join(ROOT,'s');
if(fs.existsSync(shareDir)){
 const all=fs.readdirSync(shareDir).filter(f=>/^[0-9a-f]{14}\.html$/.test(f));
 const pick=[];for(let i=0;i<Math.min(20,all.length);i++)pick.push(all[Math.floor(i*all.length/20)]);
 let landing=0;
 for(const f of pick){
  const h=fs.readFileSync(path.join(shareDir,f),'utf8');
  if(/rel="canonical"/.test(h)){
   landing++;
   if(!/content="index,follow/.test(h))fail(`s/${f}: canonical আছে কিন্তু index নয়`);
   if(!/<h1>/.test(h))fail(`s/${f}: <h1> নেই`);
   if(!/application\/ld\+json/.test(h))fail(`s/${f}: Article স্কিমা নেই`);
  }else{
   if(!/noindex/.test(h))fail(`s/${f}: শেয়ার-স্টাবে noindex নেই`);
   if(!/location\.replace/.test(h))fail(`s/${f}: শেয়ার-স্টাবে রিডাইরেক্ট নেই`);
  }
 }
 console.log('s/ নমুনা:',pick.length,'পাতা, ল্যান্ডিং',landing);
}

/* ---------- ৮) সিরিজ, বিষয় ও নতুন প্রকাশনার সূচি ---------- */
try{
 const series=JSON.parse(read('series.json'));const seen=new Set();
 if(series.n!==series.s.length)fail('series.json: সিরিজের সংখ্যা মেলে না');
 series.s.forEach((sr,i)=>{
  if(!/^[0-9a-f]{10}$/.test(sr.id)||!exists('series-'+sr.id+'.html'))fail(`series.json: সিরিজ পাতা নেই ${sr.id}`);
  if(!Array.isArray(sr.p)||sr.p.length<2){fail(`series.json: খুব কম পর্ব ${sr.id}`);return}
  const nums=new Set();sr.p.forEach((part,j)=>{const [key,,no]=part;
   if(seen.has(key)||nums.has(no))fail(`series.json: একই লেখা বা পর্ব পুনরাবৃত্তি ${key}`);seen.add(key);nums.add(no);
   if(!exists('s/'+key+'.html'))fail(`series.json: লেখা নেই ${key}`);
   if(JSON.stringify(series.m[key])!==JSON.stringify([i,j]))fail(`series.json: পর্বের সূচি মেলে না ${key}`);
   const landing=read('s/'+key+'.html');if(!landing.includes('series-'+sr.id+'.html'))fail(`s/${key}.html: সিরিজের সূচি লিংক নেই`);
  });
 });
 if(Object.keys(series.m).length!==seen.size)fail('series.json: অচেনা পর্ব-সূচি আছে');
 const topics=JSON.parse(read('tools/topics.json'));for(const t of topics.topics)if(!exists('topic-'+t.id+'.html'))fail(`বিষয়ের পাতা নেই ${t.id}`);
 const faq=read('faq.html'),faqScript=(faq.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1];
 const faqData=JSON.parse(faqScript||'null');if(!faqData||faqData['@type']!=='FAQPage'||faqData.mainEntity.length!==(faq.match(/class="faq-item"/g)||[]).length)fail('faq.html: দৃশ্যমান প্রশ্নোত্তর ও structured data মেলে না');
 const sources=JSON.parse(read('source-data.json')),recent=JSON.parse(read('recent-data.json'));
 const sourceKeys=new Set();for(const code in sources.sources)for(const row of sources.sources[code]){if(sourceKeys.has(row[0]))fail(`source-data.json: পুনরাবৃত্তি ${row[0]}`);sourceKeys.add(row[0]);if(!exists('s/'+row[0]+'.html'))fail(`source-data.json: লেখা নেই ${row[0]}`)}
 const videoIds=new Set(JSON.parse(read('youtube-videos.json')).map(v=>v.id));
 const blocked=require('./video-blocklist.cjs').manualBlocked();for(const id of blocked){if(videoIds.has(id))fail(`youtube-videos.json: বাদ দেওয়া ভিডিও আবার যোগ হয়েছে ${id}`);if(read('feed.xml').includes(id))fail(`feed.xml: বাদ দেওয়া ভিডিও রয়ে গেছে ${id}`);}
 const cross=JSON.parse(read('cross-links.json'));for(const link of cross.links){if(!videoIds.has(link.id))fail(`cross-links.json: অচেনা ভিডিও ${link.id}`);for(const t of link.texts)if(!sourceKeys.has(t.k))fail(`cross-links.json: অচেনা লেখা ${t.k}`)}
 for(const v of recent.videos)if(!videoIds.has(v.id))fail(`recent-data.json: অচেনা ভিডিও ${v.id}`);
 for(const t of recent.texts)if(!sourceKeys.has(t.k))fail(`recent-data.json: অচেনা লেখা ${t.k}`);
 if(/read\.html\?v=/.test(read('feed.xml')))fail('feed.xml: সীমিত পাঠক-প্লেয়ারে ভিডিও লিংক রয়েছে');
 console.log('সিরিজ:',series.s.length,'টি, পর্ব:',seen.size,'টি; প্রকাশনা:',Object.keys(sources.sources).length,'টি');
}catch(e){fail('সিরিজ/প্রকাশনা পরীক্ষা ব্যর্থ: '+e.message)}

/* ---------- ফলাফল ---------- */
for(const w of warns)console.log('⚠ ',w);
if(fails.length){console.log('\n✗ পাওয়া গেল',fails.length,'টি সমস্যা:');for(const f of fails)console.log(' -',f);process.exit(1)}
console.log('\n✓ সব পরীক্ষা ঠিক —',pages.length,'পাতা, ক্যাটালগ, সাইটম্যাপ, robots, feed, s/');
