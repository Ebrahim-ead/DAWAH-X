#!/usr/bin/env node
/* DAWAH X — texts/ থেকে তিনটি জিনিস তৈরি করে (লেখা আমদানির পর প্রতিবার চালাতে হয়; workflow নিজেই চালায়):
   ১) search/  — লেখার ভেতরের শব্দের সূচি (প্রশ্নোত্তর ও ফতোয়া পাতার সার্চ-বক্স এখান থেকে খোঁজে)
   ২) rel/     — প্রতিটি লেখার নিচে "এ বিষয়ে আরও পড়ুন"-এর তালিকা
   ৩) s/       — প্রতিটি লেখার ছোট শেয়ার-পাতা (Facebook/WhatsApp-এ লেখার নিজের শিরোনাম দেখানোর জন্য)
   চালানো: node tools/build-site-data.cjs            (সাইটের ঠিকানা tools/site.json থেকে নেয়) */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),TEXTS=path.join(ROOT,'texts');
const SITE=JSON.parse(fs.readFileSync(path.join(__dirname,'site.json'),'utf8')).url.replace(/\/*$/,'/');
const SHARDS=512,REL_N=5;
const ONLY=process.argv[2]||''; /* "search" | "rel" | "share" দিলে শুধু সেটি */

/* ---- app.js-এর foldBn()/searchTokens()/searchShard()-এর সাথে হুবহু এক হতে হবে ---- */
const BN_DIGITS='০১২৩৪৫৬৭৮৯';
const FOLD_MAP={'ী':'ি','ূ':'ু','ঈ':'ই','ঊ':'উ','ছ':'স','শ':'স','ষ':'স','য':'জ','ণ':'ন','ৎ':'ত'};
const foldBn=v=>String(v||'').normalize('NFC').toLowerCase().replace(/[০-৯]/g,d=>String(BN_DIGITS.indexOf(d)))
 .replace(/[\u200b-\u200d\u00ad\ufeff\u0981]/g,'').replace(/([\p{L}\p{M}])[‘’'ʼ](?=\p{L})/gu,'$1').replace(/\u09af\u09bc/g,'\u09df').replace(/\u09a1\u09bc/g,'\u09dc').replace(/\u09a2\u09bc/g,'\u09dd')
 .replace(/([কত])\u09cd\u09ac/g,'$1').replace(/[ীূঈঊছশষযণৎ]/g,c=>FOLD_MAP[c]);
const searchTokens=v=>(foldBn(v).match(/[\p{L}\p{M}\p{N}]+/gu)||[]).filter(t=>{const n=[...t].length;return n>=2&&n<=30});
const prefix3=t=>{const a=[...t];return a.slice(0,a[1]==='\u09cd'?5:3).join('')}; /* যুক্তাক্ষর দিয়ে শুরু হলে (প্র, ক্ষ…) ৫ অক্ষর */
const shardOf=t=>{let h=0x811c9dc5;const p=prefix3(t);for(let i=0;i<p.length;i++){h^=p.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0)%SHARDS};
/* ------------------------------------------------------------------- */

const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const plain=h=>String(h||'').replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')
 .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi,(m,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10)||32):(ENT[e.toLowerCase()]||' ')).replace(/\s+/g,' ').trim();
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cut=(v,n)=>{const a=[...v];return a.length>n?a.slice(0,n).join('').replace(/\s+\S*$/,'')+'…':v};
const sideOf=s=>s==='ai'||s==='at'?'f':'q';
const rmrf=d=>fs.rmSync(d,{recursive:true,force:true});

/* ---- সব লেখা পড়া ---- */
const docs=[];
for(const f of fs.readdirSync(TEXTS)){if(!/^[0-9a-f]{3}\.json$/.test(f))continue;const d=JSON.parse(fs.readFileSync(path.join(TEXTS,f),'utf8'));
 for(const k in d){const x=d[k];docs.push({k,s:x.s,c:x.c||'',t:String(x.t||'').replace(/\s+/g,' ').trim(),h:x.h||''})}}
docs.sort((a,b)=>a.k<b.k?-1:1);
const N=docs.length;console.log('texts',N);

/* ---- ১) সার্চ-সূচি ---- */
if(!ONLY||ONLY==='search'){
 const post=new Map();
 docs.forEach((d,i)=>{const seen=new Set(searchTokens(d.t+' '+plain(d.h)));
  for(const t of seen){if(/[\u0600-\u06ff]/.test(t)||/^\d{7,}$/.test(t))continue;let a=post.get(t);if(!a)post.set(t,a=[]);a.push(i)}});
 const stopAt=Math.floor(N*0.2),stop=[],files=Array.from({length:SHARDS},()=>({}));let kept=0,np=0;
 for(const[t,a]of post){if(a.length>stopAt){stop.push(t);continue}
  const bytes=[];let prev=-1;for(const id of a){let v=id-prev;prev=id;while(v>127){bytes.push((v&127)|128);v>>>=7}bytes.push(v)}
  files[shardOf(t)][t]=Buffer.from(bytes).toString('base64').replace(/=+$/,'');kept++;np+=a.length}
 const out=path.join(ROOT,'search');rmrf(out);fs.mkdirSync(out);let size=0,max=0;
 files.forEach((o,i)=>{const s=JSON.stringify(o);size+=Buffer.byteLength(s);max=Math.max(max,Buffer.byteLength(s));fs.writeFileSync(path.join(out,String(i).padStart(3,'0')+'.json'),s)});
 fs.writeFileSync(path.join(out,'keys.txt'),docs.map(d=>d.k).join(''));
 fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify({v:1,n:N,shards:SHARDS,stop:stop.sort()}));
 console.log('search: tokens',kept,'postings',np,'stop',stop.length,'MB',(size/1e6).toFixed(1),'largest shard KB',Math.round(max/1e3));
}

/* ---- ২) "এ বিষয়ে আরও পড়ুন" ---- */
if(!ONLY||ONLY==='rel'){
 /* rel/<চাবির শেষ ২ অক্ষর>.json: {চাবি:[শিরোনাম,বিভাগ,"সম্পর্কিত ৫টি চাবি পরপর"]} — সম্পর্কিত লেখার শিরোনাম তার নিজের ফাইল থেকে আসে।
    শিরোনামের মিল (কম-ব্যবহৃত শব্দের ওজন বেশি) + একই বিভাগ হলে সামান্য বাড়তি; কম পড়লে একই বিভাগের অন্য লেখা */
 const tt=docs.map(d=>[...new Set(searchTokens(d.t).filter(t=>[...t].length>=3&&!/^\d+$/.test(t)).map(t=>[...t].slice(0,5).join('')))]);
 const tdf=new Map();tt.forEach(a=>a.forEach(t=>tdf.set(t,(tdf.get(t)||0)+1)));
 const inv=new Map();tt.forEach((a,i)=>a.forEach(t=>{if(tdf.get(t)>600)return;let l=inv.get(t);if(!l)inv.set(t,l=[]);l.push(i)}));
 const byCat=new Map();docs.forEach((d,i)=>{const c=sideOf(d.s)+'|'+d.c;let l=byCat.get(c);if(!l)byCat.set(c,l=[]);l.push(i)});
 const pos=new Map();for(const l of byCat.values())l.forEach((i,p)=>pos.set(i,p));
 const out=path.join(ROOT,'rel');rmrf(out);fs.mkdirSync(out);const files={};let size=0,bySim=0;
 docs.forEach((d,i)=>{const sc=new Map(),side=sideOf(d.s);
  for(const t of tt[i]){const l=inv.get(t);if(!l)continue;const w=Math.log(N/tdf.get(t));for(const j of l)if(j!==i&&sideOf(docs[j].s)===side)sc.set(j,(sc.get(j)||0)+w)}
  const top=[...sc].map(([j,v])=>[j,v*(docs[j].c===d.c?1.15:1)]).filter(x=>x[1]>=6).sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
  const pick=[],seenT=new Set([foldBn(d.t)]);
  for(const[j]of top){const ft=foldBn(docs[j].t);if(seenT.has(ft)||!docs[j].t)continue;seenT.add(ft);pick.push(j);if(pick.length===REL_N)break}
  bySim+=pick.length;
  if(pick.length<REL_N){const l=byCat.get(side+'|'+d.c),p=pos.get(i);for(let o=1;o<l.length&&pick.length<REL_N;o++){const j=l[(p+o)%l.length],ft=foldBn(docs[j].t);if(j===i||seenT.has(ft)||!docs[j].t)continue;seenT.add(ft);pick.push(j)}}
  const f=d.k.slice(-2);(files[f]=files[f]||{})[d.k]=[cut(d.t,110),d.c,pick.map(j=>docs[j].k).join('')]});
 for(const f in files){const s=JSON.stringify(files[f]);size+=Buffer.byteLength(s);fs.writeFileSync(path.join(out,f+'.json'),s)}
 console.log('rel: files',Object.keys(files).length,'MB',(size/1e6).toFixed(1),'by title similarity',(bySim/(N*REL_N)*100).toFixed(0)+'%');
}

/* ---- ৩) শেয়ার-পাতা ---- */
if(!ONLY||ONLY==='share'){
 const out=path.join(ROOT,'s');rmrf(out);fs.mkdirSync(out);let size=0;
 for(const d of docs){const title=esc(cut(d.t||'DAWAH X',110)),desc=esc(cut(plain(d.h).replace(/^(প্রশ্ন|উত্তর)\s*[:ঃ]?\s*/,''),120)||'কুরআন ও সুন্নাহর আলোকে প্রশ্নোত্তর'),q='k='+d.k+'&from='+sideOf(d.s);
  /* crawler স্ক্রিপ্ট চালায় না, তাই og ট্যাগ পড়ে; পাঠকের ব্রাউজার সাথে সাথে পাঠ-পাতায় যায় */
  const s=`<!doctype html><html lang="bn"><meta charset="utf-8"><title>DAWAH X</title><meta name="robots" content="noindex,follow"><meta property="og:type" content="article"><meta property="og:site_name" content="DAWAH X"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${SITE}s/${d.k}.html"><meta property="og:image" content="${SITE}og-image.jpg"><meta name="twitter:card" content="summary_large_image"><script>location.replace("../read.html?${q}"+location.hash)</script><a href="../read.html?${esc(q)}">লেখাটি পড়ুন — DAWAH X</a>\n`;
  size+=Buffer.byteLength(s);fs.writeFileSync(path.join(out,d.k+'.html'),s)}
 console.log('share: files',N,'MB',(size/1e6).toFixed(1));
}
