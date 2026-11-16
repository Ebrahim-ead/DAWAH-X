#!/usr/bin/env node
/* DAWAH X — বিষয়ভিত্তিক শুরুর পাতা topics.html তৈরি করে।
   তালিকা: tools/topics.json (লেখার চাবি); শিরোনাম texts/ থেকে নেওয়া হয়; পাতার কাঠামো (হেডার/ফুটার) questions.html থেকে।
   চালানো: node tools/build-topics.cjs */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),TEXTS=path.join(ROOT,'texts');
const SITE=JSON.parse(fs.readFileSync(path.join(__dirname,'site.json'),'utf8')).url.replace(/\/*$/,'/');
const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'topics.json'),'utf8'));
const SRC={ra:'Response to Anti-Islam',fm:'From Muslims',ia:'Islamic Authors',iz:'Insight Zone',ai:'মাসিক আল-ইতিছাম',at:'মাসিক আত-তাহরীক'};
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const BN='০১২৩৪৫৬৭৮৯',latin=v=>String(v).replace(/[০-৯]/g,d=>String(BN.indexOf(d)));
/* সব চাবি → [শিরোনাম, উৎস] (পূর্ণ চাবি বা তার শুরুর অংশ দুটোই চলে) */
const all=new Map();
for(const f of fs.readdirSync(TEXTS)){if(!/^[0-9a-f]{3}\.json$/.test(f))continue;const d=JSON.parse(fs.readFileSync(path.join(TEXTS,f),'utf8'));for(const k in d)all.set(k,[String(d[k].t||'').replace(/\s+/g,' ').trim(),d[k].s])}
const keys=[...all.keys()];
const full=p=>{if(all.has(p))return p;const m=keys.filter(k=>k.startsWith(p));if(m.length!==1)throw new Error('চাবি "'+p+'": '+(m.length?'একাধিক লেখা মেলে':'এমন লেখা নেই'));return m[0]};
let total=0;
const sections=cfg.topics.map(t=>{const rows=t.keys.map(full).map(k=>{const[title,s]=all.get(k);total++;return `<li><a href="read.html?k=${k}&amp;from=${s==='ai'||s==='at'?'f':'q'}"><b>${esc(latin(title))}</b><small>${esc(SRC[s]||'')}</small></a></li>`});
 return `<section aria-labelledby="t-${t.id}-h" class="topic" id="t-${t.id}"><div class="topic-head"><h2 id="t-${t.id}-h">${esc(t.title)}</h2><span class="topic-count">${rows.length}টি লেখা</span></div><p class="topic-intro">${esc(t.intro)}</p><ol class="topic-list">\n${rows.join('\n')}\n</ol></section>`});
const chips=cfg.topics.map(t=>`<a class="chip" href="#t-${t.id}">${esc(t.title)}</a>`).join('');
const main=`<section id="topics" style="padding-top:0"><div class="wrap">
<div class="title" data-reveal=""><h1>বিষয় ধরে পড়ুন</h1><p>কোথা থেকে শুরু করবেন বুঝতে পারছেন না? নিচের ${cfg.topics.length}টি বিষয়ে বাছাই করা ${total}টি লেখা সাজানো আছে — প্রতিটি এই সাইটেই পড়া যায়।</p></div>
<nav aria-label="বিষয়ের তালিকা" class="qchips topic-nav">${chips}</nav>
${sections.join('\n')}
<p class="qnote">আরও লেখা খুঁজতে <a href="questions.html">প্রশ্নোত্তর লাইব্রেরি</a> ও <a href="fatwa.html">ফতোয়া</a> পাতার সার্চ ব্যবহার করুন — সার্চ এখন লেখার ভেতরেও খোঁজে। নিজের প্রশ্ন থাকলে <a href="ask.html">প্রশ্ন করুন</a>।</p>
</div></section>
`;
let h=fs.readFileSync(path.join(ROOT,'questions.html'),'utf8');
const a=h.indexOf('<section id="qa"'),b=h.indexOf('</main>');if(a<0||b<0)throw new Error('questions.html-এর কাঠামো বদলে গেছে');
h=h.slice(0,a)+main+h.slice(b);
const title='বিষয় ধরে পড়ুন — DAWAH X',desc='নাস্তিকতা, কুরআন, হাদিস, রাসূল ﷺ, নারী, বিজ্ঞান ও শরিয়াহ — বিষয় ধরে বাছাই করা প্রশ্নোত্তর; নতুন পাঠকের শুরুর পাতা।';
h=h.replace(/<title>[^<]*<\/title>/,`<title>${title}</title>`).replace(/(<meta content=")[^"]*(" name="description"\/>)/,`$1${desc}$2`)
 .replace(/(<meta content=")[^"]*(" property="og:title"\/>)/,`$1${title}$2`).replace(/(<meta content=")[^"]*(" property="og:description"\/>)/,`$1${desc}$2`)
 .replace(/(<meta content=")[^"]*(" name="twitter:title"\/>)/,`$1${title}$2`).replace(/(<meta content=")[^"]*(" name="twitter:description"\/>)/,`$1${desc}$2`)
 .split(SITE+'questions.html').join(SITE+'topics.html').replace('<body data-page="qa">','<body data-page="topics">')
 .replace('aria-current="page" class="on" href="questions.html"','class="on" href="questions.html"').replace(/<p class="qnote topic-hint">[\s\S]*?<\/p>/,'')
 .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'').replace(/<script[^>]*src="questions-catalog[^"]*"[^>]*><\/script>/g,'');
fs.writeFileSync(path.join(ROOT,'topics.html'),h);
/* হোম পেজের "বিষয় ধরে পড়ুন" অংশ (<!--topics--> … <!--/topics--> এর মাঝখান) */
{const f=path.join(ROOT,'index.html');let x=fs.readFileSync(f,'utf8');const i=x.indexOf('<!--topics-->'),j=x.indexOf('<!--/topics-->');
 if(i>=0&&j>i){x=x.slice(0,i)+'<!--topics--><nav aria-label="বিষয়ের তালিকা" class="qchips topic-nav">'+cfg.topics.map(t=>`<a class="chip" href="topics.html#t-${t.id}">${esc(t.title)}</a>`).join('')+'</nav>'+x.slice(j);fs.writeFileSync(f,x)}}
console.log('topics.html:',cfg.topics.length,'topics,',total,'texts');
