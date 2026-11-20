#!/usr/bin/env node
/* DAWAH X — feed.xml (RSS 2.0): নতুন লেখা ও নতুন ভিডিও এক ফিডে।
   চালানো: node tools/build-feed.cjs   [FEED_N=40] (কতটি আইটেম)
   লেখার তারিখ বাংলায় লেখা থাকে ("জানুয়ারী ২০২৫", "এপ্রিল ২১, ২০২৬") — এখানে ISO-তে ভাঙা হয়;
   ভাঙা না গেলে আইটেমটি বাদ যায় না, publishedAt ছাড়াই যোগ হয় (feed reader সাজিয়ে নেয়)। */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const SITE=JSON.parse(fs.readFileSync(path.join(__dirname,'site.json'),'utf8')).url.replace(/\/+$/,'/');
const N=+process.env.FEED_N||40;
const {textDate}=require('./text-date.cjs');
const isoDate=d=>{const date=textDate(d);return date?(date.length===7?date+'-01':date)+'T00:00:00+06:00':''};
const plain=h=>String(h||'').replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')
 .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
 .replace(/\s+/g,' ').trim();
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cut=(v,n)=>{const a=[...String(v)];return a.length>n?a.slice(0,n).join('').replace(/\s+\S*$/,'')+'…':String(v)};
const rfc=iso=>{const d=new Date(iso);return isNaN(d)?'':d.toUTCString()};

/* ---- লেখা ---- */
const texts=[];
for(const f of fs.readdirSync(path.join(ROOT,'texts'))){
 if(!/^[0-9a-f]{3}\.json$/.test(f))continue;
 const d=JSON.parse(fs.readFileSync(path.join(ROOT,'texts',f),'utf8'));
 for(const k in d){const x=d[k],iso=isoDate(x.d);texts.push({k,t:String(x.t||'').trim(),iso,desc:cut(plain(x.h),300),src:x.s})}
}
/* ---- ভিডিও ---- */
let vids=[];try{vids=JSON.parse(fs.readFileSync(path.join(ROOT,'youtube-videos.json'),'utf8'))}catch(e){}
const items=[];
for(const t of texts){ if(!t.iso||!t.t)continue;
 items.push({date:t.iso,title:t.t,link:SITE+'s/'+t.k+'.html',desc:t.desc,cat:'লেখা'})}
for(const v of (Array.isArray(vids)?vids:[])){
 if(!/^[\w-]{11}$/.test(v.id||'')||!v.title||!v.publishedAt||Number.isNaN(Date.parse(v.publishedAt)))continue;
 items.push({date:new Date(v.publishedAt).toISOString(),title:v.title,link:SITE+'videos.html?v='+encodeURIComponent(v.id),
  desc:'ভিডিও — '+(v.channelTitle||'DAWAH X'),cat:'ভিডিও'})}
items.sort((a,b)=>a.date<b.date?1:-1);
const top=items.slice(0,N);
const now=new Date().toUTCString();
const xml='<?xml version="1.0" encoding="UTF-8"?>\n'
 +'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>\n'
 +'<title>DAWAH X — নতুন লেখা ও ভিডিও</title>\n'
 +'<link>'+SITE+'</link>\n'
 +'<atom:link href="'+SITE+'feed.xml" rel="self" type="application/rss+xml"/>\n'
 +'<description>কুরআন ও সুন্নাহর আলোকে প্রশ্নোত্তর, ফতোয়া, প্রবন্ধ ও ভিডিও — নতুন যা যোগ হলো।</description>\n'
 +'<language>bn</language>\n<lastBuildDate>'+now+'</lastBuildDate>\n<generator>DAWAH X (tools/build-feed.cjs)</generator>\n'
 +'<image><url>'+SITE+'icon-512.png</url><title>DAWAH X</title><link>'+SITE+'</link></image>\n'
 +top.map(it=>'<item><title>'+esc(it.title)+'</title><link>'+esc(it.link)+'</link>'
   +'<guid isPermaLink="true">'+esc(it.link)+'</guid>'
   +(rfc(it.date)?'<pubDate>'+rfc(it.date)+'</pubDate>':'')
   +'<category>'+esc(it.cat)+'</category>'
   +'<description>'+esc(it.desc||it.title)+'</description></item>').join('\n')
 +'\n</channel></rss>\n';
const out=path.join(ROOT,'feed.xml');
let old='';try{old=fs.readFileSync(out,'utf8')}catch(e){}
/* lastBuildDate প্রতিবার বদলায় বলে সেটি বাদ দিয়ে তুলনা — অকারণ কমিট এড়াতে */
if(old.replace(/<lastBuildDate>[^<]*<\/lastBuildDate>/,'')!==xml.replace(/<lastBuildDate>[^<]*<\/lastBuildDate>/,''))fs.writeFileSync(out,xml);
console.log('feed:',top.length,'items,',(Buffer.byteLength(xml)/1024).toFixed(0)+'KB', 'texts',texts.length,'videos',Array.isArray(vids)?vids.length:0);
