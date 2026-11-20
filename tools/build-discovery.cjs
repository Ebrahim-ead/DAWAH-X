#!/usr/bin/env node
/* Build source browsing and chronological publication lists from local data. */
'use strict';
const fs=require('fs'),path=require('path');const {ROOT,SITE,fromQuestions}=require('./page-template.cjs');
const SRC={at:'মাসিক আত-তাহরীক',ai:'মাসিক আল-ইতিছাম',ik:'মাসিক আল-ইখলাছ',fm:'From Muslims',ra:'Response to Anti-Islam',iz:'Insight Zone',ia:'Islamic Authors'};
const {textDate}=require('./text-date.cjs');
const latin=v=>String(v||'').replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c)));
const dateOf=v=>{const d=textDate(v);return d.length===7?d+'-01':d};
const sources={};for(const code in SRC)sources[code]=[];const recent=[];
for(const f of fs.readdirSync(path.join(ROOT,'texts'))){if(!/^[0-9a-f]{3}\.json$/.test(f))continue;const o=JSON.parse(fs.readFileSync(path.join(ROOT,'texts',f),'utf8'));for(const k in o){const x=o[k],t=latin(x.t||'').trim();if(!sources[x.s]||!t)continue;const row=[k,t,x.s==='ai'||x.s==='at'?'f':'q'];sources[x.s].push(row);const d=dateOf(x.d);if(d)recent.push({k,t,s:x.s,d,shown:latin(x.d)})}}
for(const code in sources)sources[code].sort((a,b)=>a[1].localeCompare(b[1],'bn')||a[0].localeCompare(b[0]));
recent.sort((a,b)=>b.d.localeCompare(a.d)||a.k.localeCompare(b.k));
const videos=JSON.parse(fs.readFileSync(path.join(ROOT,'youtube-videos.json'),'utf8')).filter(v=>v&&/^[\w-]{11}$/.test(v.id||'')&&v.title&&!Number.isNaN(Date.parse(v.publishedAt))).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,100).map(v=>({id:v.id,t:latin(v.title),c:v.channelTitle||'',d:v.publishedAt}));
const write=(f,data)=>{const p=path.join(ROOT,f),str=typeof data==='string'?data:JSON.stringify(data);let old='';try{old=fs.readFileSync(p,'utf8')}catch(_){}if(str!==old)fs.writeFileSync(p,str)};
write('source-data.json',{v:1,names:SRC,sources});write('recent-data.json',{v:1,names:SRC,texts:recent.slice(0,100),videos});
const sourceSection=`<section id="sources" style="padding-top:0"><div class="wrap"><div class="title"><h1>প্রকাশনা অনুযায়ী লেখা</h1><p>মূল প্রকাশনা বেছে নিয়ে তার সংগ্রহ দেখুন।</p></div><div id="source-browser"><p>তালিকা লোড হচ্ছে…</p></div><noscript>তালিকা দেখতে JavaScript চালু করুন।</noscript></div></section>`;
const recentSection=`<section id="recent" style="padding-top:0"><div class="wrap"><div class="title"><h1>সাম্প্রতিক লেখা ও ভিডিও</h1><p>সূত্রে পাওয়া প্রকাশের তারিখ অনুযায়ী সাজানো। আমদানির তারিখ সব লেখার জন্য সংরক্ষিত নেই।</p></div><div id="recent-browser"><p>তালিকা লোড হচ্ছে…</p></div><noscript>তালিকা দেখতে JavaScript চালু করুন।</noscript></div></section>`;
for(const [id,section,title,desc] of [['sources',sourceSection,'প্রকাশনা অনুযায়ী লেখা','প্রকাশনার উৎস অনুযায়ী DAWAH X-এর লেখা খুঁজুন।'],['recent',recentSection,'সাম্প্রতিক লেখা ও ভিডিও','প্রকাশের তারিখ অনুযায়ী সাম্প্রতিক লেখা ও ভিডিও।']]){
 let h=fromQuestions({sectionId:id,section,title:title+' — DAWAH X',description:desc,url:SITE+id+'.html',pageId:id});h=h.replace('<script src="effects.js"></script>','<script src="discovery.js"></script>\n<script src="effects.js"></script>');write(id+'.html',h);
}
console.log('discovery:',Object.keys(sources).length,'sources,',recent.length,'dated texts,',videos.length,'recent videos');
