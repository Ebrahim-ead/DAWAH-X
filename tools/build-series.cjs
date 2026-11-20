#!/usr/bin/env node
/* Build the series directory and a distinct indexable page for every detected text series. */
'use strict';
const fs=require('fs'),path=require('path');
const {ROOT,SITE,esc,fromQuestions}=require('./page-template.cjs');
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'series.json'),'utf8'));
if(!Array.isArray(data.s)||!data.m)throw new Error('series.json তৈরি করুন: node tools/build-site-data.cjs share');
const save=(file,html)=>{const f=path.join(ROOT,file);let old='';try{old=fs.readFileSync(f,'utf8')}catch(e){}if(old!==html)fs.writeFileSync(f,html)};
const latin=v=>String(v).replace(/[০-৯]/g,d=>String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
const list=data.s.map(sr=>({...sr,t:latin(sr.t),p:sr.p.map(p=>[p[0],latin(p[1]),p[2]])})).sort((a,b)=>a.t.localeCompare(b.t,'bn')||(a.id<b.id?-1:1));
const indexRows=list.map(sr=>`<li><a class="series-index-link" href="series-${sr.id}.html"><b>${esc(sr.t)}</b><small>${sr.p.length}টি পর্ব · ধারাবাহিকভাবে পড়ুন →</small></a></li>`).join('\n');
const indexSection=`<section id="series" style="padding-top:0"><div class="wrap">
<div class="title" data-reveal=""><h1>লেখার সিরিজ</h1><p>${list.length}টি ধারাবাহিক লেখা এক জায়গায় — সংগ্রহে শনাক্ত পর্বগুলো খুঁজে নিন।</p></div>
<p class="series-index-note">পর্বের নম্বর শিরোনাম থেকে স্বয়ংক্রিয়ভাবে সাজানো হয়েছে। শিরোনামে পর্বের নম্বর না থাকলে বা একই নম্বর একাধিকবার থাকলে কিছু লেখা বাদ পড়তে পারে।</p>
<ol aria-label="লেখার সিরিজের তালিকা" class="series-index-list">${indexRows}</ol>
<p class="qnote">আরও লেখা খুঁজুন <a href="questions.html">প্রশ্নোত্তর</a>, <a href="fatwa.html">ফতোয়া</a> ও <a href="topics.html">বিষয়ভিত্তিক</a> পাতায়।</p>
</div></section>`;
const indexUrl=SITE+'series.html';
const indexLd={'@context':'https://schema.org','@type':'CollectionPage',name:'লেখার সিরিজ — DAWAH X',description:'DAWAH X-এর ধারাবাহিক লেখা ও পর্বের সূচি।',url:indexUrl,inLanguage:'bn',mainEntity:{'@type':'ItemList',numberOfItems:list.length,itemListElement:list.map((sr,i)=>({'@type':'ListItem',position:i+1,name:sr.t,url:SITE+'series-'+sr.id+'.html'}))}};
save('series.html',fromQuestions({sectionId:'series',section:indexSection,title:'লেখার সিরিজ — DAWAH X',description:'ধারাবাহিক লেখা ও পর্বের সূচি — DAWAH X। আগের ও পরের পর্বসহ সব লেখা এক জায়গায় পড়ুন।',url:indexUrl,pageId:'series',structuredData:indexLd}));
let pages=0,totalParts=0;
const valid=new Set(list.map(sr=>'series-'+sr.id+'.html'));
for(const f of fs.readdirSync(ROOT))if(/^series-[0-9a-f]{10}\.html$/.test(f)&&!valid.has(f))fs.unlinkSync(path.join(ROOT,f));
for(const sr of list){
 const parts=sr.p||[];if(parts.length<2)continue;
 const url=SITE+'series-'+sr.id+'.html';
 const rows=parts.map((part,i)=>{
  const [key,title,no]=part;
  const label=no===999?'শেষ পর্ব':`পর্ব ${no}`;
  return `<li><span aria-hidden="true" class="series-part-no">${label}</span><a href="s/${key}.html"><b>${esc(title)}</b><small>লেখাটি খুলুন →</small></a></li>`;
 }).join('\n');
 const section=`<section id="series" style="padding-top:0"><div class="wrap">
<nav aria-label="আপনি কোথায় আছেন" class="crumbs"><a href="index.html">হোম</a><span aria-hidden="true">›</span><a href="series.html">লেখার সিরিজ</a></nav>
<div class="title" data-reveal=""><h1>${esc(sr.t)}</h1><p>এই সংগ্রহে শনাক্ত ${parts.length}টি পর্ব নিচে দেওয়া হলো। ধারাবাহিকভাবে পড়তে যেকোনো পর্ব বেছে নিন।</p></div>
<ol aria-label="${esc(sr.t)} সিরিজের পর্ব" class="series-part-list">${rows}</ol>
<p class="qnote"><a href="series.html">← সব সিরিজে ফিরে যান</a></p>
</div></section>`;
 const ld={'@context':'https://schema.org','@type':'CollectionPage',name:sr.t+' — DAWAH X',description:`${sr.t} সিরিজের ${parts.length}টি পর্বের সূচি।`,url,inLanguage:'bn',mainEntity:{'@type':'ItemList',itemListOrder:'https://schema.org/ItemListOrderAscending',numberOfItems:parts.length,itemListElement:parts.map((part,i)=>({'@type':'ListItem',position:i+1,name:part[1],url:SITE+'s/'+part[0]+'.html'}))}};
 save('series-'+sr.id+'.html',fromQuestions({sectionId:'series',section,title:sr.t+' — লেখার সিরিজ — DAWAH X',description:`${sr.t} সিরিজের ${parts.length}টি পর্বের সূচি। আগের ও পরের লেখা ধারাবাহিকভাবে পড়ুন।`,url,pageId:'series',structuredData:ld}));
 pages++;totalParts+=parts.length;
}
console.log('series pages:',pages,'series,',totalParts,'parts; index series.html');
