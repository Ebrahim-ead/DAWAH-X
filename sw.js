/* DAWAH X — service worker.
   উদ্দেশ্য: ইন্টারনেট না থাকলেও আগে খোলা পাতা ও আগে পড়া লেখা দেখানো।
   নিয়ম: সব সময় আগে ইন্টারনেট থেকে আনা হয় (তাই সাইটের নতুন সংস্করণ সাথে সাথে দেখা যায়);
         আনা না গেলে তবেই জমানো কপি দেওয়া হয়। শুধু নিজের সাইটের ফাইল ও Google Fonts জমানো হয়।
   কোনো ফাইলের তালিকা বদলালে VERSION বাড়ান — পুরোনো জমা মুছে যায়। */
'use strict';
const VERSION='v80';
const SHELL='dawahx-shell-'+VERSION;   /* পাতার কাঠামো: HTML, CSS, JS, লোগো (ইনস্টলের সময় আনা হয়) */
const PAGES='dawahx-pages-'+VERSION;   /* ব্যবহারের সময় আনা অন্য ফাইল */
const TEXTS='dawahx-texts-'+VERSION;   /* পড়া লেখা (texts/, rel/) */
const FONTS='dawahx-fonts-'+VERSION;
const LIMIT={[PAGES]:120,[TEXTS]:300,[FONTS]:30};
const PRECACHE=['./','index.html','about.html','services.html','questions.html','topics.html','series.html','sources.html','recent.html','faq.html','topic-evil.html','topic-existence.html','topic-hadith.html','topic-prophet.html','topic-quran.html','topic-science.html','topic-sharia.html','topic-women.html','fatwa.html','videos.html','ask.html','contact.html','read.html','saved.html','policy.html','404.html',
 'quran.html','hadith.html','islamic-books.html','islamic-book-collection.html','islamic-book-read.html','islamic-books-hero.jpg','islamic-books.css','islamic-books.js','islamic-books-catalog.js','scripture-shell.js','scripture-route.js','scripture-style.css','scripture-fflate.js','scripture-app.js','scripture-surahs.js','scripture-quran-data.js','scripture-quran-meta.js','scripture-bn-index.js','scripture-hadith-index.js','scripture-tafsir-ibn-kathir-index.js','scripture-bn-1.js','scripture-en-1.js','scripture-hafs.woff2','scripture-bengali.woff2',
 'style.css','app.js','reader-assistant-search.js','assistant.js','assistant.css','assistant-logo.webp','features.js','prayer-times.js','quote-card.js','discovery.js','effects.js','live.js','youtube-gallery.js','logo.webp','logo-dark.webp','logo-icon.webp','favicon.svg','hero.webp','hero-sm.webp','hero.jpg','founder.webp','founder-sm.webp','fonts-arabic.css','manifest.webmanifest','stats.json','cross-links.json','texts/index.json'];
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];
const OFFLINE='<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ইন্টারনেট সংযোগ নেই — DAWAH X</title>'
 +'<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#08151a;color:#edf3fa;font-family:system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box">'
 +'<div style="max-width:420px"><h1 style="font-size:22px;color:#f6c453;margin:0 0 12px">ইন্টারনেট সংযোগ নেই</h1>'
 +'<p style="line-height:1.8;margin:0 0 18px">এই পাতাটি আগে খোলা হয়নি, তাই ইন্টারনেট ছাড়া দেখানো যাচ্ছে না। সংযোগ ফিরলে আবার চেষ্টা করুন।</p>'
 +'<p style="margin:0"><a href="'+self.registration.scope+'index.html" style="color:#ffe09a">হোম পেজে যান</a></p></div></body></html>';

self.addEventListener('install',event=>{
 /* একই সঙ্গে অল্প কয়েকটি অফলাইন ফাইল আনি, যাতে প্রথম পাতার ছবির সাথে ব্যান্ডউইথের প্রতিযোগিতা না হয়। */
 event.waitUntil(caches.open(SHELL).then(async cache=>{
  let next=0;
  const worker=async()=>{while(next<PRECACHE.length){const url=PRECACHE[next++];try{const res=await fetch(new Request(url,{cache:'reload'}));if(res.ok)await cache.put(url,res)}catch(_){}}};
  await Promise.all(Array.from({length:3},worker));
 }).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
 const keep=new Set([SHELL,PAGES,TEXTS,FONTS]);
 event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('dawahx-')&&!keep.has(n)).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));
});

/* জমা নির্দিষ্ট সংখ্যার বেশি হলে সবচেয়ে পুরোনোগুলো বাদ */
const trim=name=>caches.open(name).then(cache=>cache.keys().then(keys=>{const extra=keys.length-(LIMIT[name]||100);
 return extra>0?Promise.all(keys.slice(0,extra).map(k=>cache.delete(k))):null})).catch(()=>{});
const store=(name,request,response)=>caches.open(name).then(cache=>cache.put(request,response)).then(()=>trim(name)).catch(()=>{});

const fromCache=async(request,isPage,name)=>{
 // The network-first runtime cache may contain a newer version of a precached
 // file. Search it before the install-time shell and never use unrelated caches.
 const runtime=await caches.open(name),shell=await caches.open(SHELL);
 let hit=await runtime.match(request)||await shell.match(request);
 /* read.html?k=…: fall back to the cached page shell without its query. */
 if(!hit&&isPage)hit=await runtime.match(request,{ignoreSearch:true})||await shell.match(request,{ignoreSearch:true});
 if(!hit&&isPage&&new URL(request.url).pathname.endsWith('/'))hit=await runtime.match('index.html')||await shell.match('index.html');
 return hit;
};

self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 let url;try{url=new URL(request.url)}catch(_){return}
 if(url.protocol!=='https:'&&url.protocol!=='http:')return;
 if(request.headers.has('range'))return;

 /* ফন্ট (নিজের সাইটের fonts/ ফোল্ডার): জমানো থাকলে সেটিই, সাথে পেছনে নতুনটি আনা */
 if(url.origin===self.location.origin&&/\/fonts\/[^/]+\.woff2$/.test(url.pathname.toString())){
  event.respondWith(caches.open(FONTS).then(cache=>cache.match(request)).catch(()=>null).then(hit=>{
   const fresh=fetch(request).then(res=>{if(res&&res.ok)event.waitUntil(store(FONTS,request,res.clone()));return res});
   if(hit){event.waitUntil(fresh.catch(()=>{}));return hit}
   return fresh;
  }));
  return;
 }

 /* Google Fonts (পুরোনো জমানো কপি থাকলে): জমানো থাকলে সেটিই, সাথে পেছনে নতুনটি আনা */
 if(FONT_HOSTS.includes(url.hostname)){
  event.respondWith(caches.open(FONTS).then(cache=>cache.match(request)).catch(()=>null).then(hit=>{
   const fresh=fetch(request).then(res=>{if(res&&(res.ok||res.type==='opaque'))event.waitUntil(store(FONTS,request,res.clone()));return res});
   if(hit){event.waitUntil(fresh.catch(()=>{}));return hit}
   return fresh;
  }));
  return;
 }
 if(url.origin!==self.location.origin)return;          /* YouTube ইত্যাদি: হাত দেওয়া হয় না */

 const isPage=request.mode==='navigate';
 const path=url.pathname;
 /* live.json সবসময় ইন্টারনেট থেকে (কতক্ষণ লাইভ আছে তা জমানো কপিতে ঠিক থাকবে না) */
 if(/\/live\.json$/.test(path)){event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>new Response('{"v":1,"live":[]}',{status:200,headers:{'Content-Type':'application/json'}})));return}
 const name=/\/(texts|rel)\/[^/]+\.json$/.test(path)?TEXTS:PAGES;
 event.respondWith(
  fetch(request).then(res=>{
   if(res&&res.ok&&res.type==='basic')event.waitUntil(store(name,request,res.clone()));
   return res;
  }).catch(async()=>{
   const hit=await fromCache(request,isPage,name).catch(()=>null);
   if(hit)return hit;
   if(isPage)return new Response(OFFLINE,{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
   return Response.error();
  })
 );
});
