#!/usr/bin/env node
/* DAWAH X — texts/ থেকে তিনটি জিনিস তৈরি করে (লেখা আমদানির পর প্রতিবার চালাতে হয়; workflow নিজেই চালায়):
   ১) search/  — লেখার ভেতরের শব্দের সূচি (প্রশ্নোত্তর ও ফতোয়া পাতার সার্চ-বক্স এখান থেকে খোঁজে)
   ২) rel/     — প্রতিটি লেখার নিচে "এ বিষয়ে আরও পড়ুন"-এর তালিকা
   ৩) s/       — প্রতিটি লেখার ছোট শেয়ার-পাতা (Facebook/WhatsApp-এ লেখার নিজের শিরোনাম দেখানোর জন্য)
   search/titles.json, search/tNN.json — শুধু শিরোনামের শব্দের সূচি (প্রশ্ন পাঠানোর পাতা লেখার সময় মিলে-যাওয়া লেখা দেখাতে এটি ব্যবহার করে)
   চালানো: node tools/build-site-data.cjs            (সাইটের ঠিকানা tools/site.json থেকে নেয়) */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {excerptSource}=require('./article-excerpt.cjs');
const ROOT=path.join(__dirname,'..'),TEXTS=path.join(ROOT,'texts');
const SITE=JSON.parse(fs.readFileSync(path.join(__dirname,'site.json'),'utf8')).url.replace(/\/*$/,'/');
const SHARDS=512,REL_N=5;
const ONLY=process.argv[2]||''; /* "search" | "titles" | "rel" | "share" দিলে শুধু সেটি ("search" দিলে titles-ও হয়) */

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
 for(const k in d){const x=d[k];docs.push({k,s:x.s,c:x.c||'',t:String(x.t||'').replace(/\s+/g,' ').trim(),h:x.h||'',d:x.d||'',a:x.a||'',u:/^https?:\/\//i.test(x.u||'')?x.u:''})}}
docs.sort((a,b)=>a.k<b.k?-1:1);
const N=docs.length;console.log('texts',N);
/* ---- সিরিজ চেনা (পর্ব / কিস্তি) ----
   শিরোনামের শেষে বন্ধনীর ভেতর বা «– পর্ব ১» ধাঁচে লেখা থাকলে একই নামের লেখা জোড়া হয়।
   নাম মেলাতে সার্চের উচ্চারণ-ভাঁজ ব্যবহার করা হয় না—দুটি আলাদা শিরোনাম ভুল করে এক সিরিজে যাবে না। */
const BN_ORD={প্রথম:1,দ্বিতীয়:2,দ্বিতীয়:2,তৃতীয়:3,তৃতীয়:3,চতুর্থ:4,পঞ্চম:5,ষষ্ঠ:6,সপ্তম:7,অষ্টম:8,নবম:9,দশম:10,একাদশ:11,দ্বাদশ:12,ত্রয়োদশ:13,ত্রয়োদশ:13,চতুর্দশ:14,পঞ্চদশ:15,ষোড়শ:16,ষোড়শ:16,সপ্তদশ:17,অষ্টাদশ:18,ঊনবিংশ:19,বিংশ:20};
const BN2EN=v=>String(v||'').replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c)));
const partMarker=t=>{
 const s=String(t||'').replace(/\s+/g,' ').trim();
 let m=/\(([^()]*(?:কিস্তি|পর্ব)[^()]*)\)\s*$/u.exec(s);
 if(m)return {name:s.slice(0,m.index).trim(),mark:m[1]};
 const ord='(?:[০-৯]+|[0-9]+|প্রথম|দ্বিতীয়|দ্বিতীয়|তৃতীয়|তৃতীয়|চতুর্থ|পঞ্চম|ষষ্ঠ|সপ্তম|অষ্টম|নবম|দশম|একাদশ|দ্বাদশ|ত্রয়োদশ|ত্রয়োদশ|চতুর্দশ|পঞ্চদশ|ষোড়শ|ষোড়শ|সপ্তদশ|অষ্টাদশ|ঊনবিংশ|বিংশ)';
 m=new RegExp('^(.*?)\\s*[–—-]\\s*(?:পর্ব|কিস্তি)\\s*[-–—:]?\\s*('+ord+')(?:তম|ম|য়)?(?:\\s*\\[(?:শেষ\\s+)?(?:পর্ব|কিস্তি)\\])?\\s*$','u').exec(s);
 if(m)return {name:m[1].trim(),mark:m[2]};
 m=new RegExp('^(.*?)\\s+('+ord+')(?:তম|ম|য়)?\\s*(?:পর্ব|কিস্তি)\\s*$','u').exec(s);
 if(m)return {name:m[1].trim(),mark:m[2]};
 m=new RegExp('^(.*?)\\s+(?:পর্ব|কিস্তি)\\s*[-–—:]?\\s*('+ord+')(?:তম|ম|য়)?\\s*$','u').exec(s);
 if(m)return {name:m[1].trim(),mark:m[2]};
 return null;
};
const partNo=mark=>{
 const s=String(mark||'');if(/শেষ/u.test(s))return 999;
 const d=/[০-৯]+|[0-9]+/u.exec(s);if(d)return +BN2EN(d[0])||0;
 for(const w in BN_ORD)if(s.includes(w))return BN_ORD[w];
 return 0;
};
const seriesNameKey=name=>String(name||'').normalize('NFC').toLowerCase()
 .replace(/[’‘'"“”]/g,'').replace(/[।,!?;:()[\]{}—–-]+/g,' ').replace(/\s+/g,' ').trim();
const seriesOf=t=>{
 const p=partMarker(t);if(!p||p.name.length<4)return null;
 const no=partNo(p.mark);if(!no)return null;
 const key=seriesNameKey(p.name);if(key.length<4)return null;
 return {key,name:p.name,no};
};
const seriesByName=new Map();
for(const d of docs){
 const si=seriesOf(d.t);if(!si)continue;
 let arr=seriesByName.get(si.key);if(!arr)seriesByName.set(si.key,arr=[]);
 arr.push({k:d.k,no:si.no,t:d.t,name:si.name});
}
const series=[...seriesByName.entries()].filter(([,a])=>a.length>=2 && new Set(a.map(p=>p.no)).size===a.length)
 .map(([key,a])=>({key,id:crypto.createHash('sha1').update(key).digest('hex').slice(0,10),t:a[0].name,
  parts:a.slice().sort((x,y)=>x.no-y.no||(x.k<y.k?-1:1))}))
 .sort((a,b)=>a.t.localeCompare(b.t,'bn')||(a.id<b.id?-1:1));
const seriesMap=new Map();
series.forEach(sr=>sr.parts.forEach((p,idx)=>seriesMap.set(p.k,{ser:sr,idx})));
console.log('series',series.length,'texts in series',seriesMap.size);


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

/* ---- ১খ) শিরোনামের সূচি (প্রশ্ন পাঠানোর পাতার জন্য): search/titles.json + search/tNN.json
   titles.json = {v,n,shards,side,len}; side = প্রতিটি লেখার জন্য ১ বিট (base64): ১ = ফতোয়ার দিক (from=f), ০ = প্রশ্নোত্তরের দিক (from=q)
                 len = প্রতিটি লেখার জন্য ১ অক্ষর: শিরোনামে কয়টি শব্দ (০–৬৩; নিচের LEN_CHARS-এর অবস্থান) — ছোট শিরোনামের মিলকে বেশি গুরুত্ব দিতে
   tNN.json    = {শব্দ: কোন কোন লেখার শিরোনামে আছে} — search/NNN.json-এর মতোই সংকেত ও একই ভাগের নিয়ম (শুধু ভাগ ৬৪টি);
                 শুধু-সংখ্যা এবং ১২%-এর বেশি শিরোনামে থাকা শব্দ বাদ ---- */
if(!ONLY||ONLY==='search'||ONLY==='titles'){
 const TSHARDS=64,post=new Map(),LEN_CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let len='';
 docs.forEach((d,i)=>{const seen=new Set(searchTokens(d.t).filter(t=>!/[\u0600-\u06ff]/.test(t)&&!/^\d+$/.test(t)));len+=LEN_CHARS[Math.min(63,seen.size)];
  for(const t of seen){let a=post.get(t);if(!a)post.set(t,a=[]);a.push(i)}});
 const cap=Math.floor(N*0.12),files=Array.from({length:TSHARDS},()=>({})),typoWords=[];let kept=0,dropped=0;
 for(const[tok,a]of[...post].sort((x,y)=>x[0]<y[0]?-1:1)){if(a.length>cap){dropped++;continue}
  const bytes=[];let prev=-1;for(const id of a){let v=id-prev;prev=id;while(v>127){bytes.push((v&127)|128);v>>>=7}bytes.push(v)}
  files[shardOf(tok)%TSHARDS][tok]=Buffer.from(bytes).toString('base64').replace(/=+$/,'');
  if(/^[\u0980-\u09ff]+$/u.test(tok)&&[...tok].length>=4&&[...tok].length<=24)typoWords.push(tok);kept++}
 const bits=Buffer.alloc(Math.ceil(N/8));docs.forEach((d,i)=>{if(sideOf(d.s)==='f')bits[i>>3]|=1<<(i&7)});
 const out=path.join(ROOT,'search');fs.mkdirSync(out,{recursive:true});let size=0,max=0;
 files.forEach((o,i)=>{const s=JSON.stringify(o);size+=Buffer.byteLength(s);max=Math.max(max,Buffer.byteLength(s));fs.writeFileSync(path.join(out,'t'+String(i).padStart(2,'0')+'.json'),s)});
 // Bind the lazily loaded vocabulary to its title index so a stale cached
 // vocabulary cannot be silently paired with a different set of articles.
 const typoHash=crypto.createHash('sha256').update(JSON.stringify(typoWords)).digest('hex');
 fs.writeFileSync(path.join(out,'titles.json'),JSON.stringify({v:1,n:N,shards:TSHARDS,side:bits.toString('base64'),len,typoHash}));
 // Loaded only for a single unmatched assistant query word. Candidate discovery
 // remains bounded and the original question is never silently rewritten.
 fs.writeFileSync(path.join(out,'typo-vocab.json'),JSON.stringify({v:1,n:N,hash:typoHash,words:typoWords}));
 console.log('titles: tokens',kept,'dropped (too common)',dropped,'KB',Math.round(size/1e3),'largest shard KB',Math.round(max/1e3));
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

/* ---- সিরিজ-তথ্য: read.html, series.html ও সিরিজের পাতার জন্য ---- */
if(!ONLY||ONLY==='share'){
 const payload={v:1,n:series.length,
  s:series.map(sr=>({id:sr.id,t:sr.t,p:sr.parts.map(p=>[p.k,p.t,p.no])})),
  m:Object.fromEntries(series.flatMap((sr,i)=>sr.parts.map((p,idx)=>[p.k,[i,idx]])))};
 const f=path.join(ROOT,'series.json'),str=JSON.stringify(payload);
 let old='';try{old=fs.readFileSync(f,'utf8')}catch(e){}
 if(old!==str)fs.writeFileSync(f,str);
 console.log('series.json',(Buffer.byteLength(str)/1024).toFixed(0)+'KB','series',payload.n);
}

/* ---- ৩) প্রতিটি লেখার নিজের পাতা (s/<key>.html) ----
   দুটি রকম পাতা:
   (ক) সূচিবদ্ধ ল্যান্ডিং পাতা — নিজের শিরোনাম, বিবরণ, লেখার প্রথম অংশ, canonical, Article
       স্কিমা ও ভেতরের লিংক; গুগল/বিং এগুলো পড়ে পাঠক সরাসরি আসে। পুরো লেখা ও সুবিধা
       (বড় করা, শোনা, সংরক্ষণ) পাঠকের পাতায় — read.html (noindex, তাই নকল কনটেন্ট নেই)।
   (খ) বাকি লেখার শেয়ার-স্টাব — আগের মতোই og-ট্যাগ + সাথে সাথে read.html-এ রিডাইরেক্ট।
   কী কী ল্যান্ডিং পাতা হবে: ডিফল্টে সব লেখা; SHARE_MAX=<n> দিলে কেবল নবীনতম n-টি,
   লেখার অংশ: SHARE_EXCERPT অক্ষর (ডিফল্ট ৯০০)। SHARE_LIMIT=<n> শুধু পরীক্ষার জন্য।
   * পাতা আগেরটার সাথে হুবহু মিললে ফাইল আর লেখা হয় না (incremental) — তাই প্রতিবার
     পুরো তালিকা চালালেও কেবল বদলানো/নতুন লেখার পাতা লেখা হয়।
   * সাইটম্যাপে কেবল ল্যান্ডিং পাতাগুলোই যায় (sitemap-articles-N.xml, ২০ হাজার করে),
     robots.txt-এ সেই খণ্ডগুলোর ঠিকানা যোগ হয়। */
if(!ONLY||ONLY==='share'){
 const out=path.join(ROOT,'s');if(!fs.existsSync(out))fs.mkdirSync(out);
 const LIMIT=+process.env.SHARE_LIMIT||0;
 const RAW=process.env.SHARE_MAX,MAX=RAW==null?0:(+RAW||0);      /* ডিফল্ট 0 = সব লেখা; SHARE_MAX=3000 দিলে কেবল ৩০০০ */
 const EXCERPT=+process.env.SHARE_EXCERPT||900;
 const PAGE_V='ax5';
 const SRC={ai:'মাসিক আল-ইতিছাম',at:'মাসিক আত-তাহরীক',ik:'মাসিক আল-ইখলাছ',ra:'Response to Anti-Islam',fm:'From Muslims',ia:'Islamic Authors',iz:'Insight Zone'};
 /* ---- লেখার HTML পরিষ্কার (সার্ভার-সাইড: শুধু নিরাপদ ট্যাগ, বাইরের লিংক nofollow) ---- */
 const OK_TAGS=new Set(['p','b','strong','i','em','u','br','ul','ol','li','blockquote','h2','h3','h4','sup','sub','cite','span','a','small','hr','table','thead','tbody','tr','td','th']);
 const clean=h=>String(h||'')
  .replace(/<(script|style|iframe|object|embed|form|input|button|link|meta|svg|audio|video)\b[\s\S]*?<\/\1>/gi,' ')
  .replace(/<\/?(script|style|iframe|object|embed|form|input|button|link|meta|svg|audio|video)\b[^>]*>/gi,' ')
  .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g,(m,tag,attr)=>{
   const t=tag.toLowerCase(),closing=m.charAt(1)==='/';
   if(!OK_TAGS.has(t))return ' ';
   if(t==='a'){if(closing)return '</a>';
    const h=(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attr)||[]),u=(h[2]||h[3]||h[4]||'').trim();
    return /^https?:\/\//i.test(u)?'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer nofollow">':'<span>'}
   return closing?'</'+t+'>':'<'+t+'>'})
  .replace(/\s+/g,' ').replace(/>\s+</g,'><').trim();
 const {textDate:isoDate}=require('./text-date.cjs');
 const toEn=v=>String(v).replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c)));

 /* কোন লেখাগুলো ল্যান্ডিং পাতা হবে (নবীনতম আগে) */
 const docsWithIso=docs.map(d=>({d,iso:isoDate(d.d)})).sort((a,b)=>b.iso===a.iso?0:(b.iso>a.iso?1:-1));
 const pickedSet=new Set((LIMIT?docs.slice(0,LIMIT).map(d=>d.k):(MAX?docsWithIso.slice(0,MAX).map(x=>x.d.k):docs.map(d=>d.k))));

 const stubOf=(d,title,desc,q)=>({body:`<!doctype html><html lang="bn"><meta charset="utf-8"><title>DAWAH X</title><meta name="robots" content="noindex,follow"><meta property="og:type" content="article"><meta property="og:site_name" content="DAWAH X"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${SITE}s/${d.k}.html"><meta property="og:image" content="${SITE}og-image.jpg"><meta name="twitter:card" content="summary_large_image"><script>location.replace("../read.html?${q}"+location.hash)</script><a href="../read.html?${esc(q)}">লেখাটি পড়ুন — DAWAH X</a>\n`});

 const written=new Set();let size=0,changed=0,kept=0,art=0,stub=0;
 const list=LIMIT?docs.slice(0,LIMIT):docs;
 for(const d of list){
  const full=d.t||'',t=cut(full,180),titleAttr=esc(cut(full,110)),src=SRC[d.s]||'',date=toEn(d.d||''),iso=isoDate(date);
  const excerptHtml=excerptSource(d.h,d.s);
  const q='k='+d.k+'&from='+sideOf(d.s);
  let page;
  if(pickedSet.has(d.k)){
   art++;
   const paras=[...excerptHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>m[1]);
   let bodyHtml='',used=0;
   for(const raw of (paras.length?paras:[excerptHtml])){
    if(used>=EXCERPT)break;
    const piece=clean(raw);
    if(!piece)continue;
    const txt=plain(piece);
    if(txt.length<=EXCERPT-used){bodyHtml+='<p>'+esc(txt)+'</p>';used+=txt.length}
    else{bodyHtml+='<p>'+esc(cut(txt,EXCERPT-used))+'</p>';used=EXCERPT}
   }
   if(!bodyHtml)bodyHtml='<p>'+esc(cut(plain(excerptHtml)||t,EXCERPT))+'</p>';
   if(plain(excerptHtml).length>EXCERPT)bodyHtml+='<p class="article-note">…লেখাটি এখানে সংক্ষেপে দেওয়া হলো।</p>';
   const desc=cut(plain(excerptHtml).replace(/^(প্রশ্ন|উত্তর)\s*[:ঃ]?\s*/,''),155)||'কুরআন ও সুন্নাহর আলোকে লেখা';
   const url=SITE+'s/'+d.k+'.html',isF=sideOf(d.s)==='f';
   const sec=isF?'fatwa.html':'questions.html',secName=isF?'ইসলামিক প্রশ্নোত্তর':'নাস্তিকতা বিষয়ক প্রশ্নোত্তর';
   const sp=seriesMap.get(d.k);let seriesNav='';
   if(sp){
    const {ser,idx}=sp,prev=ser.parts[idx-1],next=ser.parts[idx+1];
    seriesNav='<nav class="series-inline" aria-label="লেখার সিরিজ"><a class="series-all" href="../series-'+ser.id+'.html">'+esc(toEn(ser.t))+' — '+ser.parts.length+'টি পর্বের সূচি →</a>'
     +(prev?'<a href="../s/'+prev.k+'.html">← আগের: '+esc(toEn(prev.t))+'</a>':'')
     +(next?'<a href="../s/'+next.k+'.html">পরের: '+esc(toEn(next.t))+' →</a>':'')+'</nav>';
   }
   let schema=Object.assign({'@context':'https://schema.org','@type':'Article',
     headline:t,description:desc,inLanguage:'bn',url,mainEntityOfPage:{'@type':'WebPage','@id':url},
     image:SITE+'og-image.jpg',isAccessibleForFree:true,
     publisher:{'@type':'Organization',name:'DAWAH X',url:SITE,logo:{'@type':'ImageObject',url:SITE+'icon-512.png'}},
     author:d.a?{'@type':'Person',name:toEn(d.a)}:{'@type':'Organization',name:src||'DAWAH X'}},iso?{datePublished:iso}:{},d.u?{isBasedOn:d.u}:{});
   const ld=JSON.stringify(schema).replace(/</g,'\\u003c');
   const meta=[src,toEn(d.a||''),date].filter(Boolean).map(v=>'<span>'+esc(v)+'</span>').join('<span aria-hidden="true">·</span>');
   page='<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    +'<title>'+esc(t)+' — DAWAH X</title><meta name="description" content="'+esc(desc)+'">'
    +'<link rel="canonical" href="'+url+'"><meta name="robots" content="index,follow,max-image-preview:large">'
    +'<meta property="og:type" content="article"><meta property="og:site_name" content="DAWAH X"><meta property="og:locale" content="bn_BD">'
    +'<meta property="og:title" content="'+esc(t)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+url+'">'
    +'<meta property="og:image" content="'+SITE+'og-image.jpg"><meta name="twitter:card" content="summary_large_image">'
    +'<meta name="theme-color" content="#08151a"><link rel="icon" href="../favicon.svg">'
    +'<meta name="referrer" content="strict-origin-when-cross-origin">'
    +'<link rel="alternate" type="application/rss+xml" title="DAWAH X — নতুন লেখা ও ভিডিও" href="../feed.xml">'
    +'<link rel="stylesheet" href="../style.css"><script type="application/ld+json">'+ld+'</script></head>'
    +'<body><a class="skip-link" href="#main">লেখায় যান</a><main id="main" class="wrap"><article class="article article-wrap">'
    +'<nav class="crumbs" aria-label="পথ"><a href="../index.html"><b>DAWAH X</b></a><span aria-hidden="true">›</span><a href="../'+sec+'">'+secName+'</a></nav>'
    +'<header class="article-head"><h1>'+esc(t)+'</h1><p class="article-meta">'+meta+'</p></header>'
    +'<div class="article-body">'+bodyHtml+'</div>'
    +'<div class="article-cta"><div><b>পুরো আলোচনাটি পড়ুন</b><p>বড় লেখা, শোনা (TTS) ও সংরক্ষণের সুবিধা — পাঠকের পাতায়।</p></div>'
    +'<a class="askbtn" href="../read.html?'+esc(q)+'">পাঠকের পাতায় খুলুন →</a></div>'
    +'<div class="article-share"><span>শেয়ার করুন:</span><a class="share-btn" href="https://wa.me/?text='+encodeURIComponent(t+'\n'+url)+'" target="_blank" rel="noopener noreferrer">WhatsApp</a>'
    +'<a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url)+'" target="_blank" rel="noopener noreferrer">Facebook</a></div>'
    +seriesNav
    +'<p class="article-note">'+(d.u?'এই লেখাটি <a href="'+esc(d.u)+'" target="_blank" rel="noopener noreferrer nofollow">'+esc(src||'মূল সূত্র')+'</a>-এ প্রকাশিত হয়েছিল।':'সূত্র: '+esc(src||'DAWAH X'))
    +' · <a href="../'+sec+'">সব '+secName+' দেখুন</a></p>'
    +'</article></main></body></html>\n';
  }else{
   stub++;
   const desc=esc(cut(plain(excerptHtml).replace(/^(প্রশ্ন|উত্তর)\s*[:ঃ]?\s*/,''),120)||'কুরআন ও সুন্নাহর আলোকে প্রশ্নোত্তর');
   page=stubOf(d,titleAttr,desc,q).body;
  }
  const f=path.join(out,d.k+'.html');written.add(d.k+'.html');size+=Buffer.byteLength(page);
  let old='';try{old=fs.readFileSync(f,'utf8')}catch(e){}
  if(old===page)kept++;else{fs.writeFileSync(f,page);changed++}
 }
 /* যে লেখার পাতা আর দরকার নেই সেগুলো মোছা (LIMIT-এ ছোঁয়া হয় না) */
 if(!LIMIT)for(const f of fs.readdirSync(out)){if(/^[0-9a-f]{14}\.html$/.test(f)&&!written.has(f))fs.unlinkSync(path.join(out,f))}

 /* sitemap.xml, its child sitemaps and robots.txt are built by tools/build-sitemaps.cjs. */
 console.log('share: landing',art,'stubs',stub,'changed',changed,'kept',kept,'MB',(size/1e6).toFixed(1),'(template '+PAGE_V+', excerpt '+EXCERPT+')');
}
