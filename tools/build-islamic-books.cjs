#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {SITE,fromQuestions}=require('./page-template.cjs');
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
const section=`<section id="books"><div class="wrap books-wrap">
  <div class="books-hero"><span class="books-kicker">পড়ার সংগ্রহ</span><h1>ইসলামিক বই</h1><p>বই নির্বাচন করুন, খণ্ড বেছে সরাসরি এই পাতায় পড়ুন। উৎসে যতগুলো খণ্ড পাওয়া গেছে সেগুলোই এখানে রাখা হয়েছে।</p><p class="books-origin">বইয়ের PDF তাওহীদ লাইব্রেরী থেকে ইন্টারনেটের মাধ্যমে লোড হয়; ফাইল এই সাইটে সংরক্ষিত নয়। উৎস বন্ধ থাকলে পাঠ নাও খুলতে পারে। <a href="islamic-books-credits.md">উৎস ও সীমাবদ্ধতা</a></p></div>
  <div id="books-reader" class="books-reader" hidden aria-labelledby="books-reader-title">
    <div class="books-reader-head"><div><p class="books-label">পাঠক</p><h2 id="books-reader-title"></h2></div><button type="button" id="books-close" class="books-button books-outline">বন্ধ করুন</button></div>
    <p class="books-reader-info">মূল PDF তাওহীদ লাইব্রেরী থেকে লোড হচ্ছে। <a id="books-source" target="_blank" rel="noopener noreferrer">উৎস পাতা ↗</a> · <a id="books-original" target="_blank" rel="noopener noreferrer">মূল PDF ↗</a></p>
    <div class="books-toolbar" aria-label="বই পড়ার নিয়ন্ত্রণ"><button id="books-prev" class="books-button" type="button" disabled>← আগের পৃষ্ঠা</button><form id="books-jump"><label for="books-page">পৃষ্ঠা</label><input id="books-page" type="text" inputmode="numeric" autocomplete="off" value="1" aria-describedby="books-page-total"/><span id="books-page-total">/ —</span><button class="books-button books-outline" type="submit">যান</button></form><button id="books-next" class="books-button" type="button" disabled>পরের পৃষ্ঠা →</button><label class="books-zoom" for="books-scale">আকার <select id="books-scale"><option value="1">স্বাভাবিক</option><option value="1.25">বড়</option><option value="1.5">আরও বড়</option></select></label></div>
    <p id="books-status" class="books-status" role="status" aria-live="polite"></p><div class="books-canvas-wrap"><canvas id="books-canvas" aria-label="নির্বাচিত বইয়ের পৃষ্ঠা"></canvas></div>
  </div>
  <div class="books-search"><label for="books-search">বই বা খণ্ড খুঁজুন</label><input id="books-search" type="search" placeholder="যেমন: ইবনে কাসীর বা ১ম খন্ড" autocomplete="off"/><p id="books-count" aria-live="polite"></p></div>
  <div id="books-catalog" class="books-catalog"><p>বইয়ের তালিকা লোড হচ্ছে…</p></div>
  <noscript><p>বইয়ের তালিকা ও পাঠকের জন্য জাভাস্ক্রিপ্ট প্রয়োজন। <a href="https://book.tauhiderdak.com/r3d_category">তাওহীদ লাইব্রেরীর মূল তালিকা</a> দেখুন।</p></noscript>
</div></section>`;
let html=fromQuestions({sectionId:'books',pageId:'books',section,title:'ইসলামিক বই — DAWAH X',description:'তাওহীদ লাইব্রেরীর উপলব্ধ তাফসীর, ইতিহাস ও হাদিস গ্রন্থের খণ্ড পড়ুন DAWAH X পাঠকে।',url:SITE+'islamic-books.html'});
html=html.replace('</head>','<link rel="stylesheet" href="islamic-books.css"/>\n</head>');
html=html.replace('</body>','<script src="islamic-books-catalog.js"></script>\n<script src="islamic-books.js"></script>\n</body>');
html=html.replace('<a href="islamic-books.html">ইসলামিক বই</a>','<a aria-current="page" class="on" href="islamic-books.html">ইসলামিক বই</a>');
fs.writeFileSync('islamic-books.html',html);
