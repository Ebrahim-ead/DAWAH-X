#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {SITE,fromQuestions,esc}=require('./page-template.cjs');
const src=JSON.parse(fs.readFileSync('tools/islamic-books-source.json','utf8'));
const names={bidaya:'আল বিদায়া ওয়ান নিহায়া',ibnkathir:'তাফসীর ইবনে কাসীর',zilal:'তাফসীর ফি যিলালিল কুরআন',usmani:'তাফসীরে উসমানী',jalalain:'তাফসীরে জালালাইন',maarif:'তাফসীরে মারেফুল কুরআন',tawjih:'তাফসীরে তাওযীহুল কুরআন',tabari:'তাফসীরে তাবারী',mazhari:'তাফসীরে মাযহারী',ahmad:'মুসনাদে আহমদ'};
if(src.errors.length || src.categories.length!==10)throw Error('Source inventory is incomplete');
const ids=new Set();
const catalog=src.categories.map(group=>{
 if(!names[group.id]||group.items.length!==group.expected)throw Error('Unexpected category '+group.id);
 return {id:group.id,name:names[group.id],items:group.items.map(item=>{
  const page=new URL(item.page),pdf=new URL(item.pdf),id=page.pathname.split('/').filter(Boolean).pop();
  if(page.origin!=='https://book.tauhiderdak.com'||!page.pathname.startsWith('/flipbook/')||pdf.origin!==page.origin||!pdf.pathname.startsWith('/wp-content/uploads/')||!pdf.pathname.toLowerCase().endsWith('.pdf')||!id||ids.has(id))throw Error('Invalid or repeated source URL');
  ids.add(id);return {id,name:item.name,page:item.page,pdf:item.pdf};
 })};
});
if(ids.size!==102)throw Error('Expected 102 source flipbooks');
fs.writeFileSync('islamic-books-catalog.js','/* Source inventory: tools/islamic-books-source.json; run node tools/build-islamic-books.cjs */\nwindow.ISLAMIC_BOOKS='+JSON.stringify(catalog)+';\n');
const labels={bidaya:'ইতিহাস',ahmad:'হাদিস'};
const cards=catalog.map((g,i)=>`<article class="books-card" data-group="${esc(g.id)}" data-kind="${labels[g.id]||'তাফসীর'}">
 <a class="books-card-main" href="islamic-book-collection.html?collection=${esc(g.id)}">
  <span class="books-card-cover cover-${i%5}" aria-hidden="true"><span class="cover-ornament">✦</span><span class="cover-lines"></span><span class="cover-bottom">DAWAH X</span></span>
  <span class="books-card-copy"><span class="books-category">${labels[g.id]||'তাফসীর'}</span><h3>${esc(g.name)}</h3><span class="books-card-meta">${g.items.length}টি খণ্ড / ফাইল</span><span class="books-card-action">খণ্ডসমূহ দেখুন <span aria-hidden="true">↗</span></span></span>
 </a><div class="books-match-list" hidden></div></article>`).join('\n');
const catalogSection=`<section id="books" class="books-section"><div class="wrap books-wrap" data-books-page="catalog">
 <div class="books-hero"><div class="books-hero-content"><span class="books-eyebrow"><span></span> DAWAH X লাইব্রেরি</span><h1>জ্ঞান অন্বেষণে<br><em>বইয়ের সাথে</em></h1><p>তাফসীর, ইতিহাস ও হাদিসের নির্বাচিত বইগুলো এক জায়গায়। পছন্দের সংগ্রহ ও খণ্ড বেছে পড়া শুরু করুন।</p><a class="books-hero-link" href="#books-library">বইয়ের সংগ্রহ দেখুন <span aria-hidden="true">↓</span></a><div class="books-hero-stats"><span><b>১০</b><small>টি সংগ্রহ</small></span><span><b>১০২</b><small>টি খণ্ড / ফাইল</small></span><span><b>PDF</b><small>পাঠের সুবিধা</small></span></div></div></div>
 <div class="books-source-notice"><span aria-hidden="true">ⓘ</span><p>PDF তাওহীদ লাইব্রেরী থেকে অনলাইনে লোড হয়; ফাইল এই সাইটে সংরক্ষিত নয়। উৎস বন্ধ থাকলে পড়া যাবে না। <a href="islamic-books-credits.md">উৎস ও সীমাবদ্ধতা ↗</a></p></div>
 <div id="books-resume" class="books-resume" hidden><span class="books-resume-icon" aria-hidden="true">↗</span><div><small>সর্বশেষ পড়েছেন</small><strong id="books-resume-title"></strong><span id="books-resume-page"></span></div><a id="books-resume-link" class="books-button" href="islamic-books.html">পড়া চালিয়ে যান →</a></div>
 <section id="books-saved" class="books-saved" hidden aria-labelledby="books-saved-title"><h2 id="books-saved-title">★ সংরক্ষিত বইয়ের পৃষ্ঠা</h2><p>এই ব্রাউজারে রাখা বুকমার্ক; ডিভাইস বদলালে পাওয়া যাবে না।</p><div id="books-saved-list"></div></section>
 <div class="books-library-head" id="books-library"><div><span class="books-kicker">আপনার বইয়ের তাক</span><h2>সংগ্রহ থেকে বেছে নিন</h2><p>একটি বই নির্বাচন করে উপলব্ধ খণ্ডগুলো দেখুন।</p></div><div class="books-total"><b>১০</b><span>টি সংগ্রহ</span></div></div>
 <div class="books-search-panel"><div class="books-search-field"><label for="books-search">বই বা খণ্ড খুঁজুন</label><div class="books-input-wrap"><span aria-hidden="true">⌕</span><input id="books-search" type="search" placeholder="বই বা খণ্ডের নাম লিখুন…" autocomplete="off"/></div></div><div class="books-filters" aria-label="বইয়ের ধরন"><button class="books-filter active" type="button" data-filter="all" aria-pressed="true">সব বই</button><button class="books-filter" type="button" data-filter="তাফসীর" aria-pressed="false">তাফসীর</button><button class="books-filter" type="button" data-filter="হাদিস" aria-pressed="false">হাদিস</button><button class="books-filter" type="button" data-filter="ইতিহাস" aria-pressed="false">ইতিহাস</button></div><p id="books-count" aria-live="polite">১০টি সংগ্রহ · ১০২টি খণ্ড / ফাইল</p></div>
 <div id="books-catalog" class="books-catalog">${cards}</div><p id="books-empty" class="books-empty" hidden>কিছু পাওয়া যায়নি। অন্য নাম বা ধরন দিয়ে খুঁজুন।</p>
 <noscript><p class="books-help">নাম দিয়ে খোঁজা ও বইয়ের পাঠক চালাতে জাভাস্ক্রিপ্ট প্রয়োজন। <a href="https://book.tauhiderdak.com/r3d_category">মূল তালিকা দেখুন ↗</a></p></noscript>
</div></section>`;
const collectionSection=`<section id="books" class="books-section"><div class="wrap books-wrap" data-books-page="collection">
 <nav class="books-breadcrumb" aria-label="পথনির্দেশ"><a href="islamic-books.html">ইসলামিক বই</a><span aria-hidden="true">/</span><span id="collection-crumb">সংগ্রহ</span></nav>
 <div id="collection-content"><div class="books-collection-hero"><div class="collection-art" aria-hidden="true"><span>✦</span><i></i><small>DAWAH X</small></div><div><span id="collection-kind" class="books-kicker">বইয়ের সংগ্রহ</span><h1 id="collection-title">সংগ্রহ লোড হচ্ছে…</h1><p id="collection-description"></p><div class="collection-facts"><span id="collection-count"></span><span>অনলাইন PDF</span></div></div></div>
 <div class="books-source-notice compact"><span aria-hidden="true">ⓘ</span><p>শুধু উৎসে তালিকাভুক্ত খণ্ড দেখানো হচ্ছে; PDF মূল উৎস থেকে অনলাইনে লোড হয়। <a href="islamic-books-credits.md">বিস্তারিত ↗</a></p></div>
 <div class="books-library-head"><div><span class="books-kicker">সংগ্রহের তালিকা</span><h2>খণ্ড বেছে নিন</h2><p>যে খণ্ডটি পড়তে চান সেটি খুলুন।</p></div><label class="collection-search-label" for="volume-search">খণ্ড খুঁজুন <input id="volume-search" type="search" placeholder="যেমন: ১ম খন্ড"/></label></div>
 <p id="volume-count" class="books-subtle" aria-live="polite"></p><div id="volume-list" class="volume-list"></div><p id="volume-empty" class="books-empty" hidden>এই নামে কোনো খণ্ড পাওয়া যায়নি।</p></div>
 <div id="collection-error" class="books-empty" hidden><h2>সংগ্রহটি পাওয়া যায়নি</h2><p>ঠিকানা পরীক্ষা করে বইয়ের তালিকায় ফিরে যান।</p><a class="books-button" href="islamic-books.html">সব সংগ্রহ</a></div>
 <noscript><p class="books-help">এই সংগ্রহের খণ্ড দেখতে জাভাস্ক্রিপ্ট প্রয়োজন। <a href="https://book.tauhiderdak.com/r3d_category">মূল তালিকা দেখুন ↗</a></p></noscript>
</div></section>`;
const readerSection=`<section id="books" class="books-section"><div class="wrap books-wrap books-read-wrap" data-books-page="reader">
 <nav class="books-breadcrumb" aria-label="পথনির্দেশ"><a href="islamic-books.html">ইসলামিক বই</a><span aria-hidden="true">/</span><a id="books-back" href="islamic-books.html">সংগ্রহ</a><span aria-hidden="true">/</span><span>পাঠক</span></nav>
 <div id="books-reader" class="books-reader"><div class="books-reader-head"><div><span class="books-kicker">বইয়ের পাঠক</span><h1 id="books-reader-title">বই লোড হচ্ছে…</h1><p id="books-reader-subtitle">মূল PDF তাওহীদ লাইব্রেরী থেকে লোড হয়।</p></div><div class="books-reader-actions"><button type="button" id="books-bookmark" class="books-button books-outline" aria-pressed="false">☆ এই পৃষ্ঠা রাখুন</button><button type="button" id="books-share" class="books-button books-outline">লিংক কপি</button></div></div>
 <div class="books-source-line"><span>ইন্টারনেট সংযোগ প্রয়োজন</span><a id="books-source" target="_blank" rel="noopener noreferrer">উৎস পাতা ↗</a><a id="books-original" target="_blank" rel="noopener noreferrer">মূল PDF ↗</a><a href="islamic-books-credits.md">উৎস তথ্য</a></div>
 <div class="books-toolbar" aria-label="বই পড়ার নিয়ন্ত্রণ"><button id="books-prev" class="books-button books-outline" type="button" disabled>← আগের</button><form id="books-jump"><label for="books-page">পৃষ্ঠা</label><input id="books-page" type="text" inputmode="numeric" autocomplete="off" value="1" aria-describedby="books-page-total"/><span id="books-page-total">/ —</span><button class="books-button books-outline" type="submit">যান</button></form><button id="books-next" class="books-button" type="button" disabled>পরের পৃষ্ঠা →</button><label class="books-zoom" for="books-scale">আকার <select id="books-scale"><option value="1">স্বাভাবিক</option><option value="1.25">বড়</option><option value="1.5">আরও বড়</option></select></label></div>
 <div class="books-progress"><div id="books-progress-fill"></div></div><div class="books-reader-message"><p id="books-status" class="books-status" role="status" aria-live="polite"></p><button id="books-retry" class="books-button books-outline" type="button" hidden>আবার চেষ্টা করুন</button></div>
 <div class="books-canvas-wrap" id="books-page-view"><canvas id="books-canvas" aria-label="নির্বাচিত বইয়ের পৃষ্ঠা" hidden></canvas><p id="books-canvas-placeholder">পৃষ্ঠা এখানে দেখা যাবে</p></div>
 <div class="books-bottom-nav"><button id="books-bottom-prev" class="books-button books-outline" type="button" disabled>← আগের পৃষ্ঠা</button><span id="books-bottom-page">—</span><button id="books-bottom-next" class="books-button" type="button" disabled>পরের পৃষ্ঠা →</button></div>
 <nav class="books-volume-nav" aria-label="অন্য খণ্ড"><a id="books-previous-volume" hidden>← আগের খণ্ড</a><a id="books-all-volumes" href="islamic-books.html">সব খণ্ড</a><a id="books-next-volume" hidden>পরের খণ্ড →</a></nav></div>
 <div id="books-error" class="books-empty" hidden><h2>বইটি পাওয়া যায়নি</h2><p>ঠিকানা পরীক্ষা করে সংগ্রহ থেকে বই নির্বাচন করুন।</p><a class="books-button" href="islamic-books.html">সব সংগ্রহ</a></div>
 <noscript><p class="books-help">পাঠক চালাতে জাভাস্ক্রিপ্ট প্রয়োজন। <a href="https://book.tauhiderdak.com/r3d_category">মূল তালিকা দেখুন ↗</a></p></noscript>
</div></section>`;
function writePage(file,section,title,description,page,children){
 let html=fromQuestions({sectionId:'books',pageId:'books',section,title,description,url:SITE+file});
 html=html.replace('</head>',(children?'<meta name="robots" content="noindex,follow"/>\n':'')+'<link rel="stylesheet" href="islamic-books.css"/>\n</head>');
 html=html.replace('</body>','<script src="islamic-books-catalog.js"></script>\n<script src="islamic-books.js"></script>\n</body>');
 html=html.replace('<a href="islamic-books.html">ইসলামিক বই</a>',children?'<a class="on" href="islamic-books.html">ইসলামিক বই</a>':'<a aria-current="page" class="on" href="islamic-books.html">ইসলামিক বই</a>');
 fs.writeFileSync(file,html);
}
writePage('islamic-books.html',catalogSection,'ইসলামিক বই — DAWAH X','তাফসীর, ইতিহাস ও হাদিসের নির্বাচিত বইয়ের সংগ্রহ ও উপলব্ধ খণ্ড খুঁজুন।','catalog',false);
writePage('islamic-book-collection.html',collectionSection,'বইয়ের সংগ্রহ — DAWAH X','উৎসে পাওয়া বইয়ের খণ্ডসমূহ দেখুন।','collection',true);
writePage('islamic-book-read.html',readerSection,'বইয়ের পাঠক — DAWAH X','নির্বাচিত বই অনলাইনে পড়ুন।','reader',true);
