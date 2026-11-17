/* DAWAH X — মূল সাইট স্ক্রিপ্ট (সব পেজে একই ফাইল ব্যবহৃত হয়) */
"use strict";

/* ===== আপনার তথ্য এখানে বদলান ===== */
const LINKS={
  facebook:"https://www.facebook.com/profile.php?id=61595349861689",
  youtube:"https://www.youtube.com/@ead-s3b",
  whatsapp:"https://wa.me/8801783543026", /* WhatsApp নম্বর: দেশের কোডসহ, + বা ফাঁকা ছাড়া */
  personal:"https://ebrahim-ead.github.io/ead/" /* পরিচালকের ব্যক্তিগত সাইট — ফুটার ও “আমাদের সম্পর্কে” পাতার লিংক */
};
const MESSENGER="https://m.me/61595349861689"; /* প্রশ্ন এই Messenger ইনবক্সে যায় */
const ASK_ACTION="https://formsubmit.co/ajax/www.mdrazu55555@gmail.com"; /* FormSubmit (formsubmit.co): "প্রশ্ন পাঠান" চাপলে প্রশ্ন সরাসরি এই ইমেইল ঠিকানায় আসে। ঠিকানা বদলাতে /ajax/-এর পরের অংশ বদলান (FormSubmit-এর দেওয়া এলোমেলো কোডও বসানো যায়, তাতে ঠিকানাটি কোডে দেখা যায় না)। ফাঁকা ("") রাখলে আগের মতো Messenger খোলে */
/* ================================== */

const $=id=>document.getElementById(id);
const PAGE=document.body.dataset.page||"";

/* ---- সোশ্যাল লিংক ও ফুটার ---- */
document.querySelectorAll("[data-link]").forEach(a=>{const u=LINKS[a.dataset.link];if(!u||u.includes("YOUR_")){a.hidden=true;a.style.display="none"}else a.href=u});
{const yr=$("yr");if(yr)yr.textContent=new Date().getFullYear()}

/* ---- মোবাইল মেনু ---- */
{const menu=$("menu"),burger=$("burger");
 if(menu&&burger){burger.addEventListener("click",()=>menu.classList.toggle("open"));menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>menu.classList.remove("open")))}}

/* ---- লেখার লিংক কপি (উত্তরের পেজে) ---- */
document.querySelectorAll("[data-copy-link]").forEach(b=>b.addEventListener("click",async()=>{
 const url=b.dataset.copyLink||location.href,label=b.querySelector("span")||b,old=label.textContent;let ok=false;
 try{await navigator.clipboard.writeText(url);ok=true}catch(e){
  try{const ta=document.createElement("textarea");ta.value=url;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";document.body.appendChild(ta);ta.select();ok=document.execCommand("copy");ta.remove()}catch(e2){}}
 label.textContent=ok?"কপি হয়েছে ✓":"কপি করা যায়নি";setTimeout(()=>{label.textContent=old},2200)}));

/* ---- read.html: আমদানি করা লেখা দেখানো ---- */
const READ_TAGS={P:1,BR:1,B:1,I:1,U:1,SUP:1,SUB:1,H2:1,H3:1,H4:1,UL:1,OL:1,LI:1,BLOCKQUOTE:1,TABLE:1,THEAD:1,TBODY:1,TR:1,TD:1,TH:1,A:1,IMG:1};
/* উৎসের HTML আবার ছেঁকে নেওয়া হয়: শুধু নিরীহ ট্যাগ ও নিরাপদ লিংক থাকে */
function safeArticle(html,pageUrl){
 const doc=new DOMParser().parseFromString("<div>"+html+"</div>","text/html"),out=document.createDocumentFragment();
 const copy=(src,dst)=>{src.childNodes.forEach(n=>{
  if(n.nodeType===3){dst.appendChild(document.createTextNode(n.nodeValue));return}
  if(n.nodeType!==1)return;
  if(!READ_TAGS[n.tagName]){if(!/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|FORM)$/.test(n.tagName))copy(n,dst);return}
  const el=document.createElement(n.tagName);
  if(n.tagName==="A"){const h=n.getAttribute("href")||"",id=n.getAttribute("id")||"";
   if(/^x_?(ftn|ftnref|edn|ednref)\d+$/.test(id))el.id=id;
   if(/^#x_?(ftn|ftnref|edn|ednref)\d+$/.test(h))el.setAttribute("href",h);
   else if(/^https?:\/\//i.test(h)){el.setAttribute("href",h);el.target="_blank";el.rel="noopener nofollow"}}
  if(n.tagName==="IMG"){const src=n.getAttribute("src")||"";if(!/^https:\/\//i.test(src))return;el.src=src;el.alt=n.getAttribute("alt")||"";el.loading="lazy";el.decoding="async";el.referrerPolicy="no-referrer";
   /* ছবি মূল সাইট থেকে আসে। না এলে একবার Internet Archive-এ রাখা কপি চেষ্টা করা হয়; সেটিও না এলে ভাঙা ছবির বদলে মূল পেজের লিংকসহ ছোট টীকা */
   let retried=false;el.addEventListener("error",()=>{
    if(!retried&&!/^https:\/\/web\.archive\.org\//i.test(src)){retried=true;el.src="https://web.archive.org/web/2im_/"+src;return}
    const s=document.createElement(pageUrl?"a":"span");s.className="imgmiss";s.textContent="[ছবি"+(el.alt?": "+el.alt:"")+" — মূল পেজে দেখুন"+(pageUrl?" ↗":"")+"]";
    if(pageUrl){s.href=pageUrl;s.target="_blank";s.rel="noopener nofollow"}el.replaceWith(s)})}
  copy(n,el);dst.appendChild(el)})};
 copy(doc.body.firstChild,out);
 /* শিরোনামের স্তর সাজানো: পাতার h1-এর পরে h2 থেকে শুরু, মাঝে কোনো স্তর বাদ না পড়ে (স্ক্রিন-রিডারের জন্য); লেখা বদলায় না */
 const hs=[...out.querySelectorAll("h2,h3,h4")],used=[...new Set(hs.map(h=>+h.tagName[1]))].sort();let prev=1;
 hs.forEach(h=>{const lv=Math.min(used.indexOf(+h.tagName[1])+2,prev+1);prev=lv;if(lv!==+h.tagName[1]){const n=document.createElement("h"+lv);while(h.firstChild)n.appendChild(h.firstChild);h.replaceWith(n)}});
 /* আরবি অনুচ্ছেদ ডান থেকে বামে */
 out.querySelectorAll("p,li,blockquote,td").forEach(b=>{const t=b.textContent,ar=(t.match(/[\u0600-\u06ff]/g)||[]).length,bn=(t.match(/[\u0980-\u09ff]/g)||[]).length;if(ar>12&&ar>bn*3){b.lang="ar";b.dir="rtl";b.classList.add("ar")}});
 return out}
const readTitle=$("read-title");
if(readTitle){
 const P=new URLSearchParams(location.search),key=(P.get("k")||"").toLowerCase(),vid=P.get("v")||"",from=P.get("from")==="f"?"f":"q";
 const back=$("read-back"),body=$("read-body"),nav=document.querySelector("[data-read-nav]");
 const backHref=from==="f"?"fatwa.html":"questions.html",backLabel=from==="f"?"ফতোয়া":"প্রশ্নোত্তর";
 /* তালিকায় পাঠক যে বিভাগ / খোঁজ / পৃষ্ঠায় ছিলেন, "ফিরে যান" লিংক সেখানেই ফেরায় */
 let backTo=backHref;try{const s=sessionStorage.getItem("dawahx-list-"+from);if(s)backTo+="?"+s}catch(e){}
 if(back){back.href=backTo;back.textContent=backLabel}
 if(nav&&from==="f"){nav.classList.remove("on");const f=document.querySelector('#menu a[href="fatwa.html"]');if(f)f.classList.add("on")}
 const fail=msg=>{readTitle.textContent="লেখাটি পাওয়া যায়নি";body.innerHTML=`<p>${msg}</p><p><a class="askbtn" href="${backHref}">${backLabel} তালিকায় ফিরে যান</a></p>`};
 /* লেখার শেয়ার-লিংক s/<চাবি>.html — সেখানে লেখার নিজের শিরোনাম থাকে (Facebook/WhatsApp-এর প্রিভিউয়ের জন্য), খুললে এই পাতাতেই আসে */
 const shareLinks=(t,k)=>{const url=k?new URL("s/"+k+".html",location.href).href:location.href.split("#")[0],share=encodeURIComponent(t+"\n"+url);
  const cp=document.querySelector("#read-share [data-copy-link]");if(cp)cp.dataset.copyLink=url;
  $("read-wa").href="https://wa.me/?text="+share;$("read-fb").href="https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(url);$("read-share").hidden=false};
 /* সার্চ থেকে এলে (…&q=শব্দ) লেখার ভেতরে শব্দগুলো দাগিয়ে দেখানো হয়; বানানভেদও ধরা হয় */
 const markHits=(root,q)=>{const terms=[...new Set(searchTokens(q).slice(0,6).flatMap(searchAlts))];if(!terms.length)return;
  const VAR={"ি":"[িী]","ু":"[ুূ]","ই":"[ইঈ]","উ":"[উঊ]","স":"[সশষছ]","জ":"[জয]","ন":"[নণ]","ত":"(?:ত্ব|ত|ৎ)","ক":"(?:ক্ব|ক)","\u09df":"(?:\u09af\u09bc|\u09df)","\u09dc":"(?:\u09a1\u09bc|\u09dc)","\u09dd":"(?:\u09a2\u09bc|\u09dd)"};
  const pat=terms.map(t=>[...t].map(c=>/[0-9]/.test(c)?"["+c+BN_DIGITS[+c]+"]":VAR[c]||c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("[\\u200c\\u200d\\u0981‘’'ʼ]*")).join("|");
  let re;try{re=new RegExp("(^|[^\\p{L}\\p{M}\\p{N}])((?:"+pat+")[\\p{L}\\p{M}\\p{N}]*)","giu")}catch(e){return}
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  let n=0,first=null;
  for(const node of nodes){if(n>=300)break;const v=node.nodeValue;re.lastIndex=0;let m,last=0,frag=null;
   while(n<300&&(m=re.exec(v))){const a=m.index+m[1].length,b=a+m[2].length;frag=frag||document.createDocumentFragment();
    const mk=document.createElement("mark");mk.className="hit";mk.textContent=v.slice(a,b);frag.append(v.slice(last,a),mk);first=first||mk;last=b;n++}
   if(frag){frag.append(v.slice(last));node.replaceWith(frag)}}
  if(!first)return;
  const bar=document.createElement("p"),go=document.createElement("button");bar.className="hitbar";go.type="button";go.textContent="প্রথম মিলে যান ↓";
  go.addEventListener("click",()=>first.scrollIntoView({block:"center",behavior:"smooth"}));
  bar.append("“"+q.trim()+"” — এই লেখায় "+formatCount(n)+(n>=300?"+":"")+" জায়গায় পাওয়া গেছে। ",go);root.before(bar)};
 /* "এ বিষয়ে আরও পড়ুন": rel/<চাবির শেষ ২ অক্ষর>.json → {চাবি:[শিরোনাম,বিভাগ,"সম্পর্কিত চাবিগুলো"]} */
 const showRelated=k=>{const box=$("read-more");if(!box)return;const file=x=>fetch("rel/"+x.slice(-2)+".json").then(r=>r.ok?r.json():{}).catch(()=>({}));
  file(k).then(own=>{const me=own[k],ks=me&&me[2]?me[2].match(/.{14}/g)||[]:[];if(!ks.length)return;
   return Promise.all(ks.map(file)).then(parts=>{const items=ks.map((x,i)=>{const r=parts[i][x];return r&&r[0]?[x,r[0],r[1]]:null}).filter(Boolean);if(!items.length)return;
    box.querySelector(".more-list").innerHTML=items.map(r=>`<a class="qcard qcard-own" href="read.html?k=${r[0]}&from=${from}"><small>${escHTML(r[2]||"")}</small><b>${escHTML(r[1])}</b><span>এখানেই পড়ুন ›</span></a>`).join("");box.hidden=false})})};
 /* read.html?v=<id>: তালিকার ইউটিউব ভিডিও এই পাতাতেই চলে (SITE_VIDEOS-এ থাকা ভিডিওই শুধু) */
 const showVideo=()=>{
  if(!siteVideo(vid)){readTitle.textContent="ভিডিওটি পাওয়া যায়নি";body.innerHTML=`<p>এই ভিডিওটি সাইটের তালিকায় নেই।</p><p><a class="askbtn" href="${backHref}">${backLabel} তালিকায় ফিরে যান</a></p>`;return}
  const row=[...QS,...FT].find(r=>videoIdOf(r[2])===vid)||["","ভিডিও"],by=SITE_VIDEOS[vid];
  readTitle.textContent=toLatinDigits(row[1]);document.title=toLatinDigits(row[1])+" — DAWAH X";
  const cat=$("read-cat");if(cat&&row[0]){cat.textContent=row[0];cat.hidden=false}
  $("read-meta").innerHTML=[by,"ইউটিউব ভিডিও"].filter(Boolean).map(v=>`<span>${escHTML(v)}</span>`).join('<span aria-hidden="true">·</span>');
  const frame=document.createElement("div"),player=document.createElement("iframe"),tip=document.createElement("p");
  frame.className="video-frame article-video";player.src="https://www.youtube.com/embed/"+encodeURIComponent(vid)+"?rel=0&playsinline=1";player.title=row[1];
  player.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";player.allowFullscreen=true;player.referrerPolicy="strict-origin-when-cross-origin";
  tip.className="article-video-tip";tip.textContent="ভিডিওটি এই পাতাতেই চলবে — প্লে বোতামে চাপুন।";
  frame.appendChild(player);body.textContent="";body.append(frame,tip);
  $("read-credit").innerHTML=`এই ভিডিওটি <b>${escHTML(by||"ইউটিউব")}</b>-এর ইউটিউব চ্যানেলের (youtube.com)। ইউটিউবের প্লেয়ারে এখানে দেখানো হচ্ছে; ভিডিওর স্বত্ব চ্যানেলের।`;
  const orig=$("read-original"),label=orig.querySelector("span");orig.href="https://www.youtube.com/watch?v="+encodeURIComponent(vid);if(label)label.textContent="ইউটিউবে দেখুন ↗";$("read-source").hidden=false;
  shareLinks(row[1])};
 if(vid)setTimeout(showVideo,0); /* SITE_VIDEOS, QS, FT নিচে সংজ্ঞায়িত */
 else if(!/^[0-9a-f]{14}$/.test(key))fail("ঠিকানাটি সঠিক নয়।");
 else fetch("texts/"+textBucket(key)+".json").then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(all=>{
  const x=all[key];if(!x){fail("এই লেখাটি এখনো সাইটে যোগ হয়নি।");return}
  const srcName=TEXT_SOURCES[x.s]||hostOf(x.u);
  readTitle.textContent=toLatinDigits(x.t);document.title=toLatinDigits(x.t)+" — DAWAH X";
  const cat=$("read-cat");if(cat&&x.c){cat.textContent=x.c;cat.hidden=false}
  $("read-meta").innerHTML=[srcName,x.a,x.d].filter(Boolean).map(v=>`<span>${escHTML(v)}</span>`).join('<span aria-hidden="true">·</span>');
  body.textContent="";body.appendChild(safeArticle(x.h,/^https?:\/\//i.test(x.u||"")?x.u:""));
  $("read-credit").innerHTML=`এই লেখাটি <b>${escHTML(srcName)}</b>-এর (${escHTML(hostOf(x.u))})। প্রকাশকের অনুমতিক্রমে এখানে হুবহু তুলে ধরা হয়েছে; লেখার স্বত্ব মূল প্রকাশকের।`+(/^\d{8}/.test(x.w||"")?` এই কপিটি Internet Archive-এ সংরক্ষিত ${x.w.slice(0,4)}-${x.w.slice(4,6)}-${x.w.slice(6,8)} তারিখের সংস্করণ থেকে নেওয়া; মূল পেজে এরপর পরিবর্তন হয়ে থাকতে পারে।`:"");
  $("read-original").href=x.u;$("read-source").hidden=false;
  shareLinks(x.t,key);
  markHits(body,P.get("q")||"");
  showRelated(key);
  if(location.hash){const t=document.getElementById(location.hash.slice(1));if(t)t.scrollIntoView()}
 }).catch(()=>fail("লেখাটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"))}

/* ===== লাইব্রেরি (প্রশ্নোত্তর ও ফতোয়া) — সাধারণ কোড ===== */
const ALL="সব",LIBRARY_PAGE_SIZE=20;
const BN_DIGITS="০১২৩৪৫৬৭৮৯";
const toLatinDigits=v=>String(v).replace(/[০-৯]/g,d=>String(BN_DIGITS.indexOf(d)));
/* escAttr: শুধু HTML escape (লিংকের জন্য — সংখ্যা বদলানো যাবে না); escHTML: দৃশ্যমান লেখার জন্য, সংখ্যা ইংরেজিতে */
const escAttr=v=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("\"","&quot;");
const escHTML=v=>escAttr(toLatinDigits(v));
/* বানানভেদ মিলিয়ে নেওয়া: হাদিস/হাদীস/হাদীছ, নামাজ/নামায, ছালাত/সালাত, ক্বিয়াম/কিয়াম — সবই একই ধরা হয়।
   foldBn(), searchTokens(), searchShard() — tools/build-site-data.cjs-এর সাথে হুবহু এক হতে হবে */
const FOLD_MAP={"ী":"ি","ূ":"ু","ঈ":"ই","ঊ":"উ","ছ":"স","শ":"স","ষ":"স","য":"জ","ণ":"ন","ৎ":"ত"};
const foldBn=v=>toLatinDigits(String(v||"").normalize("NFC").toLowerCase()).replace(/[\u200b-\u200d\u00ad\ufeff\u0981]/g,"").replace(/([\p{L}\p{M}])[‘’'ʼ](?=\p{L})/gu,"$1").replace(/\u09af\u09bc/g,"\u09df").replace(/\u09a1\u09bc/g,"\u09dc").replace(/\u09a2\u09bc/g,"\u09dd")
 .replace(/([কত])\u09cd\u09ac/g,"$1").replace(/[ীূঈঊছশষযণৎ]/g,c=>FOLD_MAP[c]);
const searchTokens=v=>(foldBn(v).match(/[\p{L}\p{M}\p{N}]+/gu)||[]).filter(t=>{const n=[...t].length;return n>=2&&n<=30});
const searchPrefix=t=>{const a=[...t];return a.slice(0,a[1]==="\u09cd"?5:3).join("")};
const searchShard=(t,n)=>{let h=0x811c9dc5;const p=searchPrefix(t);for(let i=0;i<p.length;i++){h^=p.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0)%n};
const normalizeSearchText=v=>foldBn(v).trim().replace(/\s+/g," ");
/* একই অর্থের ভিন্ন শব্দ/বানান (foldBn-এর পরের রূপে): একটি লিখলে অন্যগুলোও খোঁজা হয়; শব্দের শেষের বিভক্তি ("নামাজের") বজায় থাকে */
const SEARCH_SYNONYMS=[["নামাজ","সালাত"],["রোজা","সি\u09dfাম","সাওম"],["কোরআন","কুরআন","কোরান","কুরান"],["অজু","ওজু","উজু"],["দো\u09dfা","দোআ","দুআ"],["জুমা","জুমআ","জুমুআ"],["কুরবানি","কোরবানি"],["ওহি","অহি"],["জ\u09dfিফ","জইফ"],["বিদআত","বেদাত"],["ফেরেসতা","ফিরিসতা"],["রাসুল","রসুল"],["মুহাম্মদ","মুহাম্মাদ","মোহাম্মদ"],["রাকাত","রাকআত"],["হজ্জ","হজ"],["ওমরা","উমরা"],["মসজিদ","মাসজিদ"],["বিতর","বিতির","বেতের"],["সেহরি","সাহরি","সাহারি"],["বি\u09dfে","বিবাহ"],["স্রস্টা","সৃস্টিকর্তা"]];
const searchAlts=t=>{for(const g of SEARCH_SYNONYMS)for(const m of g)if(t.startsWith(m)){const rest=t.slice(m.length);return g.map(x=>x+rest)}return [t]};
/* ---- লেখার ভেতরে সার্চ: search/meta.json, search/keys.txt, search/<নম্বর>.json (শব্দ → কোন কোন লেখায় আছে) ----
   শব্দের শুরু মিললেই ধরা হয় ("নামাজ" লিখলে "নামাজের"-ও আসে); একাধিক শব্দ দিলে সবগুলো যে লেখায় আছে সেটিই আসে */
const DEEP={meta:null,stop:null,keys:"",shards:new Map(),ready:null,
 init(){return this.ready||(this.ready=Promise.all([fetch("search/meta.json").then(r=>{if(!r.ok)throw 0;return r.json()}),fetch("search/keys.txt").then(r=>{if(!r.ok)throw 0;return r.text()})])
  .then(([m,k])=>{this.meta=m;this.stop=new Set(m.stop);this.keys=k;return true}).catch(()=>{this.ready=null;return false}))},
 shard(i){let p=this.shards.get(i);if(!p){p=fetch("search/"+String(i).padStart(3,"0")+".json").then(r=>{if(!r.ok)throw 0;return r.json()});this.shards.set(i,p);p.catch(()=>this.shards.delete(i))}return p},
 ids(b64){const s=atob(b64),out=[];let v=0,sh=0,prev=-1;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);v|=(c&127)<<sh;if(c&128)sh+=7;else{prev+=v;out.push(prev);v=0;sh=0}}return out},
 /* ফল: লেখার চাবির Set; খোঁজার মতো শব্দ না থাকলে বা সূচি না পাওয়া গেলে null */
 async find(q){try{const terms=[...new Set(searchTokens(q))];if(!terms.length||!(await this.init()))return null;
   const use=terms.filter(t=>!this.stop.has(t));if(!use.length)return null;
   let acc=null;
   for(const t of use){const set=new Set();
    for(const a of searchAlts(t)){if(this.stop.has(a))continue;const sh=await this.shard(searchShard(a,this.meta.shards));
     for(const tok in sh)if(tok.startsWith(a))for(const id of this.ids(sh[tok]))set.add(id)}
    acc=acc?new Set([...acc].filter(x=>set.has(x))):set;if(!acc.size)break}
   const out=new Set();for(const id of acc)out.add(this.keys.substr(id*14,14));return out}catch(e){return null}}};
/* ===== প্রশ্ন লেখার সময় মিলে-যাওয়া লেখা ও ভিডিও (ask.html) =====
   পাঠক প্রশ্ন লিখতে থাকলে সাইটে আগে থেকে থাকা মিলে-যাওয়া লেখা (প্রশ্নোত্তর + ফতোয়া) ও ভিডিও খুঁজে দেয়।
   তথ্য: search/titles.json + search/tNN.json (শিরোনামের শব্দ), search/NNN.json (লেখার ভেতরের শব্দ), rel/NN.json (শিরোনাম), youtube-videos.json (ভিডিও)।
   সাধারণ সার্চের সাথে পার্থক্য: এখানে পুরো বাক্য আসে, তাই সব শব্দ থাকা লাগে না — কম-ব্যবহৃত (বিষয়-নির্দেশক) শব্দের ওজন বেশি,
   শিরোনামে মিল লেখার ভেতরের মিলের চেয়ে বেশি দামি, আর ছোট শিরোনামে মিল লম্বা শিরোনামের চেয়ে বেশি দামি। */
/* বিভক্তি/ক্রিয়ার শেষাংশ (foldBn-এর পরের রূপে): "তাহাজ্জুদের" → "তাহাজ্জুদ", "জানলে" → "জানল" */
const ASK_SUFFIXES=["গুলোকে","গুলোর","গুলোতে","গুলো","গুলি","দেরকে","দের","টির","টিকে","টি","টা","কে","তে","েরা","ের","রা","\u09dfের","সিলেন","সিল","লেন","লাম","লে","বেন","বে","সেন","সে","তেন","েন","\u09df","ে","র","ই","ও"];
/* প্রশ্নে প্রায়ই থাকে কিন্তু বিষয় বোঝায় না এমন শব্দ (foldBn-এর পরের রূপে) */
const ASK_SKIP=new Set("কি কেন কিভাবে কোন কোথা\u09df কখন কত ক\u09df কিনা নাকি জদি তাহলে আমি আমার আমাদের আমরা আপনি আপনার আপনারা জানতে জানাবেন চাই বলুন বলবেন দ\u09dfা প্রস্ন উত্তর সম্পর্কে বিস\u09dfে ব্জাপারে একটি একটা একজন এটা এটি সেটা হবে হ\u09df করা করে করলে করতে জাবে জা\u09df আসে নি\u09dfে থেকে জন্জ এবং অথবা বা ও না ভাই আসসালামু আলাইকুম সালাম ধন্জবাদ প্লিজ অনুগ্রহ কিসু খুব অনেক তো এর এত এতো এতগুলো কেমন হচ্সে হচ্সেন হ\u09dfেসিল করেসিলেন করেসিল করেসেন সিলেন আসেন থাকবে পারি পারব পারবে পারবো জাবেন দিতে নিতে হলো গেলে গেসে দিলে নিলে the an is are was do does did can how what why when who which you your my me we of to in on for and or it this that hello hi please".split(" "));
const ASK_LEN="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"; /* tools/build-site-data.cjs-এর LEN_CHARS */
const askCp=t=>[...t].length,askMinPrefix=t=>[...t][1]==="\u09cd"?5:3;
/* একটি শব্দ → খোঁজার রূপগুলো [[রূপ, শুরু মিললেই চলবে?]]; শব্দটি (বা তার মূল রূপ) খুব সাধারণ হলে null।
   ছোট মূল রূপ (৩ অক্ষর) হুবহু মিলতে হয় — নইলে "বানর" থেকে "বান" হয়ে "বান্দা"-ও ধরা পড়ত */
function askForms(tok,stop){const out=new Map();
 for(const a of searchAlts(tok)){if(stop.has(a)||ASK_SKIP.has(a))return null;
  out.set(a,askCp(a)>=askMinPrefix(a));
  for(const s of ASK_SUFFIXES){if(!a.endsWith(s))continue;const r=a.slice(0,-s.length),n=askCp(r);if(n<3)continue;
   if(stop.has(r)||ASK_SKIP.has(r))return null;
   const pre=n>=4&&n>=askMinPrefix(r);if(pre||!out.has(r))out.set(r,pre)}}
 return [...out]}
const SUGGEST={tm:null,side:null,ready:null,tsh:new Map(),relc:new Map(),vid:null,
 init(){return this.ready||(this.ready=Promise.all([DEEP.init(),fetch("search/titles.json").then(r=>{if(!r.ok)throw 0;return r.json()})])
  .then(([ok,t])=>{if(!ok||!t||!t.len||!t.side)throw 0;const s=atob(t.side);this.tm=t;this.side=i=>(s.charCodeAt(i>>3)>>(i&7))&1?"f":"q";return true}).catch(()=>{this.ready=null;return false}))},
 tshard(i){let p=this.tsh.get(i);if(!p){p=fetch("search/t"+String(i).padStart(2,"0")+".json").then(r=>{if(!r.ok)throw 0;return r.json()});this.tsh.set(i,p);p.catch(()=>this.tsh.delete(i))}return p},
 rel(k){const f=k.slice(-2);let p=this.relc.get(f);if(!p){p=fetch("rel/"+f+".json").then(r=>r.ok?r.json():{}).catch(()=>({}));this.relc.set(f,p)}return p.then(o=>o[k]||null)},
 /* ভিডিওর তালিকা একবারই আনা হয়; শিরোনামের শব্দ → ভিডিও। ৮%-এর বেশি শিরোনামে থাকা শব্দ (বক্তার নাম ইত্যাদি) বাদ */
 videos(){return this.vid||(this.vid=fetch("youtube-videos.json").then(r=>{if(!r.ok)throw 0;return r.json()}).then(all=>{
   const list=all.filter(v=>v&&/^[\w-]{11}$/.test(v.id||"")&&typeof v.title==="string"),map=new Map();
   const toks=list.map(v=>[...new Set(searchTokens(v.title).filter(t=>!/^\d+$/.test(t)))]);
   toks.forEach((ts,i)=>ts.forEach(t=>{let l=map.get(t);if(!l)map.set(t,l=[]);l.push(i)}));
   const cap=list.length*.08,len=toks.map(ts=>Math.max(1,ts.filter(t=>map.get(t).length<=cap).length));
   for(const [t,l] of [...map])if(l.length>cap)map.delete(t);
   return {list,map,len,vocab:[...map.keys()]}}).catch(()=>{this.vid=null;return null}))},
 /* T = প্রতিটি শব্দ কোন কোন শিরোনামে আছে, B = কোন কোন লেখার ভেতরে আছে (ভিডিওর জন্য null), w = শব্দের ওজন, raw = শব্দটি কতটা বিরল।
    দেখানোর শর্ত: শিরোনামে অন্তত ২টি শব্দের মিল (অথবা ১টি খুব নির্দিষ্ট শব্দ) এবং প্রশ্নের ওজনের বড় অংশ শিরোনামে আছে;
    অথবা ৩+ শব্দের সবগুলো লেখার ভেতরে আছে এবং শিরোনামেও কিছু মিল আছে */
 score(N,T,B,w,raw,lenOf){const n=T.length,W=w.reduce((x,y)=>x+y,0),tw=new Float32Array(N),tc=new Uint8Array(N),tx=new Float32Array(N),bw=B?new Float32Array(N):null,out=[];
  T.forEach((s,i)=>{for(const id of s){tw[id]+=w[i];tc[id]++;if(raw[i]>tx[id])tx[id]=raw[i]}});
  if(B)B.forEach((s,i)=>{for(const id of s)bw[id]+=w[i]});
  for(let id=0;id<N;id++){if(!tc[id])continue;const M=tw[id],t=M/(M+.5*(W-M)),b=bw?bw[id]/(bw[id]+.5*(W-bw[id])):t;
   if(!((t>=.6&&(tc[id]>=2||tx[id]>=(n===1?3:5)))||(bw&&n>=3&&b>=.999&&t>=.35)))continue;
   const sc=.7*t*(.25+.75*Math.sqrt(Math.min(1,tc[id]/lenOf(id))))+.3*b;if(sc>=.4)out.push([id,sc])}
  return out.sort((x,y)=>y[1]-x[1]||x[0]-y[0])},
 /* ফল: {texts:[{k,side,title,cat}], videos:Promise<[{id,title,channel}]>}; সূচি না পাওয়া গেলে null।
    ভিডিওর তালিকা বড় (প্রথমবার আনতে সময় লাগে), তাই লেখার ফল আগে ফেরে আর ভিডিও আলাদা Promise-এ আসে */
 async find(q){try{
   if(!(await this.init()))return null;
   const vp=this.videos(),stop=DEEP.stop,seen=new Set(),same=new Set(),G=[];
   for(const t of searchTokens(q)){if(/^\d+$/.test(t)||seen.has(t))continue;seen.add(t);const f=askForms(t,stop);if(!f)continue;
    const id=f.map(x=>x[0]).sort().join("|");if(same.has(id))continue;same.add(id);G.push(f);if(G.length>=12)break}
   if(!G.length)return {texts:[],videos:Promise.resolve([])};
   const N=DEEP.meta.n,nb=DEEP.meta.shards,nt=this.tm.shards,B=[],T=[];
   await Promise.all(G.map(async(forms,g)=>{const b=new Set(),t=new Set();
    await Promise.all(forms.map(async([p,pre])=>{const i=searchShard(p,nb),[bs,ts]=await Promise.all([DEEP.shard(i),this.tshard(i%nt)]);
     const take=(sh,set)=>{if(pre){for(const tok in sh)if(tok.startsWith(p))for(const x of DEEP.ids(sh[tok]))set.add(x)}else if(Object.prototype.hasOwnProperty.call(sh,p))for(const x of DEEP.ids(sh[p]))set.add(x)};
     take(bs,b);take(ts,t)}));
    B[g]=b;T[g]=t}));
   /* raw = শব্দটি কত কম লেখায় আছে (বেশি = বেশি নির্দিষ্ট); কোনো লেখায় না থাকা শব্দ (বানান ভুল, নাম) কম ওজন পায় */
   const raw=B.map(s=>s.size?Math.log(N/(1+s.size)):0),w=raw.map(v=>v?Math.min(5,Math.max(1,v)):1.2),L=this.tm.len;
   const ranked=this.score(N,T,B,w,raw,id=>Math.max(1,ASK_LEN.indexOf(L[id])));
   const pick={q:[],f:[]};for(const [id] of ranked){const s=this.side(id);if(pick[s].length<6)pick[s].push(id)}
   const bare=v=>v.replace(/^\s*প্রশ্ন\s*[:ঃ]?\s*\([^)]{0,14}\)\s*[:ঃ]?\s*/,"").trim(),texts=[],seenT=new Set();
   for(const s of ["q","f"]){const rows=await Promise.all(pick[s].map(id=>{const k=DEEP.keys.substr(id*14,14);return this.rel(k).then(r=>r&&r[0]?{k,side:s,title:bare(r[0])||r[0],cat:r[1]||""}:null)}));
    let n=0;for(const r of rows){if(!r)continue;const ft=foldBn(r.title);if(seenT.has(ft))continue;seenT.add(ft);texts.push(r);if(++n>=3)break}}
   const videos=vp.then(V=>{const videos=[];
   if(V){const TV=G.map(forms=>{const s=new Set();for(const [p,pre] of forms){if(pre){for(const tok of V.vocab)if(tok.startsWith(p))for(const i of V.map.get(tok))s.add(i)}else{const l=V.map.get(p);if(l)for(const i of l)s.add(i)}}return s});
    const seenV=new Set();for(const [i] of this.score(V.list.length,TV,null,w,raw,i=>V.len[i])){const v=V.list[i],ft=foldBn(v.title);if(seenV.has(ft))continue;seenV.add(ft);videos.push({id:v.id,title:v.title,channel:v.channelTitle||""});if(videos.length>=2)break}}
    return videos}).catch(()=>[]);
   return {texts,videos}}catch(e){return null}}};
/* ===== /মিলে-যাওয়া লেখা ও ভিডিও ===== */
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch(e){return""}};
const formatCount=n=>new Intl.NumberFormat("en-US").format(n);
/* ---- সাইটেই পড়ার লেখা (texts/…json; tools/import-texts.cjs দিয়ে আনা) ---- */
const TEXT_SOURCES={ai:"মাসিক আল-ইতিছাম",at:"মাসিক আত-তাহরীক",ra:"Response to Anti-Islam",fm:"From Muslims",ia:"Islamic Authors",iz:"Insight Zone"};
/* tools/import-texts.cjs-এর keyOfUrl()-এর সাথে হুবহু এক হতে হবে */
function textKey(u){try{u=decodeURI(u)}catch(e){}let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<u.length;i++){const c=u.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
 return (4294967296*(2097151&h2)+(h1>>>0)).toString(16).padStart(14,"0")}
function textBucket(k){return k.slice(-3)}
/* texts/index.json: {full:{উৎস:host}, missing:[key], keys:[key]} */
let LOCAL_TEXTS=null;
const localTextsReady=(location.protocol==="file:"?Promise.resolve(null):fetch("texts/index.json").then(r=>r.ok?r.json():null).catch(()=>null)).then(x=>{
 if(x&&x.n)LOCAL_TEXTS={hosts:new Set(Object.values(x.full||{})),missing:new Set(x.missing||[]),keys:new Set(x.keys||[])};return LOCAL_TEXTS});
const localKeyOf=u=>{if(!LOCAL_TEXTS)return"";const k=textKey(u);if(LOCAL_TEXTS.keys.has(k))return k;let h="";try{h=new URL(u).host}catch(e){}return LOCAL_TEXTS.hosts.has(h)&&!LOCAL_TEXTS.missing.has(k)?k:""};
/* তালিকার ইউটিউব ভিডিও: কার্ডে চাপলে ইউটিউবে না গিয়ে সাইটের পাঠ-পাতায় (read.html?v=<id>) প্লেয়ার খোলে।
   শুধু এই তালিকার ভিডিওই সাইটে চলে (ভিডিওর id → চ্যানেলের নাম); তালিকায় নতুন ভিডিও দিলে তার id এখানে যোগ করতে হবে */
const SITE_VIDEOS={"pfuxmCur3j4":"Insight Zone","ADf5pMhySeI":"Insight Zone","-Q5qDzfik28":"Insight Zone"};
const siteVideo=id=>Object.prototype.hasOwnProperty.call(SITE_VIDEOS,id);
const videoIdOf=u=>{const m=/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/)([\w-]{11})(?![\w-])/.exec(u||"");return m&&siteVideo(m[1])?m[1]:""};

/* cfg: {id:"q"|"f", rows:[[বিভাগ,শিরোনাম,লিংক]], manifest:[{category,src,count}], partsKey, label, hint, loadingText} */
function setupLibrary(cfg){
 const search=$(cfg.id+"search"),chips=$(cfg.id+"chips"),grid=$(cfg.id+"grid"),stat=$(cfg.id+"stat");
 /* পৃষ্ঠা বদলের বার (#qpager / #fpager)। পুরনো HTML-এ শুধু "আরও দেখুন" বোতাম থাকলে তার জায়গায় বারটি বসে */
 let pager=$(cfg.id+"pager");
 if(!pager){const old=$(cfg.id+"more");if(old){pager=document.createElement("nav");pager.className="pager";pager.id=cfg.id+"pager";(old.parentElement&&old.parentElement.classList.contains("qmorewrap")?old.parentElement:old).replaceWith(pager)}}
 if(!search||!chips||!grid||!pager)return null;
 pager.setAttribute("aria-label","পৃষ্ঠা বদল");
 pager.innerHTML='<button type="button" class="pg-btn pg-prev" data-pg="prev">← আগের</button><span class="pg-info"></span><input class="pg-input" type="text" inputmode="numeric" autocomplete="off" maxlength="6" aria-label="পৃষ্ঠা নম্বর লিখুন"><button type="button" class="pg-btn pg-go" data-pg="go">যান</button><button type="button" class="pg-btn pg-next" data-pg="next">পরের →</button><p class="pg-total"></p>';
 const pgPrev=pager.querySelector(".pg-prev"),pgNext=pager.querySelector(".pg-next"),pgGo=pager.querySelector(".pg-go"),pgInput=pager.querySelector(".pg-input"),pgInfo=pager.querySelector(".pg-info"),pgTotal=pager.querySelector(".pg-total");
 /* own = এটি এই তালিকার নিজের পাতা (questions.html / fatwa.html): তখন বিভাগ, খোঁজ ও পৃষ্ঠা ঠিকানায় (?c= &s= &p=) রাখা হয় */
 const own=Boolean(cfg.deep),PER=LIBRARY_PAGE_SIZE;
 const manifest=cfg.manifest||[];
 const total=manifest.reduce((n,x)=>n+x.count,0);
 const loaded=new Set(),pending=new Map(),textCache=new WeakMap(),keyCache=new WeakMap();
 /* লেখার ভেতরে সার্চের ফল: deep = যেসব লেখায় শব্দগুলো আছে (চাবির Set), deepFor = কোন খোঁজের জন্য */
 let deep=null,deepFor="",deepSeq=0,deepBusy=false;
 const rowKey=row=>{let k=keyCache.get(row);if(k===undefined){k=localKeyOf(row[2]);if(LOCAL_TEXTS)keyCache.set(row,k)}return k};
 /* একই লিংক দুবার দেখানো হয় না: বাছাইকৃত সারি আগে থাকে, পূর্ণ সূচির একই লিংক সেটির বাড়তি বিভাগ (x[3]) হিসেবে যুক্ত হয় */
 const keyOf=u=>{try{return decodeURI(u)}catch(e){return u}};
 /* সারির ক্রম সবসময় একই থাকে: আগে বাছাইকৃত সারি, তারপর manifest-এর ক্রমে প্রতিটি অংশ — কোন অংশ আগে লোড হলো তার উপর নির্ভর করে না (নইলে একই পৃষ্ঠা নম্বরে ভিন্ন লেখা আসত) */
 const base=cfg.rows.slice(),added=new Map();
 let rows=base.slice();const index=new Map(rows.map(x=>[keyOf(x[2]),x]));
 /* page = চাওয়া পৃষ্ঠা, pages = মোট পৃষ্ঠা, have = এ পর্যন্ত লোড হওয়া সারিতে যত পৃষ্ঠা হয়; hold = ঠিকানা থেকে ফেরানো পৃষ্ঠা প্রথম লোড শেষ না হওয়া পর্যন্ত ছাঁটা হয় না */
 let cur=ALL,page=1,pages=1,have=1,failed=false,hold=false,restored=false;
 const inCategory=(x,c)=>c===ALL||x[0]===c||Boolean(x[3]&&x[3].includes(c));
 const cats=[...new Set([ALL,...rows.map(x=>x[0]),...manifest.map(x=>x.category)])];
 const partsFor=c=>c===ALL?manifest:manifest.filter(x=>x.category===c);
 const isReady=c=>partsFor(c).every(x=>loaded.has(x.category));
 const isLoading=c=>partsFor(c).some(x=>pending.has(x.category));
 const rowText=row=>{let v=textCache.get(row);if(v===undefined){v=normalizeSearchText(row[0]+" "+(row[3]||[]).join(" ")+" "+row[1]);textCache.set(row,v)}return v};
 const setStatus=text=>{if(stat)stat.textContent=text};
 const query=()=>normalizeSearchText(search.value);

 function draw(){
  const q=query(),terms=q?q.split(" "):[];
  chips.innerHTML=cats.map(c=>`<button type="button" class="chip${c===cur?" on":""}" data-c="${escAttr(c)}" aria-pressed="${c===cur}">${escHTML(c)}</button>`).join("");
  /* শিরোনামে মিল আগে, তারপর যেগুলোর শুধু লেখার ভেতরে মিল */
  const alts=terms.map(searchAlts),inTitle=x=>{const v=rowText(x);return alts.every(g=>g.some(t=>v.includes(t)))},useDeep=Boolean(q&&deep&&deepFor===q);
  let list,titleHits=0;
  if(useDeep){const a=[],b=[];for(const x of rows){if(!inCategory(x,cur))continue;if(inTitle(x))a.push(x);else if(deep.has(rowKey(x)))b.push(x)}list=a.concat(b);titleHits=a.length}
  else{list=rows.filter(x=>inCategory(x,cur)&&inTitle(x));titleHits=list.length}
  const ready=isReady(cur),loading=isLoading(cur),qs=q.length>=2?"&q="+encodeURIComponent(search.value.trim().slice(0,80)):"";
  /* মোট পৃষ্ঠা: পূর্ণ সূচি লোড না হয়ে থাকলে (এবং খোঁজ না চললে) manifest-এর সংখ্যা ধরে আনুমানিক; লোড হলে সঠিক সংখ্যা বসে */
  have=Math.max(1,Math.ceil(list.length/PER));
  const waiting=!ready&&!q?partsFor(cur).filter(x=>!loaded.has(x.category)).reduce((n,x)=>n+x.count,0):0;
  pages=Math.max(have,Math.ceil((list.length+waiting)/PER));
  if(!(page>=1))page=1;
  if(ready||(!loading&&!hold))page=Math.min(page,pages);
  if(failed&&!loading&&!hold)page=Math.min(page,have);
  /* busy = চাওয়া পৃষ্ঠার সারি এখনো আসেনি (সূচি লোড হচ্ছে) */
  const busy=page>have&&!ready,at=Math.min(page,have),first=(at-1)*PER;
  if(list.length){
   grid.innerHTML=busy?`<p class="qnote">পৃষ্ঠা ${formatCount(page)} লোড হচ্ছে…</p>`:list.slice(first,first+PER).map((x,j)=>{const i=first+j,k=localKeyOf(x[2]),v=k?"":videoIdOf(x[2]);return k
    ?`<a class="qcard qcard-own${i>=titleHits?" qcard-deep":""}" href="read.html?k=${k}&from=${cfg.id}${qs}"><small>${escHTML(x[0])}</small><b>${escHTML(x[1])}</b><span>${i>=titleHits?"লেখার ভেতরে পাওয়া গেছে ›":"এখানেই পড়ুন ›"}</span></a>`
    :v?`<a class="qcard qcard-own" href="read.html?v=${encodeURIComponent(v)}&from=${cfg.id}"><small>${escHTML(x[0])}</small><b>${escHTML(x[1])}</b><span>এখানেই দেখুন ›</span></a>`
    :`<a class="qcard" href="${escAttr(x[2])}" target="_blank" rel="noopener"><small>${escHTML(x[0])}</small><b>${escHTML(x[1])}</b><span>${escHTML(hostOf(x[2]))} ↗</span></a>`}).join("");
  }else{
   grid.innerHTML=`<p class="qnote">${loading||(deepBusy&&q)?"খোঁজা হচ্ছে…":failed&&!ready?"সূচি লোড হয়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।":"কিছু পাওয়া যায়নি।"}</p>`;
  }
  /* পৃষ্ঠা বদলের বার: ← আগের · পৃষ্ঠা ক / খ · নম্বর লেখার ঘর · যান · পরের → (এক পৃষ্ঠায় সব ধরে গেলে বারটি লুকানো থাকে) */
  pager.hidden=pages<=1&&!busy;
  pgInfo.innerHTML=`পৃষ্ঠা <b>${formatCount(page)}</b> / ${busy&&page>pages?"…":formatCount(pages)}`;
  if(document.activeElement!==pgInput)pgInput.value=String(page);
  pgPrev.disabled=busy||page<=1;pgNext.disabled=busy||page>=pages;pgGo.disabled=busy;pgInput.disabled=busy;
  pgTotal.textContent=busy?"সূচি লোড হচ্ছে…":!list.length?"":ready?`মোট ${formatCount(list.length)}টির মধ্যে ${formatCount(first+1)}–${formatCount(Math.min(first+PER,list.length))} দেখানো হচ্ছে`:`${formatCount(first+1)}–${formatCount(Math.min(first+PER,list.length))} দেখানো হচ্ছে`;
  if(q&&ready&&!loading&&!failed)setStatus(useDeep?`“${search.value.trim()}” — শিরোনামে ${formatCount(titleHits)}টি${list.length>titleHits?`, লেখার ভেতরে আরও ${formatCount(list.length-titleHits)}টি`:""} পাওয়া গেছে`:deepBusy?"লেখার ভেতরেও খোঁজা হচ্ছে…":`“${search.value.trim()}” — শিরোনামে ${formatCount(titleHits)}টি পাওয়া গেছে`);
 }
 /* লেখার ভেতরে খোঁজা (৩ বা তার বেশি অক্ষর); ফল এলে তালিকা আবার আঁকা হয় */
 function runDeep(){const q=query(),seq=++deepSeq;
  if(!cfg.deep||q.length<3){deep=null;deepFor="";deepBusy=false;return}
  if(deepFor===q&&deep){deepBusy=false;return}
  deepBusy=true;DEEP.find(q).then(set=>{if(seq!==deepSeq)return;deepBusy=false;deep=set;deepFor=set?q:"";draw()})}

 function loadPart(entry){
  if(loaded.has(entry.category))return Promise.resolve();
  if(pending.has(entry.category))return pending.get(entry.category);
  const task=new Promise((resolve,reject)=>{
   const script=document.createElement("script");script.src=entry.src;script.async=true;
   script.onload=()=>{const parts=window[cfg.partsKey]||{},part=parts[entry.category];
    if(!Array.isArray(part)){reject(new Error("catalog chunk missing"));return}
    const fresh=[];
    for(const row of part){const key=keyOf(row[2]),known=index.get(key);
     if(!known){index.set(key,row);fresh.push(row)}
     else if(known[0]!==row[0]&&!(known[3]&&known[3].includes(row[0]))){(known[3]||(known[3]=[])).push(row[0]);textCache.delete(known)}}
    added.set(entry.category,fresh);rows=base.concat(...manifest.map(m=>added.get(m.category)||[]));
    delete parts[entry.category];loaded.add(entry.category);resolve()};
   script.onerror=()=>{script.remove();reject(new Error("catalog chunk failed"))};
   document.head.appendChild(script)});
  pending.set(entry.category,task);
  const done=()=>pending.delete(entry.category);task.then(done,done);
  return task;
 }

 async function load(category){
  const selected=partsFor(category),missing=selected.filter(x=>!loaded.has(x.category));
  if(!missing.length)return;
  failed=false;const jobs=missing.map(loadPart);
  setStatus(cfg.loadingText);draw();
  try{
   await Promise.all(jobs);
   /* সংখ্যাটি তালিকার প্রকৃত সারি থেকে (বাছাইকৃত + পূর্ণ সূচি, একই লিংক একবার) — নিচের পৃষ্ঠা-বারের "মোট"-এর সাথে মেলে */
   setStatus(loaded.size===manifest.length?`সম্পূর্ণ সূচি প্রস্তুত · ${formatCount(rows.length)}টি রেফারেন্স`:`${category===ALL?"সূচি":category+" বিভাগ"} প্রস্তুত · ${formatCount(rows.filter(x=>inCategory(x,category)).length)}টি রেফারেন্স`);
  }catch(e){
   await Promise.allSettled(jobs);failed=true;
   setStatus("সূচি লোড হয়নি — ইন্টারনেট সংযোগ দেখে আবার সার্চ/বিভাগ নির্বাচন করুন।");
  }
  hold=false;draw();sync();
  if(restored){restored=false;toTop(true)}
 }

 /* তালিকার শুরুতে ফেরা (পৃষ্ঠা বদলের বার তালিকার নিচে থাকে) */
 function toTop(instant){const t=stat||chips,r=t.getBoundingClientRect();if(instant&&r.top>=0&&r.top<innerHeight*.6)return;t.scrollIntoView({block:"start",behavior:instant?"auto":"smooth"})}
 /* বিভাগ, খোঁজ ও পৃষ্ঠা ঠিকানায় রাখা হয়: লেখা পড়ে ফিরে এলে বা লিংক পাঠালে একই জায়গা খোলে; পাঠ-পাতার "ফিরে যান" লিংকও এটি ব্যবহার করে */
 function sync(){if(!own)return;const p=new URLSearchParams(),s=search.value.trim().slice(0,80);
  if(cur!==ALL)p.set("c",cur);if(s)p.set("s",s);if(page>1)p.set("p",String(page));const v=p.toString();
  try{history.replaceState(history.state,"",location.pathname+(v?"?"+v:"")+location.hash)}catch(e){}
  try{sessionStorage.setItem("dawahx-list-"+cfg.id,v)}catch(e){}}
 /* পৃষ্ঠা বদল: দরকারি সারি এখনো লোড না হয়ে থাকলে আগে পূর্ণ সূচি আনা হয় */
 function go(n){n=Math.min(Math.max(1,Math.floor(n)||1),pages);pgInput.value=String(n);if(n===page)return;
  page=n;if(n>have&&!isReady(cur))load(cur);else draw();
  pgInput.value=String(page);sync();toTop(false)}
 const typedPage=()=>{const n=parseInt(String(pgInput.value).replace(/[০-৯]/g,d=>"০১২৩৪৫৬৭৮৯".indexOf(d)).replace(/[^0-9]/g,""),10);return n>=1?n:page};
 pager.addEventListener("click",e=>{const b=e.target.closest("[data-pg]");if(!b||b.disabled)return;const k=b.dataset.pg;go(k==="prev"?page-1:k==="next"?page+1:typedPage())});
 pgInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go(typedPage());pgInput.blur()}});
 pgInput.addEventListener("focus",()=>pgInput.select());
 /* ঘর ছাড়লে লেখা নম্বরটি মুছে ফেলা হয় না: "যান" চাপলে আগে ঘরটি ফোকাস হারায়, তারপর ক্লিক আসে */

 chips.addEventListener("click",e=>{const b=e.target.closest("[data-c]");if(!b)return;cur=b.dataset.c;page=1;draw();load(cur);sync();chips.querySelector(".chip.on")?.focus({preventScroll:true})});
 /* উৎসের বড় কার্ড (data-cat): মূল সাইটে না নিয়ে নিচের তালিকায় সেই বিভাগের লেখাগুলো দেখায় */
 document.querySelectorAll('a.library-link[data-cat][href="#'+cfg.id+'chips"]').forEach(a=>a.addEventListener("click",e=>{if(!cats.includes(a.dataset.cat))return;
  e.preventDefault();search.value="";cur=a.dataset.cat;page=1;draw();load(cur);sync();(stat||chips).scrollIntoView({block:"start"});chips.querySelector(".chip.on")?.focus({preventScroll:true})}));
 let drawTimer;
 const onSearch=now=>{clearTimeout(drawTimer);drawTimer=setTimeout(()=>{page=1;runDeep();draw();if(query().length>=2)load(cur);sync()},now?0:220)};
 search.addEventListener("input",()=>onSearch(false));
 search.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();onSearch(true)}});

 if(manifest.length)setStatus(`${cfg.label} (প্রায় ${formatCount(base.length+total)}টি) — সার্চ করলে, বিভাগ বাছলে বা পরের পৃষ্ঠাগুলোতে গেলে লোড হবে।`);
 /* ঠিকানায় রাখা অবস্থা ফেরানো (?c=বিভাগ &s=খোঁজ &p=পৃষ্ঠা) */
 if(own){const P=new URLSearchParams(location.search),c=P.get("c"),s=(P.get("s")||"").trim().slice(0,80),p=parseInt(P.get("p"),10);
  if(c&&cats.includes(c)){cur=c;restored=true}
  if(s){search.value=s;restored=true}
  if(p>1){page=p;restored=true}
  hold=restored}
 draw();
 if(own){
  if(query().length>=3)runDeep();
  /* ছোট সূচি (cfg.eager) পাতা খুলতেই পুরোটা আনা হয়; বড় সূচি শুধু দরকার হলে */
  const need=cfg.eager?ALL:(cur!==ALL||query().length>=2||page>have)?cur:null;
  if(need!==null&&!isReady(need))load(need);else if(restored){hold=false;draw();sync();restored=false;toTop(true)}
 }
 localTextsReady.then(x=>{if(x)draw()});
 return {draw,load};
}

/* ===== প্রশ্নোত্তর লাইব্রেরি: [বিষয়, শিরোনাম, মূল লেখার লিংক] — নতুন লেখা এই তালিকায় যোগ করুন ===== */
const QB="https://www.response-to-anti-islam.com/show/";
const QS=[
["নাস্তিক্যবাদ","সৃষ্টিকর্তার অস্তিত্ব নিয়ে কালাম কসমোলজিক্যাল আর্গুমেন্ট","সৃষ্টিকর্তার-অস্তিত্ব-নিয়ে-কালাম-কসমোলজিক্যাল-আর্গুমেন্ট/402"],
["নাস্তিক্যবাদ","আল্লাহর অস্তিত্বঃ কুরআনের আর্গুমেন্ট","আল্লাহর-অস্তিত্বঃ-কুরআনের-আর্গুমেন্ট-/207"],
["নাস্তিক্যবাদ","নাস্তিকতার অবাস্তব প্রস্তাবনা","নাস্তিকতার-অবাস্তব-প্রস্তাবনা-/136"],
["নাস্তিক্যবাদ","অ্যান আপীল টু কমন সেন্স","অ্যান-আপীল-টু-কমন-সেন্স-/145"],
["নাস্তিক্যবাদ","পৃথিবীতে এতো ধর্মের মাঝে কোন ধর্মটি সঠিক?","পৃথিবীতে-এতো-ধর্মের-মাঝে-কোন-ধর্মটি-সঠিক--/134"],
["নাস্তিক্যবাদ","কিন্তু তোমার ধর্ম তো উত্তরাধিকার সূত্রে পাওয়া","কিন্তু-তোমার-ধর্ম-তো-উত্তরাধিকার-সূত্রে-পাওয়া-/135"],
["বিশ্বাস","আল্লাহ কেন শয়তান সৃষ্টি করলেন?","আল্লাহ-কেন-শয়তান-সৃষ্টি-করলেন--/133"],
["বিশ্বাস","আল্লাহ যদি আগে থেকেই সব কিছু জেনে থাকেন তাহলে কেন মানুষের পরীক্ষা নেন?","আল্লাহ-যদি-আগে-থেকেই-সব-কিছু-জেনে-থাকেন-তাহলে-কেন-মানুষের-পরীক্ষা-নেন--/376"],
["বিশ্বাস","তাকদির আগে থেকে নির্ধারিত হলে মানুষের বিচার হবে কেন?","তাকদির-আগে-থেকে-নির্ধারিত-হলে-মানুষের-বিচার-হবে-কেন--যাদের-কাছে-ইসলামের-দাওয়াহ-পৌঁছেনি-তাদের-কী-হবে--/41"],
["বিশ্বাস","নামাজ-রোজার কি আসলেই কোন পার্থিব উপকারিতা আছে?","নামাজ-রোজার-কি-আসলেই-কোন-পার্থিব-উপকারিতা-আছে--/128"],
["বিশ্বাস","জিজিয়া কি আসলেই শোষণমূলক বিধান?","জিজিয়া-কি-আসলেই-শোষণমূলক-বিধান--/197"],
["কুরআন","আল কুরআন সংকলন ও সংরক্ষণের বিস্তারিত ইতিহাস","আল-কুরআন-সংকলন-ও-সংরক্ষণের-বিস্তারিত-ইতিহাস-/254"],
["কুরআন","সাত হারফ কি কুরআনের একাধিক ভার্সন?","সাত-হারফ-কি-কুরআনের-একাধিক-ভার্সন--/124"],
["কুরআন","স্রষ্টার প্রজ্ঞার অনন্য এক নিদর্শন – নাসখ","স্রষ্টার-প্রজ্ঞার-অনন্য-এক-নিদর্শন-–-নাসখ-/66"],
["কুরআন","কুরআন ও বাইবেল : কোন গ্রন্থটি আসলে কপি করে লেখা?","কুরআন-ও-বাইবেল-:-কোন-গ্রন্থটি-আসলে-কপি-করে-লেখা--/114"],
["কুরআন","কুরআনে কি আসলেই খ্রিষ্টানদের ত্রিত্ববাদ (Trinity) নিয়ে ভুল তথ্য আছে?","কুরআনে-কি-আসলেই-খ্রিষ্টানদের-ত্রিত্ববাদ-(Trinity)-নিয়ে-ভুল-তথ্য-আছে--/119"],
["বিজ্ঞান","কুরআন কি পৃথিবীকে সমতল বলছে?","কুরআন-কি-পৃথিবীকে-সমতল-বলছে--/122"],
["বিজ্ঞান","সূর্য ঘোরে নাকি পৃথিবী ঘোরে? সূর্য কি আরশের নিচে সিজদা করে?","সূর্য-ঘোরে-নাকি-পৃথিবী-ঘোরে--সূর্য-কি-আরশের-নিচে-সিজদা-করে--/189"],
["বিজ্ঞান","আল কুরআনে উল্লেখিত ৭ আসমান সম্পর্কিত তথ্য","আল-কুরআনে-উল্লেখিত-৭-আসমান-সম্পর্কিত-তথ্য-/100"],
["বিজ্ঞান","ইসলাম কি ছোঁয়াচে রোগের অস্তিত্ব অস্বীকার করে?","ইসলাম-কি-ছোঁয়াচে-রোগের-অস্তিত্ব-অস্বীকার-করে--/63"],
["বিজ্ঞান","গর্ভের সন্তান কী হবে তা কি একমাত্র আল্লাহই জানেন?","গর্ভের-সন্তান-কী-হবে-তা-কি-একমাত্র-আল্লাহই-জানেন--/77"],
["নবুয়ত","অবিচল আগন্তুক","অবিচল-আগন্তুক-/178"],
["নবুয়ত","তিনটি ঘটনা এবং একটি সত্যের সাক্ষ্য","তিনটি-ঘটনা-এবং-একটি-সত্যের-সাক্ষ্য-/156"],
["নবুয়ত","একটি চাবি ও একজন মহামানব","একটি-চাবি-ও-একজন-মহামানব-/157"],
["নবুয়ত","নিঃসঙ্গ পথযাত্রী","নিঃসঙ্গ-পথযাত্রী-/161"],
["নৈতিকতা","ইসলামে দাসপ্রথা","ইসলামে-দাসপ্রথা-/171"],
["নৈতিকতা","অমুসলিম সংখ্যালঘুদের প্রতি অবশ্যই দয়ালু আচরণ করতে হবে","অমুসলিম-সংখ্যালঘুদের-প্রতি-অবশ্যই-দয়ালু-আচরণ-করতে-হবে-/198"],
["নৈতিকতা","ইসলাম ও বাল্যবিবাহ","ইসলাম-ও-বাল্যবিবাহ-/276"],
["নৈতিকতা","ইসলামে কি নিরাপরাধ নারী-শিশু হত্যার অনুমতি দেয়া হয়েছে?","ইসলামে-কি-নিরাপরাধ-নারী-শিশু-হত্যার-অনুমতি-দেয়া-হয়েছে--/385"],
["নারী","হিজাব কি নারীর নিরাপত্তা দেয়?","হিজাব-কি-নারীর-নিরাপত্তা-দেয়--/337"],
["নারী","ইসলামে পুরুষদের ৪টি পর্যন্ত বিবাহের অনুমতি প্রসঙ্গ","ইসলামে-পুরুষদের-৪টি-পর্যন্ত-বিবাহের-অনুমতি-প্রসঙ্গ-/126"],
["নারী","নারী: স্বাধীনতা না দাসত্ব?","নারী:-স্বাধীনতা-না-দাসত্ব--/214"],
["নারী","ইসলামী আইনে নারীরা কি আসলেই পুরুষের চেয়ে কম উত্তরাধিকার সম্পদ পায়?","ইসলামী-আইনে-নারীরা-কি-আসলেই-পুরুষের-চেয়ে-কম-উত্তরাধিকার-সম্পদ-পায়--/408"],
["হাদিস","হাদিস কি ২০০ হিজরির পরে লিপিবদ্ধ হয়েছিল?","হাদিস-কি-২০০-হিজরির-পরে-লিপিবদ্ধ-হয়েছিল--/265"],
["হাদিস","আবু হুরায়রা(রা.) থেকে এত অধিক পরিমাণে হাদিস বর্ণনা পাওয়া যায় কেন?","আবু-হুরায়রা(রা.)-থেকে-এত-অধিক-পরিমাণে-হাদিস-বর্ণনা-পাওয়া-যায়-কেন--/352"],
["বিবিধ","মুসলিমদের দুরাবস্থা এবং ইসলামের সত্যতা","মুসলিমদের-দুরাবস্থা-এবং-ইসলামের-সত্যতা-/127"],
["বিবিধ","ইসলামোফোবিয়া","ইসলামোফোবিয়া/315"],
["নাস্তিক্যবাদ","প্রাণের উৎপত্তি: বিজ্ঞানের অসম্ভবতা ও স্রষ্টার অস্তিত্ব","https://www.frommuslims.com/%e0%a6%aa%e0%a7%8d%e0%a6%b0%e0%a6%be%e0%a6%a3%e0%a7%87%e0%a6%b0-%e0%a6%89%e0%a7%8e%e0%a6%aa%e0%a6%a4%e0%a7%8d%e0%a6%a4%e0%a6%bf/"],
["নাস্তিক্যবাদ","স্রষ্টার অস্তিত্ব ও চার ধরণের দলীল","https://www.frommuslims.com/%e0%a6%b8%e0%a7%8d%e0%a6%b0%e0%a6%b7%e0%a7%8d%e0%a6%9f%e0%a6%be%e0%a6%b0-%e0%a6%85%e0%a6%b8%e0%a7%8d%e0%a6%a4%e0%a6%bf%e0%a6%a4%e0%a7%8d%e0%a6%ac-%e0%a6%93-%e0%a6%9a%e0%a6%be%e0%a6%b0-%e0%a6%a7/"],
["নাস্তিক্যবাদ","ধর্ম ও দানশীলতা: কেন ধার্মিকরা বেশি দান করেন?","https://www.frommuslims.com/%e0%a6%a7%e0%a6%b0%e0%a7%8d%e0%a6%ae-%e0%a6%93-%e0%a6%a6%e0%a6%be%e0%a6%a8%e0%a6%b6%e0%a7%80%e0%a6%b2%e0%a6%a4%e0%a6%be/"],
["নাস্তিক্যবাদ","আদিমানবের প্রথম ধর্ম: একেশ্বরবাদ — নৃতত্ত্ব কী বলে?","https://www.frommuslims.com/%e0%a6%aa%e0%a7%8d%e0%a6%b0%e0%a6%a5%e0%a6%ae-%e0%a6%a7%e0%a6%b0%e0%a7%8d%e0%a6%ae-%e0%a6%8f%e0%a6%95%e0%a7%87%e0%a6%b6%e0%a7%8d%e0%a6%ac%e0%a6%b0%e0%a6%ac%e0%a6%be%e0%a6%a6/"],
["নবুয়ত","ইসলাম সত্য ধর্ম হওয়ার প্রমাণ: কোরআন ও মুহাম্মদ (সা.)-এর সত্যতা","https://www.frommuslims.com/%e0%a6%b0%e0%a6%be%e0%a6%b8%e0%a7%81%e0%a6%b2%e0%a7%87%e0%a6%b0-%e0%a6%a8%e0%a6%ac%e0%a7%81%e0%a6%af%e0%a6%bc%e0%a6%a4%e0%a7%87%e0%a6%b0-%e0%a6%b8%e0%a6%a4%e0%a7%8d%e0%a6%af%e0%a6%be%e0%a6%a4%e0%a6%be/"],
["বিজ্ঞান","বীর্য কি মেরুদণ্ড ও বক্ষপাঁজর থেকে বের হয়?","https://www.frommuslims.com/%e0%a6%ac%e0%a7%80%e0%a6%b0%e0%a7%8d%e0%a6%af-%e0%a6%95%e0%a6%bf-%e0%a6%ae%e0%a7%87%e0%a6%b0%e0%a7%81%e0%a6%a6%e0%a6%a3%e0%a7%8d%e0%a6%a1-%e0%a6%93-%e0%a6%ac%e0%a6%95%e0%a7%8d%e0%a6%b7%e0%a6%aa/"],
["বিজ্ঞান","উটের মূত্র নিয়ে করা সমস্ত অভিযোগের পোস্টমর্টেম","https://www.frommuslims.com/%e0%a6%89%e0%a6%9f%e0%a7%87%e0%a6%b0-%e0%a6%ae%e0%a7%82%e0%a6%a4%e0%a7%8d%e0%a6%b0%e0%a6%95%e0%a7%87-%e0%a6%95%e0%a7%87%e0%a6%a8%e0%a7%8d%e0%a6%a6%e0%a7%8d%e0%a6%b0-%e0%a6%95%e0%a6%b0%e0%a7%87/"],
["কুরআন","ইতিহাস ও ওহীর পাল্লায় যুলকারনাইন","https://www.frommuslims.com/%e0%a6%af%e0%a7%81%e0%a6%b2%e0%a6%95%e0%a6%be%e0%a6%b0%e0%a6%a8%e0%a6%be%e0%a6%87%e0%a6%a8-%e0%a6%87%e0%a6%a4%e0%a6%bf%e0%a6%b9%e0%a6%be%e0%a6%b8-%e0%a6%93-%e0%a6%93%e0%a6%b9%e0%a7%80%e0%a6%b0/"],
["নারী","হিজাব, নারী স্বাধীনতা ও যৌনতার সম্পর্ক","https://www.frommuslims.com/%e0%a6%b9%e0%a6%bf%e0%a6%9c%e0%a6%be%e0%a6%ac-%e0%a6%a8%e0%a6%be%e0%a6%b0%e0%a7%80-%e0%a6%b8%e0%a7%8d%e0%a6%ac%e0%a6%be%e0%a6%a7%e0%a7%80%e0%a6%a8%e0%a6%a4%e0%a6%be-%e0%a6%93-%e0%a6%af%e0%a7%8c/"],
["নারী","আয়িশা (রা)-কি বোধসম্পন্ন নারী ছিলেন না?","https://www.frommuslims.com/%e0%a6%86%e0%a6%af%e0%a6%bc%e0%a6%bf%e0%a6%b6%e0%a6%be-%e0%a6%b0%e0%a6%be-%e0%a6%95%e0%a6%bf-%e0%a6%ac%e0%a7%8b%e0%a6%a7%e0%a6%b8%e0%a6%ae%e0%a7%8d%e0%a6%aa%e0%a6%a8%e0%a7%8d%e0%a6%a8-%e0%a6%a8/"],
["নাস্তিক্যবাদ","প্রবলেম অব ইভল! মন্দ সমস্যার সমাধান","https://www.insightzonebd.com/প্রবলেম-অব-ইভল"],
["নাস্তিক্যবাদ","মহাবিশ্বের অসীম অতীত কী সম্ভব? এন্ট্রপি ও তাপগতিবিদ্যার আলোকে","https://www.insightzonebd.com/মহাবিশ্বের-অসীম-অতীত-কী-সম্ভব"],
["নাস্তিক্যবাদ","গড অফ দ্য গ্যাপস: নাস্তিকদের একটি জনপ্রিয় যুক্তির দার্শনিক পর্যালোচনা","https://www.insightzonebd.com/গড-অফ-দ্য-গ্যাপস"],
["নাস্তিক্যবাদ","ইসলামে কী যুক্তি চর্চা হারাম? যুক্তিবিদ্যা ও ইলমুল কালাম","https://www.insightzonebd.com/ইসলামে-কী-যুক্তি-চর্চা-হারাম-যুক্তিবিদ্যা-ও-ইলমুল-কালাম"],
["নাস্তিক্যবাদ","ভিডিও: আল্লাহর অস্তিত্ব নিয়ে নির্ভরশীলতার যুক্তি","https://www.youtube.com/watch?v=pfuxmCur3j4"],
["নাস্তিক্যবাদ","ভিডিও: আল্লাহ ন্যায়পরায়ণ হলে শিশুরা কেন কষ্ট পায়?","https://www.youtube.com/watch?v=ADf5pMhySeI"],
["নাস্তিক্যবাদ","নাস্তিকদের অভিযোগের জবাব বিষয়ক বইয়ের তালিকা","https://islamicauthors.com/article/460"],
["বিশ্বাস","আমি কেন ইসলাম ধর্মে বিশ্বাসী এবং ইসলাম ধর্ম পালন করি","https://islamicauthors.com/article/462"],
["বিশ্বাস","আল্লাহ কেন মানুষকে এতো কষ্ট ও বিপদ দেন?","https://islamicauthors.com/article/42"],
["কুরআন","কুরআনের আয়াত কি ছাগলে খেয়ে ফেলেছিল?","https://www.insightzonebd.com/কুরআনের-আয়াত-কি-ছাগলে-খেয়ে-ফেলেছিল"],
["কুরআন","ফরায়েজ নিয়ে বিভ্রান্তির নিরসন","https://islamicauthors.com/article/419"],
["বিজ্ঞান","বিজ্ঞান কি? বিজ্ঞান কাকে বলে?","https://www.insightzonebd.com/বিজ্ঞান-কি"],
["বিজ্ঞান","নাস্তিক মুক্তমনাদের বিজ্ঞানের নামে ভ্রান্ত তথ্যের জবাব","https://islamicauthors.com/article/463"],
["বিজ্ঞান","দর্শন কি? দর্শন কাকে বলে?","https://www.insightzonebd.com/দর্শন-কাকে-বলে"],
["হাদিস","কুরআন হাদিস মানতে হবে কেনো? হাদিস মানার কুরআনি ভিত্তি কি?","https://islamicauthors.com/article/4"],
["নবুয়ত","মুহাম্মদ (ﷺ) কেন ১১টি বিবাহ করলেন?","https://islamicauthors.com/article/120"],
["নৈতিকতা","ইসলামে মুরতাদের শাস্তি মৃত্যুদন্ড কী অমানবিক?","https://www.insightzonebd.com/ইসলামে-মুরতাদের-শাস্তি-মৃত্যুদন্ড-কী-অমানবিক"],
["নৈতিকতা","ইসলামে জিহাদের বিধান; জিহাদ ফি সাবিলিল্লাহ","https://www.insightzonebd.com/ইসলামে-জিহাদের-বিধান"],
["নৈতিকতা","ইসলামী রাষ্ট্রে অমুসলিমদের অধিকার: শরীয়াহর আলোকে একটি বিশ্লেষণ","https://www.insightzonebd.com/ইসলামী-রাষ্ট্রে-অমুসলিম"],
["নারী","ইসলামে নারীরাও তালাক দিতে পারে","https://islamicauthors.com/article/160"],
["নারী","হিজাব ও নারীদেহের তাপমাত্রা","https://islamicauthors.com/article/459"],
["বিবিধ","আদম (আ.) কি আরবিভাষী ছিলেন? তাহলে পৃথিবীতে এত ভাষা কেন?","আদি-পিতা-আদম(আ)-কি-আরবিভাষী-ছিলেন--তাহলে-পৃথিবী-জুড়ে-এত-ভাষা-কেন--/71"],
["বিশ্বাস","ঝড়-বন্যা-ভূমিকম্প এসব কি শুধুই আল্লাহর আজাব?","ঝড়-বন্যা-ভূমিকম্প-এসব-কি-শুধুই-আল্লাহর-আজাব--/398"],
["বিজ্ঞান","কোনটি আগে সৃষ্টি করা হয়েছে, আকাশ নাকি পৃথিবী?","কোনটি-আগে-সৃষ্টি-করা-হয়েছে,-আকাশ-নাকি-পৃথিবী--/397"],
["বিশ্বাস","আল্লাহ সর্বপ্রথম কী সৃষ্টি করেছেন?","আল্লাহ-সর্বপ্রথম-কী-সৃষ্টি-করেছেন--/391"],
["বিশ্বাস","কবরের আযাব: আগে ও পরে মারা যাওয়া ব্যক্তিরা কি যথার্থ শাস্তি পাবে?","কবরের-আযাবঃ-আগে-ও-পরে-মারা-যাওয়া-ব্যক্তিরা-কি-পাপ-অনুযায়ী-যথার্থ-শাস্তি-পাবে--/131"],
["বিজ্ঞান","কুরআন কি আসলেই দাবি করে সৌরজগতে গ্রহ ৭টি?","কুরআন-কি-আসলেই-দাবি-করে-সৌরজগতে-গ্রহ-৭টি--/84"],
["বিশ্বাস","আল্লাহ কি আসলেই মক্কায় পুজিত ৩৬০ দেবতার একজন ছিলেন?","-আল্লাহ-কি-আসলেই-মক্কায়-পুজিত-৩৬০-দেবতার-একজন-ছিলেন--/206"],
["কুরআন","উসমান (রা.)-এর সংকলিত কুরআনের কপিতে কি লিপিকারদের ভুল ছিল?","উসমান(রা.)-সংকলিত-কুরআনের-কপিতে-আসলেই-কি-লিপিকারদের-ভুল-(Scribal-Errors)-বা-ব্যাকরণগত-ভুল-ছিলো--/299"],
["নবুয়ত","রাসূল (ﷺ) কি সাওদা (রা.)-কে বৃদ্ধ হওয়ার কারণে তালাক দিয়েছিলেন?","https://www.frommuslims.com/%e0%a6%b0%e0%a6%be%e0%a6%b8%e0%a7%82%e0%a6%b2-%ef%b7%ba-%e0%a6%95%e0%a6%bf-%e0%a6%b8%e0%a6%be%e0%a6%93%e0%a6%a6%e0%a6%be-%e0%a6%b0%e0%a6%be-%e0%a6%95%e0%a7%87/"],
["কুরআন","কুরআনের অনুরূপ কুরআন বা সূরা তৈরি করা কি সম্ভব? (প্রশ্নোত্তর)","https://www.frommuslims.com/qna/%e0%a6%95%e0%a7%81%e0%a6%b0%e0%a6%86%e0%a6%a8%e0%a7%87%e0%a6%b0-%e0%a6%85%e0%a6%a8%e0%a7%81%e0%a6%b0%e0%a7%82%e0%a6%aa-%e0%a6%95%e0%a7%81%e0%a6%b0%e0%a6%86%e0%a6%a8-%e0%a6%ac%e0%a6%be-%e0%a6%b8/"],
["নাস্তিক্যবাদ","একজন ডিইস্টকে কীভাবে ইসলামের সত্যতা বোঝানো যায়? (প্রশ্নোত্তর)","https://www.insightzonebd.com/question/173"],
["বিশ্বাস","অমুসলিম পরিবারে জন্ম নেওয়া মানুষের জাহান্নামের বিধান কি অমানবিক? (প্রশ্নোত্তর)","https://www.insightzonebd.com/question/156"],
["বিশ্বাস","যাদের কাছে ইসলামের দাওয়াত পৌঁছায়নি, তাদের বিচার কীভাবে হবে? (প্রশ্নোত্তর)","https://www.insightzonebd.com/question/148"],
["বিশ্বাস","মেরাজের রাতের ঘটনা ও বারযাখের জীবন কীভাবে বুঝব? (প্রশ্নোত্তর)","https://www.insightzonebd.com/question/147"],
["বিশ্বাস","মানুষের ইচ্ছা ও আল্লাহর কর্ম: তাকদির ও স্বাধীন ইচ্ছা (প্রশ্নোত্তর)","https://www.insightzonebd.com/question/169"],
["নৈতিকতা","গান-বাজনা কেন ইসলামে নিষিদ্ধ?","https://islamicauthors.com/article/48"],
["নারী","সমান অধিকার কাকে বলে?","https://islamicauthors.com/article/461"],
["নারী","হাদিসে কি নারীদেরকে পুরুষের জন্য ফিতনা বলে হেয় করা হয়েছে?","হাদিসে-কি-নারীদেরকে-পুরুষের-জন্য-বিপর্যয়কর-বা-ফিতনা-বলে-হেয়-করা-হয়েছে--/409"],
["নৈতিকতা","ইসলাম কি অন্য মুসলিমের দোষ গোপন রাখতে বলে অপরাধীকে প্রশ্রয় দেয়?","ইসলাম-কি-অন্য-মুসলিমের-দোষ-গোপন-রাখতে-বলে-অপরাধীকে-প্রশ্রয়-দেয়--/407"],
["বিবিধ","ইসলামে কি ৩-৪টি বাদে সকল প্রকার খেলাধুলা হারাম?","ইসলামে-কি-৩-৪টি-বাদে-সকল-প্রকার-খেলাধুলা-হারাম--/405"],
["নারী","হাওয়া (আ.)-এর জন্যই কি নারীরা সব দুর্দশার মূল?","হাওয়া(আ.)-এর-জন্যই-কি-নারীরা-স্বামীর-সাথে-বেঈমানী-করে-নারীরা-কি-সব-দুর্দশার-মূল--/404"],
["বিজ্ঞান","বনী ইস্রাঈলের পাপের পর থেকে কি খাদ্যে-মাংসে পচন ধরা শুরু হয়?","বনী-ইস্রাঈলের-পাপের-পর-থেকে-কি-খাদ্যে-বা-মাংসে-পচন-ধরা-শুরু-হয়--/403"],
["কুরআন","কুরআনের বর্ণনাকারী ইমাম হাফস কি দুর্বল রাবী ও মিথ্যাবাদী ছিলেন?","কুরআনের-বর্ণনাকারী-ইমাম-হাফস-কি-দুর্বল-রাবী-ও-মিথ্যাবাদী-ছিলেন--/400"],
["বিশ্বাস","কিয়ামতের পূর্বে শেষ যুগে কি ঘোড়া ও তলোয়ার দিয়ে যুদ্ধ হবে?","কিয়ামতের-পূর্বে-শেষ-যুগে-কি-ঘোড়া-ও-তলোয়ার-দিয়ে-যুদ্ধ-হবে--/399"],
["বিশ্বাস","নবী ﷺ কি কিয়ামত অতি দ্রুত হবে মনে করে ভুল ধারণা পোষণ করতেন?","নবী-ﷺ-কি-কিয়ামত-অতি-দ্রুত-হবে-মনে-করে-ভুল-ধারণা-পোষণ-করতেন--/396"],
["বিজ্ঞান","কুরআনে কি উল্কা ও নক্ষত্রকে মিলিয়ে ফেলা হয়েছে?","কুরআনে-কি-উল্কা-ও-নক্ষত্রকে-মিলিয়ে-ফেলা-হয়েছে-শয়তানকে-তাড়ানোর-জন্য-কি-নক্ষত্র-ছুঁড়ে-মারা-হয়--/394"],
["বিশ্বাস","মিরাজের রাতে নবী (ﷺ) কোনটি আগে দেখেন, সিদরাতুল মুনতাহা নাকি বাইতুল মামুর?","মিরাজের-রাতে-নবী-(ﷺ)-কোনটি-আগে-দেখেন-সিদরাতুল-মুনতাহা-নাকি-বাইতুল-মামুর--/393"],
["বিজ্ঞান","সন্তানের লিঙ্গ নির্ধারণ বিষয়ে হাদিস ও বিজ্ঞানের বক্তব্য: একটি পর্যালোচনা","সন্তানের-লিঙ্গ-নির্ধারণ-বিষয়ে-হাদিস-ও-বিজ্ঞানের-বক্তব্য:-একটি-পর্যালোচনা/392"],
["নবুয়ত","নবী ﷺ-এর আল-আমিন উপাধির কাহিনী কতটুকু সত্য?","নবী-ﷺ-এর-আল-আমিন-উপাধীর-কাহিনী-কতটুকু-সত্য-ইসলাম-কি-প্রতিশ্রুতি-ভঙ্গের-শিক্ষা-দেয়--/387"],
["কুরআন","নবী (ﷺ) এবং সাহাবীগণ কি কুরআনের কিছু আয়াত ভুলে গিয়েছিলেন?","নবী(ﷺ)-এবং-সাহাবী(রা.)গণ-কি-কুরআনের-কিছু-আয়াত-ভুলে-গিয়েছিলেন--/386"],
["হাদিস","হাদিসে কি নোংরা পানিকে পবিত্র বলা হয়েছে?","হাদিসে-কি-নোংরা-পানিকে-পবিত্র-বলা-হয়েছে--/384"],
["বিজ্ঞান","আজওয়া খেজুর খেলে কি বিষ কাজ করে না?","আজওয়া-খেজুর-খেলে-কি-বিষ-কাজ-করে-না--/381"],
["কুরআন","সূরা মায়িদাহর ৬৯ নং আয়াতে কি ভুল আছে?","সুরা-মায়িদাহর-৬৯-নং-আয়াতে-কি-ভুল-আছে--/380"],
["কুরআন","কুরআনে উত্তরাধিকার সম্পদ বণ্টন আইনে গাণিতিক ভুলের অভিযোগ ও জবাব","কুরআনে-উত্তরাধিকার-সম্পদ-বণ্টন-আইনে-গাণিতিক-ভুলের-অভিযোগ-ও-এর-জবাব-/142"],
["বিজ্ঞান","মক্কা-মদীনায় কি মহামারী হতে পারে?","মক্কা-মদীনায়-কি-মহামারী-হতে-পারে--/264"],
["বিশ্বাস","হজের সময়ে কি শয়তানের মূর্তিতে পাথর নিক্ষেপ করা হয়?","হজের-সময়ে-কি-শয়তানের-মূর্তিতে-পাথর-নিক্ষেপ-করা-হয়--/330"],
["কুরআন","ফিরআউনের সহচর হামান: কুরআনের ঐতিহাসিক বর্ণনায় কি ভুল আছে?","নবী-মুসা(আ.)-এর-সময়কালে-ফিরআউনের-সহচর-হামান-(Haman)-:-কুরআনের-ঐতিহাসিক-বর্ণনায়-কি-ভুল-আছে--/168"],
["বিশ্বাস","আল্লাহ কি মানুষের সাথে মাধ্যম ছাড়া সরাসরি কথা বলেন?","আল্লাহ-কি-মানুষের-সাথে-কোন-মাধ্যম-ছাড়া-সরাসরি-কথা-বলেন--/95"],
["বিশ্বাস","ইবলিশ কি একজন ফেরেশতা ছিল নাকি জিন?","ইবলিশ-কি-একজন-ফেরেশতা-ছিল-নাকি-জিন--/115"],
["কুরআন","মদের ব্যাপারে কুরআনের বিধান কি স্ববিরোধী?","মদের-ব্যাপারে-কুরআনের-বিধান-কি-স্ববিরোধী--/149"],
["নারী","সব নারীকেই কি তাদের স্বামীর পাঁজরের হাড় থেকে সৃষ্টি করা হয়েছে?","সব-নারীকেই-কি-তাদের-স্বামীর-পাঁজরের-হাড়-থেকে-সৃষ্টি-করা-হয়েছে--/182"],
["কুরআন","আগুনে সব কিছু পুড়ে গেলেও পোড়েনি কুরআন!","আগুনে-সব-কিছু-পুড়ে-গেলেও-পোড়েনি-কুরআন--/346"],
["বিজ্ঞান","জাহান্নামের উত্তাপের কারণে কীভাবে জ্বর হতে পারে?","জাহান্নামের-উত্তাপের-কারণে-কীভাবে-জ্বর-হতে-পারে--/205"],
["কুরআন","জাহান্নামীদের খাদ্য সম্পর্কে কুরআনের বক্তব্যে কি স্ববিরোধিতা আছে?","জাহান্নামীদের-খাদ্য-সম্পর্কে-কুরআনের-বক্তব্যে-কি-স্ববিরোধিতা-আছে--/286"],
["বিজ্ঞান","সূর্যের আরশের নিচে সিজদা করা সংক্রান্ত হাদিসের পর্যালোচনা","সূর্যের-আরশের-নিচে-সিজদা-করা-সংক্রান্ত-হাদিসের-পর্যালোচনা/350"],
["হাদিস","কিয়ামতের প্রথম আলামত কী? হাদিসের তথ্যে কি অসঙ্গতি আছে?","কিয়ামতের-প্রথম-আলামত-কী--এ-প্রসঙ্গে-হাদিসের-তথ্যে-কি-অসঙ্গতি-আছে--/367"],
["বিবিধ","নিরাপদ নগরীতে দুর্ঘটনা কেন ঘটে?","নিরাপদ-নগরীতে-দুর্ঘটনা-কেন-ঘটে--/146"],
["বিজ্ঞান","গ্রেগরী থেকেও নির্ভুল ওমর খৈয়ামের জালালী পঞ্জিকা","https://www.frommuslims.com/%e0%a6%9c%e0%a6%be%e0%a6%b2%e0%a6%be%e0%a6%b2%e0%a7%80-%e0%a6%aa%e0%a6%9e%e0%a7%8d%e0%a6%9c%e0%a6%bf%e0%a6%95%e0%a6%be/"],
["বিবিধ","রোম সম্রাটের সামনে ইমাম বাকিল্লানীর (রহ.) অসাধারণ বুদ্ধিমত্তা","https://www.frommuslims.com/%e0%a6%b0%e0%a7%8b%e0%a6%ae-%e0%a6%b8%e0%a6%ae%e0%a7%8d%e0%a6%b0%e0%a6%be%e0%a6%9f%e0%a7%87%e0%a6%b0-%e0%a6%b8%e0%a6%be%e0%a6%ae%e0%a6%a8%e0%a7%87-%e0%a6%87%e0%a6%ae%e0%a6%be%e0%a6%ae-%e0%a6%ac/"],
["হাদিস","কিছু হাদিস নিয়ে প্রশ্ন (প্রশ্নোত্তর)","https://www.frommuslims.com/qna/%e0%a6%95%e0%a6%bf%e0%a6%9b%e0%a7%81-%e0%a6%b9%e0%a6%be%e0%a6%a6%e0%a6%bf%e0%a6%b8-%e0%a6%a8%e0%a6%bf%e0%a6%af%e0%a6%bc%e0%a7%87-%e0%a6%aa%e0%a7%8d%e0%a6%b0%e0%a6%b6%e0%a7%8d%e0%a6%a8/"],
["নবুয়ত","রাসূল ﷺ আলীকে (রাঃ) দ্বিতীয় বিয়ের অনুমতি দেন নি কেন?","https://www.frommuslims.com/%e0%a6%b0%e0%a6%be%e0%a6%b8%e0%a7%82%e0%a6%b2-%ef%b7%ba-%e0%a6%86%e0%a6%b2%e0%a7%80%e0%a6%95%e0%a7%87-%e0%a6%b0%e0%a6%be%e0%a6%83-%e0%a6%a6%e0%a7%8d%e0%a6%ac%e0%a6%bf%e0%a6%a4%e0%a7%80%e0%a6%af/"],
["বিবিধ","হায়েনা, পঙ্গপাল, বেজি খাওয়া জায়েজ কি? (প্রশ্নোত্তর)","https://www.insightzonebd.com/question/171"],
["নবুয়ত","নবী (ﷺ) কেন জুওয়াইরিয়াহ (রা.)-কে বিয়ে করেছিলেন? (প্রশ্নোত্তর)","https://www.insightzonebd.com/question/158"],
["বিশ্বাস","মুসলিমরা তওবা করলে কি সব অপরাধই ক্ষমা হয়ে যায়?","https://www.insightzonebd.com/মুসলিমরা-তওবা-করলে-কি-সব-অপরাধই-ক্ষমা-হয়ে-যায়"],
["নৈতিকতা","ভিডিও: চারজন সাক্ষী না থাকলে কি জিনার বিচার করা যায় না?","https://www.youtube.com/watch?v=-Q5qDzfik28"],
["নবুয়ত","মহানবী ﷺ-এর একাধিক বিয়ে নিয়ে অভিযোগের জবাব","https://islamicauthors.com/article/157"]
].map(x=>[x[0],x[1],x[2].startsWith("http")?x[2]:encodeURI(QB+x[2])]);

/* ===== ফতোয়া: [বিষয়, প্রশ্ন, al-itisam.com-এর আর্টিকেল নম্বর] — নতুন ফতোয়া এই তালিকায় যোগ করুন ===== */
const AI="https://al-itisam.com/article_details/";
const FT=[
["আক্বীদা","হানাফী, শাফেঈ, সালাফী, আহলেহাদীছ—এগুলো কি ফিরকা?","7034"],
["আক্বীদা","“পাপীকে নয়, পাপকে ঘৃণা করো” বলা বা বিশ্বাস করা যাবে কি?","7035"],
["আক্বীদা","ঔষধ খেয়ে জ্বর ভালো হয়েছে বললে কি শিরক হবে?","7036"],
["আক্বীদা","জিনকে কি বশ করা বা বোতলে আটকে রাখা যায়?","7037"],
["বিবিধ","গণতান্ত্রিক পদ্ধতিতে ক্ষমতায় আসা শাসকের আনুগত্য কি ফরয?","7038"],
["আক্বীদা","মালাকুল মাউতের কাছে তালিকা আছে—এ বিশ্বাস রাখা ইমামের পিছনে ছালাত হবে কি?","7040"],
["আক্বীদা","অসুস্থতা কি নেয়ামত, শাস্তি নাকি পরীক্ষা?","7041"],
["পবিত্রতা","টয়লেটের ভেতর ওযূর সময় বিসমিল্লাহ ও দু‘আ পড়া যাবে কি?","7042"],
["ছালাত","মাসবূক রুকূতে থাকা ইমামকে পেলে তাকবীর ও রাফউল ইয়াদাইন কীভাবে করবে?","7043"],
["ছালাত","একই ব্যক্তির জানাযায় একই ইমাম দুইবার ইমামতি করতে পারেন কি?","7044"],
["ছালাত","আকাশ ফর্সা হলে ফজর পড়া হয় এমন মসজিদে ছালাত পড়া যাবে কি?","7045"],
["ছালাত","বিয়ে না করলে বা অন্ধ-খোঁড়া হলে ইমামতি করা যাবে না—কথাটি কি সঠিক?","7046"],
["ছালাত","জুমআ ছুটে গেলে খুৎবা দিয়ে দ্বিতীয়বার জুমআ পড়া যাবে কি?","7047"],
["ছালাত","সফরে যোহর-আছর ২+২ নাকি ৪+৪ করে পড়ব? একসাথে নাকি আলাদা?","7048"],
["ছালাত","ছালাতে শ্বাসকষ্ট হলে ইনহেলার ব্যবহার করা যাবে কি?","7049"],
["ছালাত","ভয়ে ছালাত আদায় করলে কি কবুল হবে? ওযূ ছাড়া পড়লে শিক্ষক দায়ী?","7050"],
["যাকাত ও দান","মৃতের পরিবারকে হাদিয়া দিলে কি যাকাত আদায় হবে?","7051"],
["যাকাত ও দান","সাহায্যের নিয়্যত করেছিলাম, এখন না দিলে কি গুনাহগার হব?","7052"],
["লেনদেন","ঘুষ ছাড়া বদলি হচ্ছে না, টাকা দিয়ে বদলি নেওয়া জায়েয কি?","7053"],
["বিবিধ","হিন্দু নাপিতের কাছে চুল কাটা ও তাদের সাথে লেনদেন করা যাবে কি?","7054"],
["পরিবার","স্বামী মারা গেলে নাকফুল, দুল, চুড়ি খুলে ফেলা কি জায়েয?","7055"],
["চিকিৎসা","চিকিৎসার জন্য ডাক্তারকে গোপনাঙ্গ দেখানো যাবে কি?","7056"],
["বিবিধ","দাড়ি বড় হলে গিট্টু দিয়ে রাখা কি শরীআতসম্মত?","7057"],
["বিদআত ও রসম","অনুষ্ঠানে কুরআন তেলাওয়াত ও নাশীদের বিধান কী?","7058"],
["বিদআত ও রসম","গর্ভে বাচ্চা মারা গেলে কলা-দুধ-মিষ্টি বিতরণের বিধান আছে কি?","7059"],
["বিদআত ও রসম","বিয়েতে স্বামীর পা ছুঁয়ে সালাম ও একই গ্লাসে শরবত—শরীআত কী বলে?","7060"],
["বিবিধ","কাঁচা পেঁয়াজ খাওয়া কি নাজায়েয?","7061"],
["বিবিধ","কাউকে ‘হুজুর’ বলে সম্বোধন করা যাবে কি?","7062"],
["লেনদেন","আয়কর নথিতে পুরো আয় না দেখিয়ে মাদরাসা-মসজিদে দান করা বৈধ কি?","7063"],
["বিদআত ও রসম","অনুষ্ঠান শেষে হাত তুলে সম্মিলিত মুনাজাত করা যাবে কি?","7064"],
["বিবিধ","Yuzarsif (ইউজারসিফ) নামটি রাখা যাবে কি?","7065"],
["বিবিধ","নামের শেষে মাদানী, সালাফী, কাসেমী, সুফী ইত্যাদি উপাধি লাগানো যাবে কি?","7066"],
["বিবিধ","ঘর বা মসজিদের টিনে প্রাণীর ছবি থাকলে ছালাত ও বিধান কী?","7067"],
["আক্বীদা","“ভিডিও শেয়ার না করলে ক্ষতি হবে” ধরনের কসম দেওয়া যাবে কি?","7068"],
["লেনদেন","হিমাগারে অগ্রিম ভাড়া ফেরতের অতিরিক্ত টাকা কি সূদ?","7069"],
["পরিবার","স্ত্রী সন্তান নিতে না চাইলে চাপ বা তালাক দেওয়া যাবে কি?","7070"],
["পরিবার","স্বামী আয় না বললে স্ত্রীকে মিথ্যা বলা বা গোপন করা যাবে কি?","7071"],
["পরিবার","সন্তানের উপার্জিত সম্পদ কি সবই পিতাকে দিতে বাধ্য?","7072"],
["চিকিৎসা","তৃতীয় সিজারের পর জরায়ু কেটে ফেলা যাবে কি?","7073"],
["পরিবার","মা ও স্ত্রীর ঝামেলায় কার কথা শুনব?","7074"],
["উত্তরাধিকার","বোনদের ভিটে না দিয়ে শুধু ধানী জমি দিলে কি অন্যায় হবে?","7075"],
["উত্তরাধিকার","মৃত স্বামীর ব্যাংকের টাকায় হক্ব আদায়ে মামলা করা যাবে কি?","7076"],
["লেনদেন","নারীরা কি অনলাইনে ব্যবসা করতে পারবে?","7077"],
["হাদীছ","একই হাদীছ ছহীহ, হাসান ও যঈফ বলার কারণ কী? সাধারণ মানুষ কোনটি নেবে?","7078"],
["হাদীছ","সূরা ইয়াসীনের প্রথম ৯ আয়াত পড়লে শত্রু অন্ধ হয়—কথাটি কি সঠিক?","7079"],
["হাদীছ","সূরা আল-কাহফ-এর ফযীলত কী?","7080"],
["লেনদেন","কেনা পোশাক ত্রুটিপূর্ণ হলে দোকান ফেরত না নিলে বিধান কী?","7081"],
["আক্বীদা","কসম করে ভঙ্গ করলে কাফফারা দিতে হবে কি?","7082"],
["আক্বীদা","মিথ্যা সাক্ষ্য দিয়ে তওবা করলে কাফফারা কী?","7083"],
["আক্বীদা","জান্নাতুল ফিরদাউস পাওয়ার জন্য কী কী গুণ প্রয়োজন?","4444"],
["আক্বীদা","আল্লাহর নেয়ামতের শুকরিয়া আদায় করব কীভাবে?","4445"],
["জ্ঞান","একজন মুসলিমের ন্যূনতম কতটুকু ইসলামী জ্ঞান অর্জন ফরয?","4446"],
["আক্বীদা","ছোট গুনাহ বা সুন্নাত ছাড়লে রোগ-শাস্তি আসে—ধারণাটি কি সঠিক?","4447"],
["হজ্জ","ইহরামে ফোঁটায় ফোঁটায় পেশাব হলে আন্ডারওয়্যার ব্যবহার করা যাবে কি?","4448"],
["পবিত্রতা","হায়েয চলাকালে নারীরা কুরআন স্পর্শ বা মুখস্থ তেলাওয়াত করতে পারবে কি?","4449"],
["পবিত্রতা","ওযূর দু‘আ পড়ার সময় আকাশের দিকে তাকাতে বা আঙুল তুলতে হবে কি?","4450"],
["ছালাত","ফজর শেষ করতে গিয়ে নিষিদ্ধ সময় শুরু হলে ছালাত কবুল হবে কি?","4451"],
["ছালাত","সাহু সিজদাহ দিতে ভুলে গেলে করণীয় কী? ছালাত কি বাতিল?","4452"],
["ছালাত","ঘুমে ফজর মিস হলে দেরিতে কাযা পড়া কি চলবে?","4453"],
["ছালাত","সফরে কাযা হওয়া ছালাত ফিরে এসে কছর নাকি পূর্ণ পড়তে হবে?","4454"],
["ছালাত","ফরযের পরের তাসবীহ কি সুন্নাত-নফলের পরে পড়া যাবে?","4455"],
["পবিত্রতা","গুরুতর অসুস্থ ব্যক্তির স্বপ্নদোষ হলে ছালাত কীভাবে পড়বে?","4456"],
["ছালাত","একাধিক ওয়াক্ত কাযা হলে জামাআতে কাযা ছালাত পড়া যাবে কি?","4457"],
["ছালাত","মসজিদে জামাআত চলাকালে আলাদা ছালাত পড়লে কি হবে?","4458"],
["ছালাত","হানাফী ইমামের পিছনে সাহু সিজদা কীভাবে দেব?","4459"],
["ছালাত","জুমআর খুৎবা শোনা কি ওয়াজিব? তাহিয়্যাতুল মসজিদ আগে পড়ব কি?","4460"],
["ছালাত","মুক্তাদী কি ইমামের সাথে সাথে সালাম ফিরাবে?","4461"],
["ছালাত","দূরের মসজিদে যানবাহনে জুমআ পড়তে গেলে ছওয়াব কমে কি?","4462"],
["ছালাত","আযানের আগেই ওয়াক্ত হলে ছালাত আদায় করা যাবে কি?","4463"],
["বিবিধ","একাডেমিক প্র্যাক্টিক্যালে বাধ্য হয়ে প্রাণীর ছবি আঁকলে গুনাহ হবে কি?","4464"],
["লেনদেন","ফিজিশিয়ান স্যাম্পল বিক্রি করা যাবে কি?","4465"],
["লেনদেন","ড্রপশিপিং পদ্ধতিতে পণ্য বিক্রি কি শরীআতসম্মত?","4466"],
["বিদআত ও রসম","আকীকায় খাওয়া-দাওয়ার আয়োজন ও উপহার গ্রহণ করা যাবে কি?","4467"],
["বিদআত ও রসম","পীরের কবরযুক্ত ‘খানকায়ে’ মসজিদে ছালাত আদায় করা জায়েয কি?","4468"],
["ছালাত","ফোনে বা অন্যের কাছে সিজদার আয়াত শুনলে সিজদা দেওয়া ওয়াজিব কি?","4469"],
["বিদআত ও রসম","শুক্রবারে ‘জুম্মা মোবারক’ বলে শুভেচ্ছা জানানো জায়েয কি?","4470"],
["বিবিধ","কিনে বা অন্যকে দিয়ে করিয়ে একাডেমিক এসাইনমেন্ট জমা দেওয়া জায়েয কি?","4471"],
["লেনদেন","ইএমআই (EMI)-তে বিক্রিতে অতিরিক্ত চার্জ ও সেখানে চাকরির বিধান কী?","4472"],
["লেনদেন","সূদ-ঘুষ-ভ্যাট ফাঁকির সাথে জড়িত হিসাব রক্ষকের চাকরি করা যাবে কি?","4473"],
["লেনদেন","সহশিক্ষা প্রতিষ্ঠানে চাকরি করে ইনকাম হালাল হবে কি?","4474"],
["লেনদেন","ইন্সটলমেন্টে সূদ (APR) বা Renting Cost যোগ হলে কি হালাল?","4475"],
["লেনদেন","GST রেজিস্ট্রেশনে মিথ্যা তথ্য দিলে কি ইনকাম হারাম হয়?","4476"],
["লেনদেন","সহশিক্ষা প্রতিষ্ঠানের শিক্ষকের উপার্জন কি হালাল?","4477"],
["খাদ্য","বেনামাযীর যবেহকৃত প্রাণীর গোশত খাওয়া কি হালাল?","4478"],
["পরিবার","দুধ সম্পর্ক সাব্যস্তের নিয়ম কী? একবার ৪-৫ মিনিট খেলে কি হবে?","4479"],
["পরিবার","রাগের মাথায় ‘যাহ তুই তালাক’ বললে কি তালাক পতিত হয়?","4480"],
["হাদীছ","স্বামীকে অসন্তোষের কথা বললে নেক আমল বরবাদ—হাদীছটি কি ছহীহ?","4481"],
["পরিবার","বাবা-মা দ্বীনহীন পাত্রের সাথে বিয়ে দিতে চাইলে মেয়ের করণীয় কী?","4482"],
["পরিবার","মাযারপূজারী আত্মীয়ের সাথে সম্পর্ক রাখা কি জরুরী?","4483"],
["পরিবার","সন্তানের জন্য কি সম্পদ রেখে যাওয়া আবশ্যক?","4484"],
["হাদীছ","পাগড়ি পরে ছালাতে ৭০ গুণ ছওয়াবের হাদীছ কি সঠিক?","4485"],
["আক্বীদা","অন্তরে ঈমান ও অহংকার দুটোই থাকলে ফায়সালা কীভাবে হবে?","4486"],
["আক্বীদা","হজ্জ নিষ্পাপ করে দেয়—এটা কি কাবীরা গুনাহের ক্ষেত্রেও প্রযোজ্য?","4487"],
["বিবিধ","বসে ও দাঁড়িয়ে পানি পান করার শরঈ বিধান কী?","4488"],
["বিবিধ","সময়ের বরকত চাওয়ার জন্য কি দু‘আ পড়া যায়?","4489"],
["বিবিধ","‘অমুক সালাম জানিয়েছেন’ বললে কীভাবে উত্তর দেব?","4490"],
["লেনদেন","ছাত্রজীবনের অপরিশোধিত ঋণ কীভাবে আদায় করব?","4491"],
["বিবিধ","মৃতব্যক্তির মুখমণ্ডল দেখলে কি ছওয়াব হয়?","4492"],
["আক্বীদা","হতাশা ও দুশ্চিন্তা থেকে পরিত্রাণের ইসলামী উপায় কী?","4493"],
["আক্বীদা","মরিয়ম ফুল ঘরে রাখলে রহমত হয়—কথাটি কি সত্য?","2932"],
["আক্বীদা","গৃহপালিত পশু-পাখি মারা গেলে বালা-মুছীবত কেটে যায়—কথাটি কি সঠিক?","2933"],
["আক্বীদা","পীরের দেওয়া লেখা নদীর পানিতে ফেলা কি পাপ?","2934"],
["আক্বীদা","কিয়ামত না হওয়া সত্ত্বেও নবী (ﷺ) জান্নাত-জাহান্নাম কীভাবে দেখলেন?","2935"],
["পরিবার","পীরভক্ত মা বেপর্দায় চললে সন্তানের কি গুনাহ হবে?","2936"],
["বিবিধ","আব্দুল মুবীন নামের শুধু ‘মুবীন’ বলে ডাকলে কি শিরক হবে?","2937"],
["আক্বীদা","আল্লাহ কারো উপর সন্তুষ্ট না অসন্তুষ্ট—বোঝার উপায় আছে কি?","2938"],
["পবিত্রতা","গোসলের পর ছালাতের জন্য কি নতুন করে ওযূ করতে হবে?","2939"],
["পবিত্রতা","গোসল ও ওযূর পরিবর্তে তায়াম্মুম কীভাবে করতে হয়?","2940"],
["বিবিধ","ময়ূর কি নাপাক প্রাণী? ঘরে ময়ূরের পালক রাখা জায়েয কি?","2941"],
["আক্বীদা","জাদুর দৃশ্যযুক্ত মুভি দেখলে কি ৪০ দিনের ছালাত কবুল হয় না?","2942"],
["হাদীছ","যোহরের আগে-পরে ৪ রাকআত পড়লে জাহান্নাম হারামের দলীল কী?","2943"],
["ছালাত","ইকামত কি ইমামের সোজাসুজি দাঁড়িয়ে দিতে হবে?","2944"],
["ছালাত","পর্দায় ও ছালাতে কি পা ঢাকা ফরয?","2945"],
["ছালাত","জুমআর আযানের পর অন্য কাজ করা কি বৈধ?","2946"],
["ছালাত","ঈদের ছালাতের শেষ বৈঠকে ওযূ ভঙ্গ হলে করণীয় কী?","2947"],
["বিবিধ","কবর যিয়ারতের সময় আলাদা কোনো দু‘আ আছে কি?","2948"],
["বিদআত ও রসম","রান্নার চাল থেকে এক মুঠো চাল তুলে রেখে দান করা কি জায়েয?","2949"],
["হাদীছ","মারফূ বা মাওকূফ হাদীছের উপর আমল করা যাবে কি?","2950"],
["বিবিধ","খাওয়ার পর প্লেট চেটে ধোয়া পানি পান করা কি সুন্নাত?","2951"],
["আক্বীদা","‘আমরা রাসূলের গোলাম’ বলা যাবে কি?","2952"],
["বিবিধ","মেয়েরা কি গায়ে আতর মাখতে পারবে?","2953"],
["লেনদেন","হিজামা করিয়ে পারিশ্রমিক নেওয়া যাবে কি?","2954"],
["বিবিধ","হারাম পোস্টে নছীহতমূলক কমেন্ট করা কি জায়েয?","2955"],
["ছালাত","মসজিদে বাংলা খুৎবা চলাকালে বই বিক্রি করা যাবে কি?","2956"],
["বিবিধ","কবরে বস্তায় করে মাটি দেওয়া যাবে কি?","2957"],
["লেনদেন","মসজিদের দোকানে বিড়ি-সিগারেট বিক্রি হলে সেখানে ছালাত পড়া জায়েয কি?","2958"],
["বিদআত ও রসম","মুনাজাত শেষে মুখ মাসাহ করা যাবে কি?","2959"],
["বিবিধ","বিপদে শুধু ‘ইন্না-লিল্লাহ’ বলা যাবে কি?","2960"],
["বিবিধ","হাফ প্যান্ট পরে ফুটবল খেলা কি জায়েয?","2961"],
["পরিবার","হারাম উপার্জনকারী আত্মীয়ের দাওয়াত গ্রহণ ও সম্পর্ক রাখা যাবে কি?","2962"],
["বিবিধ","কারো শরীরে পা লাগলে সালাম বা চুম্বন করা যাবে কি?","2963"],
["বিবিধ","নার্সিং কলেজে হিজাব পরতে না দিলে করণীয় কী?","2964"],
["বিবিধ","মেয়েদের চুড়ি পরা কি বাধ্যতামূলক?","2965"],
["চিকিৎসা","সরকার জোরপূর্বক টিকা দিতে বাধ্য করলে ইসলাম কী বলে?","2966"],
["লেনদেন","ক্র্যাক বা পাইরেটেড সফটওয়্যার ব্যবহারের বিধান কী?","2967"],
["খাদ্য","গাধার মাংস খাওয়া কি হারাম?","2968"],
["লেনদেন","ফিক্সড ডিপোজিটের অতিরিক্ত টাকা নেওয়া কি হালাল?","2969"],
["আক্বীদা","হারাম রিযিক খেলে ইবাদত নাকি দু‘আ কবুল হয় না?","2970"],
["খাদ্য","মাযারে মানতকারী কিন্তু ছালাত আদায়কারীর যবেহকৃত গোশত হালাল কি?","2971"],
["পরিবার","পূর্বের ভুল স্ত্রী জিজ্ঞেস করলে সত্য বলা কি আবশ্যক?","2972"],
["পরিবার","তালাকপ্রাপ্তা নারীকে হিল্লা ছাড়া পুনরায় বিবাহ করা যায় কি?","2973"],
["পরিবার","স্ত্রী খারাপ আচরণ করলে প্রবাসী স্বামী টাকা না দিলে কি গুনাহ হবে?","2974"],
["পরিবার","পাত্রী নির্বাচনে ইসলাম কোন দিক বিবেচনা করতে বলে?","2975"],
["যাকাত ও দান","ছেলে নেই এমন শ্বশুর-শাশুড়িকে দান করা ও দেখাশোনা কার দায়িত্ব?","2976"],
["হাদীছ","‘যে আল্লাহকে সাহায্য করবে’—আয়াতের ব্যাখ্যা কী?","2977"],
["হাদীছ","মূসা (আ.) শেষ নবীর উম্মত হতে চেয়েছেন—হাদীছে প্রমাণিত কি?","2978"],
["লেনদেন","রেজিস্ট্রেশন ফি দিয়ে প্রতিযোগিতায় অংশগ্রহণ কি জুয়া?","2979"],
["যাকাত ও দান","শেয়ার বাজারে লসে আটকে থাকা টাকায় কি যাকাত দিতে হবে?","2980"],
["লেনদেন","ঋণ ফেরত না দিয়ে মৃত ব্যক্তিকে ঋণদাতা মাফ করলেও কি গুনাহ থাকে?","2981"],
["আক্বীদা","রূহ (আত্মা) কী? এটি কি পদার্থ, শক্তি নাকি ভিন্ন সৃষ্টি?","7112"],
["আক্বীদা","জন্মের ৫০ হাজার বছর আগে লেখা ভাগ্য কি মায়ের পেটে আবার লেখা হয়?","7113"],
["আক্বীদা","হিন্দু ধর্ম কি সবচেয়ে প্রাচীন ধর্ম? কোনো নবীর সম্পৃক্ততা আছে কি?","7114"],
["বিদআত ও রসম","রাতারাতি উঠে আসা মসজিদে মুরগি-ছাগল মানত করা যাবে কি?","7115"],
["আক্বীদা","আল্লাহ ‘হও’ বললেই হয়, তবে আসমান-যমীন ছয় দিনে সৃষ্টির হিকমত কী?","7116"],
["আক্বীদা","বিয়ে ও রিযিক কি লাওহে মাহফূযে লেখা আছে?","7117"],
["পবিত্রতা","মাসিক থেকে পবিত্র হওয়ার পর রাতে হালকা হলুদ দাগ দেখলে করণীয় কী?","7118"],
["ছালাত","ছালাতে সূরা পড়ার সময় আঊযু ও বিসমিল্লাহ পুরোটা বলতে হবে কি?","7119"],
["ছালাত","ঈদের খুৎবা শোনা কি ওয়াজিব?","7120"],
["ছালাত","মসজিদের সামনে দেয়ালের কাছে কবর থাকলে সেখানে ছালাত জায়েয কি?","7121"],
["ছালাত","ছালাতে শুধু একদিকে সালাম ফিরিয়ে শেষ করা যাবে কি?","7122"],
["ছালাত","গর্ভকালীন সময়ে বসে ইশারায় ছালাত আদায় করা যাবে কি?","7123"],
["ছালাত","মুকাব্বির মুছল্লী না হলে তার ইক্তিদায় ছালাত হবে কি?","7124"],
["ছালাত","জামাআতে মুছল্লী ভুল করলে (ইমাম রুকূতে, সে সিজদায়) করণীয় কী?","7125"],
["ছিয়াম","নফল ছিয়াম ইচ্ছাকৃত ভাঙলে গুনাহ নাকি কাযা-কাফফারা?","7126"],
["যাকাত ও দান","ব্যাংক ঋণ থাকা অবস্থায় এমপিওভুক্ত শিক্ষকের যাকাত ফরয হবে কি?","7127"],
["যাকাত ও দান","দানের নিয়্যতে রাখা টাকায় ইসলামী বই কিনে পড়া যাবে কি?","7128"],
["বিবিধ","বিশ্বকাপে দল সাপোর্ট, পতাকা, জার্সি ও মিছিল করা যাবে কি?","7129"],
["বিবিধ","দাঁতের ফাঁক বন্ধ বা লম্বা দাঁত কাটা কি সৃষ্টির পরিবর্তন?","7130"],
["লেনদেন","ওয়াকফকৃত মসজিদের উপরের তলা ফ্ল্যাট করে বিক্রি করা যাবে কি?","7131"],
["পরিবার","স্বামী হাত-পা মোজা পরতে বললে গরমে না পরলে কি পাপ হবে?","7132"],
["লেনদেন","বাস কাউন্টারের বাইরে কম ভাড়ায় ভ্রমণ করলে কি পাপ হবে?","7133"],
["লেনদেন","বিকাশ-নগদের রিওয়ার্ড পয়েন্ট ব্যবহার করা জায়েয কি?","7134"],
["বিবিধ","‘আলমগীর’ নাম রাখা কি জায়েয?","7135"],
["পরিবার","ভাতিজি ‘আব্বু’ ডাকতে ও জন্মনিবন্ধনে বাবার জায়গায় নাম দেওয়া যাবে কি?","7136"],
["বিবিধ","শিক্ষণীয় কাল্পনিক গল্প বাচ্চাদের বলা যাবে কি?","7137"],
["বিবিধ","মহিলা মাদ্রাসায় পুরুষ শিক্ষক পড়াতে পারবে কি?","7138"],
["খাদ্য","গরুর অণ্ডকোষ খাওয়া যাবে কি?","7139"],
["লেনদেন","ফেসবুক ‘গিভওয়ে’ আয়োজন ও অংশগ্রহণ শরীআতসম্মত কি?","7140"],
["লেনদেন","রুকইয়া করে অর্থ উপার্জন বা পেশা হিসেবে নেওয়া যাবে কি?","7141"],
["হাদীছ","ফযীলতের ক্ষেত্রে যঈফ হাদীছ কি গ্রহণযোগ্য?","7142"],
["আক্বীদা","জিনে আক্রান্ত নারী শিরকী তাবীয নিতে বাধ্য হলে করণীয় কী?","7143"],
["চিকিৎসা","পোষা বিড়ালকে নিউটার করানো কি জায়েয?","7144"],
["লেনদেন","ধান কিনে রেখে পরে দাম বাড়লে বিক্রি বা স্টক ব্যবসা করা যাবে কি?","7145"],
["লেনদেন","স্টুডেন্ট ভিসায় নির্ধারিত ঘণ্টার বেশি কাজের আয় কি হালাল?","7146"],
["লেনদেন","সেলুনে সুন্নাত পরিপন্থী চুল কাটা ও দাড়ি শেভের আয় কি হালাল?","7147"],
["লেনদেন","অনলাইন ট্রাভেল এজেন্সিতে টাকা জমা দিয়ে টিকিট বুকিংয়ের আয় হালাল কি?","7148"],
["পরিবার","বিয়ের দিন ঠিক হওয়ার পর ভালো পাত্র পেয়ে অন্যত্র বিয়ে দেওয়া শরীআতসম্মত কি?","7149"],
["পরিবার","তালাকে সন্দেহ থেকে ‘একটি হয়ে গেছে’ বললে কি তালাক হবে?","7150"],
["পরিবার","বাবা-মা ডিভোর্স হলে কার সাথে থাকব, কার কথা শুনব?","7151"],
["চিকিৎসা","দুগ্ধপোষ্য সন্তান থাকাকালীন নতুন গর্ভধারণের প্রাথমিক পর্যায়ে গর্ভপাত জায়েয কি?","7152"],
["পরিবার","খোলা তালাকের পর নতুন বিয়ে করলে পূর্বের দুই তালাক বহাল থাকবে কি?","7153"],
["পরিবার","দেনমোহর বাকি রেখে স্বামী মারা গেলে করণীয় কী?","7154"],
["উত্তরাধিকার","যৌথ কেনা জিনিস ও উপহার স্ত্রীর মৃত্যুর পর কীভাবে বণ্টন হবে?","7155"],
["পরিবার","গ্রামের মহিলাদের মাহফিলে মহিলারা অংশগ্রহণ করতে পারবে কি?","7156"],
["আক্বীদা","গায়রত কী? গায়রত কি অহংকারী করে তোলে?","7157"],
["বিদআত ও রসম","গরু-ছাগলের গর্ভফুল বের করতে পুঁইশাকের ডাল ঝুলানো যাবে কি?","7158"],
["বিবিধ","অপছন্দের লোকের সাথে হেসে কথা বললে কি মুনাফিক হব?","7159"],
["আক্বীদা","ইসলামে স্বপ্নের বাস্তবতা কী? সব স্বপ্নের কি ব্যাখ্যা আছে?","7160"],
["পরিবার","মা সন্তানকে অভিশাপ দিলে তার ক্ষতি থেকে বাঁচার উপায় কী?","7161"],
["হজ্জ","ঢাকা-দোহা-জেদ্দা রুটে উমরার মীক্বাত কোনটি, ইহরাম কখন বাঁধব?","6545"],
["হজ্জ","ইফরাদ, তামাত্তু ও কিরান—৭০ বছর বয়সীর জন্য কোনটি উত্তম?","6546"],
["হজ্জ","আড়াই বছরের বাচ্চার হজ্জ হবে কি? তাওয়াফ-সাঈ বাবা-মা করে দিতে পারবে?","6547"],
["হজ্জ","আবেগে সাতটির বেশি কংকর মারলে কি দম ওয়াজিব?","6548"],
["হজ্জ","১১, ১২, ১৩ তারিখ মিনায় রাত্রিযাপন কি ওয়াজিব?","6549"],
["হজ্জ","আরাফার দিনে আল্লাহ কাদের ক্ষমা করেন?","6550"],
["হজ্জ","হজ্জে গল্প-গুজব, সেলফি, ঘোরাফেরায় কি ছওয়াব কমে?","6551"],
["হজ্জ","ঘুষ দিয়ে ভিসা পেলে হজ্জের উপর কি প্রভাব পড়ে?","6552"],
["হজ্জ","বিদায়ী তাওয়াফ না করে মক্কা ছাড়লে হজ্জ হবে কি?","6553"],
["হজ্জ","হাসপাতালে ভর্তি থাকায় হজ্জ করতে না পারলে করণীয় কী?","6554"],
["হজ্জ","মীক্বাত অতিক্রম করে ইহরাম ছাড়া জেদ্দায় গেলে দম ওয়াজিব হবে কি?","6555"],
["হজ্জ","অসুস্থতা বা ভিড়ের কারণে কংকর নিক্ষেপে প্রতিনিধি নিয়োগ করা যাবে কি?","6556"],
["হজ্জ","কা‘বা চত্বরে নারী-পুরুষ পাশাপাশি ছালাত পড়লে ছালাত হবে কি?","6557"],
["হজ্জ","ইহরামে সুগন্ধিযুক্ত সাবান-শ্যাম্পু ব্যবহার করলে দম ওয়াজিব কি?","6558"],
["হজ্জ","তাওয়াফের মাঝে ওযূ ভেঙে গেলে (৫ চক্কর শেষে) করণীয় কী?","6559"],
["হজ্জ","সাঈ-এর গণনায় ভুল হলে কী করবে?","6560"],
["হজ্জ","আরাফার দিন কি বিশ্বব্যাপী এক, নাকি স্থানীয় চাঁদ অনুযায়ী?","6561"],
["হজ্জ","বর্তমান বাস্তবতায় হজ্জে কী কী কাজ করা উচিত নয়?","6562"],
["হজ্জ","পুরুষ-নারীর ইহরামের পোশাক কেমন হবে?","6563"],
["হজ্জ","হজ্জে অন্যায় করলে পাপ বেশি হয়—এর কোনো দলীল আছে কি?","6564"],
["হজ্জ","ওয়ার্ক ভিসাধারী সরকারি পারমিট ছাড়া হজ্জ করলে হজ্জ হবে কি?","6565"],
["হজ্জ","সামর্থ্য থাকার পরও হজ্জ না করলে ইসলাম কী বলে?","6566"],
["যাকাত ও দান","হজ্জের জন্য জমানো নিসাব পরিমাণ টাকায় প্রতিবছর যাকাত দিতে হবে কি?","6567"],
["লেনদেন","যমযমের পানি দেশে এনে বেশি দামে বিক্রি করা জায়েয কি?","6568"],
["হজ্জ","জমি বিক্রি করে হজ্জে যাওয়া যাবে কি, যদি সন্তানরা রাজি না হয়?","6569"],
["আক্বীদা","মক্কা-মদীনায় মৃত্যু কামনা করা জায়েয কি? এর ফযীলত আছে কি?","6570"],
["বিবিধ","হাঁসের ডিমে মুরগির তা দিয়ে বাচ্চা ফোটালে মা-বাচ্চার বিচ্ছেদ কি জায়েয?","6571"],
["কুরবানী","কোন কোন পশু কুরবানী করা যাবে, বয়স কত হতে হবে?","6572"],
["কুরবানী","কী পরিমাণ সম্পদে কুরবানী ওয়াজিব? স্ত্রীর স্বর্ণ কি ধরতে হবে?","6573"],
["হজ্জ","হজ্জের দুম্বার গোশত কি নিজে খাওয়া বা পরিবারের জন্য আনা যাবে?","6574"],
["কুরবানী","কুরবানী দাতা-অদাতা কি যিলহজ্জের চাঁদ দেখার পর নখ-চুল কাটতে পারবে?","6575"],
["কুরবানী","কুরবানীর চামড়ার টাকা কাদের দেওয়া যাবে? লেজকাটা পশু চলবে কি?","6576"],
["কুরবানী","ঈদের আগে অসুস্থ হলে সেই পশু দিয়ে কুরবানী করা যাবে কি?","6577"],
["কুরবানী","এক ব্যক্তির কয়েকটি পশু কুরবানী করার বিধান কী?","6578"],
["কুরবানী","অসচ্ছল প্রতিবেশীকে কুরবানীতে টাকা ও গোশত দেওয়া কি সঠিক?","6579"],
["কুরবানী","১১ বছরের ছেলের পক্ষ থেকে গরু কুরবানী করা যাবে কি?","6580"],
["কুরবানী","কুরবানীর পশু হারিয়ে আরেকটি কিনলে, পরে প্রথমটি পেলে করণীয় কী?","6581"],
["কুরবানী","তিন ভাই একসাথে খেলে একটি ছাগল কুরবানী দিলে কি সঠিক হবে?","6582"],
["কুরবানী","কুরবানীর গরু কেনার ব্যাপারে কী কী দেখে কিনব?","6583"],
["কুরবানী","বলদ গরু ও খাসি কুরবানী করা যাবে না—কথাটি কি সঠিক?","6584"],
["কুরবানী","শরিকানা গরুর গোশত ভাগের আগে নাকি পরে ফকীরকে দিতে হবে?","6585"],
["কুরবানী","একই গরুতে কুরবানী ও আকীকার নিয়্যত করা যাবে কি?","6586"],
["কুরবানী","সম্পূর্ণ কুরবানীর গোশত ফ্রিজে রেখে পরিবার খেলে কুরবানী হবে কি?","6587"],
["কুরবানী","গত ঈদের দুই দিন পর জন্মানো ছাগল কি এবার কুরবানী দেওয়া যাবে?","6588"],
["কুরবানী","বণ্টনের পর অবশিষ্ট কুরবানীর গোশত দাতারা নিতে পারবে কি?","6589"],
["কুরবানী","কয়েকটি গরু যবেহ করলে সব গরু থেকে গোশত দিতে হবে কি?","6590"],
["কুরবানী","আলাদা করে ঈদের ছালাত আগে পড়ে তাড়াতাড়ি কুরবানী করা ঠিক হবে কি?","6591"],
["আক্বীদা","দান-ছাদাকা কি ছালাত-ছিয়ামের ঘাটতি পূরণ করে?","6592"],
["আক্বীদা","সাত সংখ্যা নির্ধারণের (সাঈ, তাওয়াফ, আসমান ইত্যাদি) কোনো কারণ আছে কি?","6593"],
["ছালাত","ফরযের পর সুন্নাত পড়তে জায়গা পরিবর্তন করা কি সুন্নাত?","6594"],
["আক্বীদা","আল্লাহর সত্তা ও গুণ নিয়ে সন্দেহ (OCD) এলে করণীয় কী?","4676"],
["আক্বীদা","৭৩ দলের হাদীছে জান্নাতী দল কারা? অন্যরা কি চিরস্থায়ী জাহান্নামী?","4675"],
["আক্বীদা","জাল হাদীছ প্রচারকারী ও ঝাড়ফুঁককারী ইমামের পিছনে ছালাত জায়েয কি?","4677"],
["আক্বীদা","তাবীয খুললে জিনের আক্রমণ হয়—এ অবস্থায় রোগীর করণীয় কী?","4678"],
["আক্বীদা","হানাফী মাযহাবের কট্টর অনুসারীদের কীভাবে সুন্নাহর দিকে আহ্বান করব?","4679"],
["বিবিধ","মৃতকে তিন দিন পর্যন্ত বিলম্বে দাফন করা যায়—কথাটি কি সঠিক?","4680"],
["আক্বীদা","বান্দার হক্ব নষ্ট করে ক্ষমা চাওয়ার সুযোগ না থাকলে করণীয় কী?","4681"],
["আক্বীদা","গাড়ি-বাড়িতে বদনজর থেকে বাঁচার উপায় কী?","4682"],
["পবিত্রতা","রক্ত কি নাপাক? ছালাতে রক্ত বের হলে ওযূ ভাঙে কি?","4683"],
["ছালাত","৭৮ কিমি দূরে ১৫ দিনের বেশি থাকলে কছর করতে হবে কি?","4684"],
["যাকাত ও দান","এক ভরি সোনা নিসাব নয়, কিন্তু দামে সাড়ে বায়ান্ন ভরি রূপা কেনা যায়—যাকাত লাগবে কি?","4685"],
["যাকাত ও দান","‘জীবিত-মৃত সব মুসলিমের পক্ষ থেকে’ নিয়্যতে দান করা জায়েয কি?","4686"],
["ছিয়াম","শুধু বৃহস্পতিবার ছিয়াম রাখলে কি সাপ্তাহিক ছিয়াম গণ্য হবে?","4687"],
["লেনদেন","পণ্য বিক্রিতে আকর্ষণীয় মিথ্যা কথা বলা যাবে কি?","4688"],
["ছালাত","খুৎবার সময় যাচাইয়ের জন্য মোবাইল বা বই দেখা জায়েয কি?","4689"],
["খাদ্য","হালাল পশুর কাঁচা মাংস বা কাঁচা মাছ খাওয়া জায়েয কি?","4690"],
["বিবিধ","‘বস আপনাকে সালাম দিয়েছেন’ বলে ডেকে পাঠানো কি জায়েয?","4691"],
["যাকাত ও দান","মাইক দিয়ে রাস্তায় গাড়ি আটকে মসজিদ-মাদরাসার চাঁদা তোলা জায়েয কি?","4692"],
["লেনদেন","টেইলার পর্দাবিরোধী পোশাক বানালে কি গুনাহ হবে?","4693"],
["বিবিধ","ফেসবুক-ইউটিউবে আসা মেয়েদের বিজ্ঞাপন দেখতে হলে করণীয় কী?","4694"],
["বিবিধ","পুরুষ শিক্ষকের কাছে মহিলারা ক্লাস বা শিক্ষা অর্জন করতে পারবে কি?","4695"],
["পরিবার","বাবা-মা চাকরি চাইলে ব্যবসা বা কৃষি করা কি জায়েয?","4696"],
["লেনদেন","বিধর্মীদের ধর্মীয় অনুষ্ঠানে দোকান দেওয়া বা ভাড়া দেওয়া বৈধ কি?","4697"],
["লেনদেন","এককালীন পেমেন্টে ফেরতহীন স্বাস্থ্যবীমা কি শরীআতসম্মত?","4698"],
["বিবিধ","দায়িত্বশীলদের পাপাচার বা সহকর্মীর গাফিলতি জানালে কি গীবত হবে?","4699"],
["বিবিধ","খেলা দেখা কি হারাম? ভর্তি পরীক্ষার জন্য খেলার খবর পড়া যাবে কি?","4700"],
["লেনদেন","অনলাইন ট্রাভেল এজেন্সিতে রিচার্জ করে বুকিং কমিশন নেওয়া হালাল কি?","4701"],
["লেনদেন","ধান লাগানোর আগে কম দামে অগ্রিম ধান কেনা কি সূদী কারবার?","4702"],
["লেনদেন","হারাম উপার্জনকারীর হাদিয়া বা দাওয়াত গ্রহণের বিধান কী?","4703"],
["লেনদেন","ভেরিফায়েড সোশ্যাল মিডিয়া অ্যাকাউন্ট তৈরি করে বিক্রির আয় হালাল কি?","4704"],
["লেনদেন","ফ্রি-ফায়ার, পাবজি খেলা ও টুর্নামেন্টে উপার্জন বা গ্রাফিক্স কাজের বিধান কী?","4705"],
["পরিবার","সন্তানকে আলেম বানাতে ৪-৫ বছর বয়স থেকে কীভাবে শুরু করব?","4706"],
["পরিবার","পড়াশোনা শেষ না করলে বাবা-মা কষ্ট পেলে কি গুনাহ হবে?","4707"],
["উত্তরাধিকার","পিতার মৃত্যুতে নাতি-নাতনি দাদার সম্পত্তি পায় না—এর হিকমত কী?","4708"],
["বিবিধ","স্ত্রীর বান্ধবীর বাবা-মাকে ‘আব্বু-আম্মু’ বলা যাবে কি?","4709"],
["পরিবার","প্রবাসে থাকায় স্ত্রীর হক্ব নষ্ট হলে করণীয় কী?","4710"],
["পরিবার","প্রবাসী স্বামী সবটাই শ্বশুরবাড়িতে ব্যয় করলে স্ত্রীর করণীয় কী?","4711"],
["পরিবার","অসুস্থ শ্বশুরের ইস্তিঞ্জা পরিষ্কার করতে বাধ্য পুত্রবধূর বিধান কী?","4712"],
["বিবিধ","সন্তান গর্ভে আসার খবর অন্যকে জানানো শরীআতসম্মত কি?","4713"],
["পরিবার","অভিভাবক ছাড়া বিয়ে করা নারীর বিয়ের হুকুম কী?","4714"],
["বিবিধ","নারীর চুল কাটা বা ছাড়ার নিয়ম কী?","4715"],
["বিবিধ","লুজ ফিটিং রঙিন পোশাকে কি পর্দা আদায় হবে?","4716"],
["বিদআত ও রসম","আকীকার গোশত বণ্টন না করে দাওয়াত দিয়ে অনুষ্ঠান করা কি ঠিক?","4717"],
["আক্বীদা","বিপদ থেকে মুক্তির আমল ও দু‘আ কী কী?","4718"],
["আক্বীদা","কসম করে পাপ ত্যাগের পর আবার করলে তওবা কীভাবে কবুল হবে?","4719"],
["আক্বীদা","জ্ঞান বৃদ্ধির কোনো উপায় বা দু‘আ আছে কি?","4720"],
["আক্বীদা","‘মাকামে মাহমূদ’ কি স্থান নাকি মর্যাদা?","4721"],
["লেনদেন","ব্যবহারহীন ডেবিট কার্ড রাখলে কি গুনাহ হবে?","4722"],
["বিবিধ","এভারেস্টের মতো ঝুঁকিপূর্ণ জায়গা জয় করতে গিয়ে মারা গেলে কি আত্মহত্যা?","4723"],
["যাকাত ও দান","করযে হাসানা কাদের দেওয়া উচিত?","4724"],
["আক্বীদা","প্রবাসে মারা গেলে লাশ আসতে দেরি হলে কবরের সওয়াল-জওয়াব কখন শুরু?","1976"],
["যাকাত ও দান","বিদআতী প্রতিষ্ঠানে দান করা যাবে কি?","1977"],
["হাদীছ","খাদীজা (রা.)-এর কবরের জবাব আল্লাহ নিজে দিয়েছেন—ঘটনাটি কি সত্য?","1978"],
["বিবিধ","ছোটবেলার ছবি ঘরে অ্যালবামে লুকিয়ে রাখা যাবে কি?","1979"],
["বিবিধ","নওমুসলিমের জন্য খাতনা করা কি জরুরী?","1980"],
["ছালাত","মসজিদের প্রাচীরের ভিতরে আলেমকে দাফন করলে সে মসজিদে ছালাত হবে কি?","1981"],
["আক্বীদা","পশু-পাখি মারা গেলে বালা-মুছীবত কেটে যায়—কথাটি কি সঠিক?","1982"],
["বিদআত ও রসম","ফরযের পর আয়াতুল কুরসী পড়ে বুকে ফুঁক দেওয়া শরীআতসম্মত কি?","1983"],
["পবিত্রতা","ওযূর পর ছালাতে দাঁড়ালে সাদাস্রাব হলে করণীয় কী?","1984"],
["ছালাত","সুস্থ অবস্থায় বসে নফল ছালাত আদায় করা কি সঠিক?","1985"],
["ছালাত","কাযা ছালাতের পরেও কি আয়াতুল কুরসী পড়া যাবে?","1986"],
["ছালাত","জামাআতে শেষ বৈঠকে সালাম না ফিরিয়ে চলে গেলে কীভাবে পূর্ণ করবে?","1987"],
["ছালাত","ফরয ছালাত চলাকালীন সুন্নাত পড়া যাবে কি?","1988"],
["হাদীছ","জুমআয় প্রথম আগমনকারী মুয়াযযিন কি বেতনভুক্ত হওয়ায় ছওয়াব পাবে না?","1989"],
["ছালাত","একটি না দুটি সিজদা হয়েছে সন্দেহ হলে করণীয় কী?","1990"],
["ছালাত","ইমাম একটি সিজদা ভুলে সাহু সিজদা ছাড়া সালাম ফিরালে করণীয় কী?","1991"],
["ছালাত","রঙিন জায়নামাযে ছালাত আদায় করা যাবে কি?","1992"],
["ছালাত","প্রাণীর ছবিযুক্ত পোশাক পরে ছালাত আদায় করা যাবে কি?","1993"],
["ছালাত","রাসূল (ﷺ)-এর উপর কি তাহাজ্জুদ ফরয ছিল?","1994"],
["ছালাত","বিতর ছালাত ছুটে গেলে কি কাযা করা যাবে?","1995"],
["ছালাত","বাবা সঠিক পদ্ধতিতে ছালাত না পড়লে সন্তানের করণীয় কী?","1996"],
["ছালাত","পর্দা লঙ্ঘনকারী ইমামের পিছনে ছালাত আদায়ের বিধান কী?","1997"],
["ছালাত","শেষ বৈঠকে তাশাহহুদ পড়ার পর ভুলে দাঁড়িয়ে গেলে করণীয় কী?","1998"],
["ছালাত","মহিলারা পর্দা দিয়ে মসজিদের একাংশে তারাবীহ পড়তে পারবে কি?","1999"],
["ছালাত","তাহাজ্জুদ ছালাতের সঠিক সময় কখন?","2000"],
["বিবিধ","মৃত্যুর সংবাদ মাইকিং করে জানানো যাবে কি?","2001"],
["যাকাত ও দান","ঋণগ্রস্ত বাবাকে ফসলের উশর দেওয়া যাবে কি?","2002"],
["পরিবার","পিতা মারা গেলে ও চাচারা থাকলে মায়ের দ্বিতীয় স্বামী মেয়ের অলী হতে পারে কি?","2003"],
["বিদআত ও রসম","ছবি, ভিডিও, গান ও মিশ্র আপ্যায়নের বিয়েতে দাওয়াত খাওয়া যাবে কি?","2004"],
["চিকিৎসা","বিয়ের আগে ছেলে-মেয়ের রক্ত পরীক্ষা করা কি বৈধ?","2005"],
["বিদআত ও রসম","মেয়ে দেখতে গিয়ে তাকে টাকা দেওয়া বৈধ কি?","2006"],
["পরিবার","ব্যভিচারে গর্ভবতী নারীকে সেই পুরুষ বিয়ে করলে বিয়ে ও সন্তানের হুকুম কী?","2007"],
["পরিবার","পিতার অনুমতি ছাড়া হওয়া বিয়ে পরে মেনে নিলে কি বৈধ?","2008"],
["পরিবার","ছোট বোনের দুধ মায়ের সাথে দেখা করা যাবে কি?","2009"],
["পরিবার","আসবাবপত্র কিনে দিয়ে কি মোহরানা পরিশোধ হবে?","2010"],
["পরিবার","শ্যালিকা বিয়ে হারাম হলেও মাহরাম নয় কেন?","2011"],
["পরিবার","মনে মনে তালাক দিলে কি স্ত্রী তালাক হবে?","2012"],
["লেনদেন","পান চাষাবাদ ও ব্যবসা করা হালাল কি?","2013"],
["বিবিধ","অল্প বয়সে চুল সাদা হলে কালো কলপ লাগানো যাবে কি?","2014"],
["লেনদেন","গর্ভের সন্তান নষ্টের ঔষধ বিক্রি করা জায়েয কি?","2015"],
["লেনদেন","মসজিদের টাকা চুরি করলে করণীয় কী?","2016"],
["লেনদেন","কোম্পানির কালীপূজার বোনাস গ্রহণ করা যাবে কি?","2017"],
["বিবিধ","ক্লাসে বাধ্যতামূলক ছবি আঁকতে হলে ছাত্র-ছাত্রীদের করণীয় কী?","2018"],
["বিবিধ","পরীক্ষার হলে অন্যের খাতা দেখে লেখা সম্পর্কে ইসলাম কী বলে?","2019"],
["লেনদেন","ভবিষ্যতের জন্য সেভিংস অ্যাকাউন্টে টাকা জমা করা যাবে কি?","2021"],
["বিবিধ","এনআইডি-র জন্য নারীদের কপালের চুল ও কান বের করতে হলে করণীয় কী?","2020"],
["লেনদেন","ব্যবসার মালের জন্য সূদি ব্যাংক ঋণ ছাড়া উপায় না থাকলে করণীয় কী?","2022"],
["লেনদেন","ছেলে-মেয়ের আলাদা ব্যবস্থায় গার্মেন্টসে কাজ করা যাবে কি?","2023"],
["বিবিধ","মৃত ব্যক্তির ভিডিও বা অডিও লেকচার শোনা যাবে কি?","2024"],
["হাদীছ","বরই পাতার রস খেলে এলার্জি ভালো হয়—নবী (ﷺ)-এর কথা কি সঠিক?","2025"],
["আক্বীদা","ঈমান আনলেই যদি জান্নাত, তবে আমলের প্রয়োজন কী?","390"],
["আক্বীদা","মুতআ বিবাহকে হালাল মনে করলে কি মুসলিম থাকবে?","391"],
["আক্বীদা","গণক ও জ্যোতিষীদের বই পড়া জায়েয কি?","392"],
["আক্বীদা","মিরাজের রাতে নবী (ﷺ) কি আল্লাহকে স্বচক্ষে দেখেছিলেন?","393"],
["ছালাত","মসজিদের এরিয়ায় কবর থাকলে ছালাত শুদ্ধ হবে কি?","394"],
["আক্বীদা","রাশিচক্রের মাধ্যমে ভবিষ্যৎ জানা যায়—এর কোনো প্রভাব আছে কি?","395"],
["আক্বীদা","যারা তাক্বদীর অস্বীকার করে তাদের বিধান কী?","396"],
["ছালাত","ইমাম আমীন বলার পরও ফাতিহা শেষ না হলে মুক্তাদী কী করবে?","397"],
["ছালাত","একাকী জাহরী ছালাতে সশব্দে কিরাআত না পড়লে ছালাত হবে কি?","398"],
["ছালাত","সফরে কছর কি ফরয? ইচ্ছাকৃত না করলে গুনাহ হবে কি?","399"],
["ছালাত","অসুস্থ ব্যক্তি বাড়িতে ছালাত জমা ও কছর করতে পারবে কি?","400"],
["ছালাত","পা ভাঁজ করে বসতে না পারলে কীভাবে ছালাত আদায় করবে? চেয়ারে বসা যাবে?","401"],
["ছালাত","ঈদের ছালাতের আগে বক্তব্য দেওয়া যাবে কি?","402"],
["ছালাত","একই ইমাম ঈদের জামাআতে একাধিকবার ইমামতি করতে পারে কি?","404"],
["ছালাত","মহিলারা পৃথকভাবে ঈদের জামাআত করতে পারবে কি?","405"],
["বিবিধ","ছোট শিশু মারা গেলে কি গোসল করাতে হবে?","407"],
["যাকাত ও দান","গোপনে দান করার বিশেষ ফযীলত আছে কি?","408"],
["যাকাত ও দান","শিশু ও পাগলের সম্পদে কি যাকাত ওয়াজিব?","409"],
["যাকাত ও দান","যাকাতের টাকা দিয়ে মসজিদ নির্মাণে সহযোগিতা করা যাবে কি?","410"],
["ছিয়াম","রামাযানের কাযার আগে শাওয়ালের ছয় ছিয়াম রাখা যাবে কি?","411"],
["ছিয়াম","ই‘তিকাফে বসার সময় শুরু হয় কখন?","412"],
["ছিয়াম","সফরে ছিয়াম রাখা ভালো নাকি ছেড়ে দেওয়া?","413"],
["হজ্জ","কৃষিনির্ভর পাঁচ বিঘা জমির মালিকের জন্য কি হজ্জ আবশ্যক?","414"],
["হাদীছ","হজ্জ-উমরায় অভাব দূর ও পাপ মাফ হয়—বক্তব্যটি কি হাদীছসম্মত?","415"],
["পরিবার","বিবাহের জন্য মেয়ের কোন কোন অঙ্গ দেখা বৈধ?","416"],
["পরিবার","জোর করে মেয়েকে বিয়ে দিতে চাইলে শরীআতের বিধান কী?","417"],
["পরিবার","দেখা-সাক্ষাতের আগে তালাক দিলে স্ত্রী কি মোহর পাবে?","418"],
["পরিবার","স্বামী দ্বিতীয় বিয়ে করলে প্রথম স্ত্রীর তালাক চাওয়া বৈধ কি?","419"],
["পরিবার","তালাকের পর স্বামী মারা গেলে স্ত্রীর ইদ্দত ও ওয়ারিছ হওয়ার বিধান কী?","420"],
["পরিবার","ইদ্দত পালনকারী নারীকে বিয়ের প্রস্তাব দেওয়া যায় কি?","421"],
["পরিবার","স্ত্রী খেয়াল-খুশিমতো চললে স্বামী কি তালাক দিতে পারে?","422"],
["পরিবার","চাপে পড়ে বিয়ে করলে বিয়ে কি জায়েয? তালাক কীভাবে দেব?","423"],
["লেনদেন","নকল সার্টিফিকেট বানিয়ে চাকরি নেওয়া যাবে কি?","424"],
["বিবিধ","পুরোনো কবরস্থানে মাটি ভরাট করে আবার দাফন করা যাবে কি?","425"],
["উত্তরাধিকার","বাবার জমি বিক্রি করে বিদেশ যাওয়া ভাইয়ের কাছে অন্যদের দাবির বিধান কী?","426"],
["যাকাত ও দান","ব্যাংকের সূদের টাকা মাদরাসায় দান করা যাবে কি?","427"],
["লেনদেন","হারাম মাল দিয়ে মসজিদ বানানো জায়েয কি?","428"],
["লেনদেন","চুক্তি ছাড়া ঋণ পরিশোধে অতিরিক্ত কিছু দিলে তা কি সূদ?","429"],
["বিবিধ","শ্বশুর-শাশুড়িকে আব্বা-আম্মা বলে ডাকা যাবে কি?","430"],
["বিবিধ","এশার পর ঘুমানোর হাদীছ থাকলে রাত জেগে পড়াশোনা কি নিষেধ?","431"],
["বিবিধ","ঈদের দিনে কবর যিয়ারত করা যাবে কি?","432"],
["বিবিধ","‘হাজী’ না বললে মন খারাপ—ছালাত আদায়কারীকে ‘মুছল্লী’ বলা যাবে কি?","433"],
["পরিবার","কতদূর সফরে নারীর মাহরাম প্রয়োজন?","434"],
["লেনদেন","প্রতিষ্ঠানের হিসাবরক্ষক হিসেবে চাকরি করলে কি পাপ হবে?","435"],
["লেনদেন","পান চাষ করে জীবিকা নির্বাহ করা কি হালাল?","436"],
["লেনদেন","ট্যাক্স ফাঁকি দিয়ে বিদেশ থেকে মোবাইল এনে বিক্রি হালাল কি?","437"],
["পরিবার","ছেলের স্ত্রীর সাথে ব্যভিচারে লিপ্ত ব্যক্তি ও নারীর বিধান কী?","438"],
["উত্তরাধিকার","তালাকপ্রাপ্তা মা মারা গেলে আগের স্বামীর সন্তানরা কি মীরাছ পাবে?","439"],
["উত্তরাধিকার","শুধু দুই মেয়ে থাকলে সব সম্পদ মেয়েদের নামে লিখে দেওয়া যাবে কি?","440"],
["আক্বীদা","দু‘আ করলে ফেরেশতারা দু‘আকারীর জন্য দু‘আ করেন—ছহীহ হাদীছ আছে কি?","441"]
].map(x=>[x[0],x[1],AI+x[2]]);

/* পূর্ণ সূচির chunk ফাইল — শুধু সংশ্লিষ্ট পেজে, প্রয়োজন হলে লোড হয় */
const QUESTION_PARTS=[
 {category:"Response to Anti-Islam",src:"questions-catalog-part-00.js",count:327},
 {category:"From Muslims · প্রশ্নোত্তর",src:"questions-catalog-part-01.js",count:227},
 {category:"From Muslims · প্রবন্ধ",src:"questions-catalog-part-02.js",count:357}
];
const FATWA_PARTS=[
 {category:"আত-তাহরীক",src:"fatwa-catalog-part-00.js",count:7996},
 {category:"আল-ইতিছাম",src:"fatwa-catalog-part-01.js",count:4641},
 {category:"আত-তাহরীক · প্রবন্ধ",src:"fatwa-catalog-part-02.js",count:3599},
 {category:"আল-ইতিছাম · প্রবন্ধ",src:"fatwa-catalog-part-03.js",count:2252},
 {category:"আল-ইতিছাম · অতিরিক্ত প্রশ্নোত্তর",src:"fatwa-catalog-part-04.js",count:143}
];
setupLibrary({id:"q",deep:PAGE==="qa",eager:true,rows:QS,manifest:PAGE==="qa"?QUESTION_PARTS:[],partsKey:"DAWAH_QUESTIONS_PARTS",label:"পূর্ণ সূচি",loadingText:"পূর্ণ প্রশ্নোত্তর সূচি লোড হচ্ছে…"});
setupLibrary({id:"f",deep:PAGE==="fatwa",rows:FT,manifest:PAGE==="fatwa"?FATWA_PARTS:[],partsKey:"DAWAH_FATWAS_PARTS",label:"পূর্ণ ফতোয়া ও প্রবন্ধ সূচি",loadingText:"ফতোয়া ও প্রবন্ধ সূচি লোড হচ্ছে…"});

/* ===== প্রশ্ন পাঠানো =====
   ফর্মে একটিই বোতাম: "প্রশ্ন পাঠান"। নাম, যোগাযোগ (ইমেইল অথবা ফোন — যেকোনো একটি), ধর্মীয় পরিচয় ও প্রশ্ন আবশ্যক।
   ১) ASK_ACTION দিলে প্রশ্ন সেই ঠিকানায় (এখন FormSubmit) সরাসরি জমা হয়।
   ২) সাইট Netlify-তে থাকলে Netlify Forms-এ (`question` ফর্ম) জমা হয়।
   ৩) সরাসরি জমা না হলে (বা জমার কোনো পথ না থাকলে) তখনই WhatsApp ও Messenger-এর বোতাম দেখা দেয়; প্রশ্নটি লেখা অবস্থায় চ্যাট খোলে।
   WhatsApp/Messenger-এ ভিজিটর Send চাপলে তবেই প্রশ্ন পৌঁছায়। */
{const btn=$("askbtn"),wa=$("askwa"),aq=$("aq"),msg=$("askm"),how=$("askhow");
 if(btn&&aq&&msg){
  const field=id=>($(id)?.value||"").trim();
  /* Netlify Forms শুধু Netlify-তে চলে; GitHub Pages বা নিজস্ব ডোমেইনে সরাসরি জমার জন্য ASK_ACTION লাগে */
  const netlifyHost=/(^|\.)netlify\.app$/i.test(location.hostname);
  const directPossible=Boolean(ASK_ACTION)||netlifyHost;
  if(!directPossible&&how)how.textContent="«প্রশ্ন পাঠান» চাপলে WhatsApp ও Messenger-এর বোতাম আসবে; যেকোনো একটিতে আপনার প্রশ্ন লেখা অবস্থায় চ্যাট খুলবে, সেখানে Send চাপলেই প্রশ্নটি আমাদের কাছে পৌঁছাবে।";

  const copyText=text=>{let ok=false;
   try{const ta=document.createElement("textarea");ta.value=text;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,text.length);ok=document.execCommand("copy");ta.remove()}catch(e){}
   try{navigator.clipboard?.writeText(text).catch(()=>{})}catch(e){}
   return ok};
  /* লিংকে খুব লম্বা লেখা দেওয়া যায় না; পুরো প্রশ্ন clipboard-এ থাকে, তাই প্রয়োজনে Paste করা যায় */
  const clip=text=>text.length>700?text.slice(0,700)+"…":text;
  const CHAT={
   whatsapp:{name:"WhatsApp",cls:"ask-whatsapp",url:text=>LINKS.whatsapp+"?text="+encodeURIComponent(clip(text))},
   messenger:{name:"Messenger",cls:"ask-messenger",url:text=>MESSENGER+"?text="+encodeURIComponent(clip(text))}
  };

  /* সরাসরি জমা না হলে দেখানো হয়: WhatsApp ও Messenger — দুটি বোতাম (প্রশ্ন লেখা অবস্থায় চ্যাট খোলে) এবং "আবার কপি" */
  const chatOptions=(text,lead)=>{
   const copied=copyText(text),p=document.createElement("span");
   p.textContent=lead+"নিচের WhatsApp বা Messenger বোতামে চাপুন — আপনার প্রশ্ন লেখা অবস্থায় চ্যাট খুলবে, সেখানে Send চাপলেই প্রশ্নটি আমাদের কাছে পৌঁছাবে।"+(copied?" প্রশ্নটি কপিও করা আছে; বার্তা ফাঁকা বা অসম্পূর্ণ দেখালে Paste করুন।":"");
   const actions=Object.assign(document.createElement("span"),{className:"ask-actions"});
   for(const kind of ["whatsapp","messenger"]){const app=CHAT[kind];
    actions.append(Object.assign(document.createElement("a"),{href:app.url(text),target:"_blank",rel:"noopener noreferrer",className:app.cls,textContent:app.name+"-এ পাঠান ↗"}))}
   const again=Object.assign(document.createElement("button"),{type:"button",className:"ask-copy",textContent:"প্রশ্ন আবার কপি করুন"});
   again.addEventListener("click",()=>{copyText(text);again.textContent="কপি হয়েছে ✓"});
   actions.append(again);
   msg.replaceChildren(p,actions);
  };

  /* ফর্ম যাচাই করে বার্তা তৈরি করে; সমস্যা থাকলে null */
  /* কোনো ঘরে সমস্যা থাকলে বার্তা দেখিয়ে সেই ঘরে নিয়ে যায়; ঘরটি ঠিক করা শুরু করলে বার্তা মুছে যায় */
  const warn=(el,text)=>{msg.textContent=text;if(el){msg.dataset.for=el.id;el.setAttribute("aria-invalid","true");el.focus()}return null};
  for(const id of ["an","ac","ar","aq"]){const el=$(id);if(el)for(const ev of ["input","change"])el.addEventListener(ev,()=>{el.removeAttribute("aria-invalid");if(msg.dataset.for===id){msg.textContent="";delete msg.dataset.for}})}
  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  /* ফোন নম্বর: বাংলা বা ইংরেজি অঙ্ক, শুরুতে + চলতে পারে, মাঝের ফাঁকা/হাইফেন/বন্ধনী বাদ দিয়ে ৮–১৫ অঙ্ক; ঠিক থাকলে ইংরেজি অঙ্কে ফেরত দেয় */
  const phoneOf=v=>{const d=v.replace(/[০-৯]/g,ch=>String(ch.charCodeAt(0)-0x09e6)).replace(/[\s().-]/g,"");return /^\+?\d{8,15}$/.test(d)?d:""};
  const compose=()=>{
   const q=aq.value.trim(),nameEl=$("an"),conEl=$("ac"),rel=$("ar");
   delete msg.dataset.for;
   /* আবশ্যক ঘর (ফর্মের ক্রমে): নাম → ইমেইল অথবা ফোন → ধর্মীয় পরিচয় → প্রশ্ন (পুরনো HTML-এ কোনো ঘর না থাকলে সেই শর্ত খাটে না) */
   if(nameEl&&field("an").length<2)return warn(nameEl,"অনুগ্রহ করে আপনার নাম লিখুন।");
   let contact=field("ac");
   if(conEl){
    if(!contact)return warn(conEl,"অনুগ্রহ করে আপনার ইমেইল অথবা ফোন নম্বর দিন (যেকোনো একটি)।");
    if(!EMAIL_RE.test(contact)){const ph=phoneOf(contact);if(!ph)return warn(conEl,"ইমেইল ঠিকানা বা ফোন নম্বরটি ঠিক নেই — আবার দেখে লিখুন।");contact=ph}}
   if(rel&&!rel.value)return warn(rel,"অনুগ্রহ করে আপনার ধর্মীয় পরিচয় বেছে নিন।");
   if(q.length<5)return warn(aq,"অনুগ্রহ করে আপনার প্রশ্ন লিখুন।");
   if(field("abot")){msg.textContent="ধন্যবাদ!";return null} /* honeypot: বট হলে কিছু পাঠানো হয় না */
   const data={name:field("an"),contact,topic:field("at"),religion:field("ar"),question:q};
   const lines=["আসসালামু আলাইকুম। DAWAH X ওয়েবসাইট থেকে একটি প্রশ্ন:","বিষয়: "+data.topic];
   if(data.religion)lines.push("ধর্মীয় পরিচয়: "+data.religion);
   if(data.name)lines.push("নাম: "+data.name);
   if(data.contact)lines.push("যোগাযোগ: "+data.contact);
   lines.push("","প্রশ্ন: "+q);
   return {data,text:lines.join("\n")};
  };

  /* খসড়া: পাঠক মিলে-যাওয়া লেখা পড়তে গিয়ে ফিরে এলে ফর্মে লেখা যেন না হারায় (শুধু এই ট্যাবে, sessionStorage) */
  const DRAFT="dawahx-ask-draft",draftIds=["an","ac","at","ar","aq"];
  const saveDraft=()=>{try{const d={};for(const id of draftIds){const el=$(id);if(el)d[id]=el.value}sessionStorage.setItem(DRAFT,JSON.stringify(d))}catch(e){}};
  try{const d=JSON.parse(sessionStorage.getItem(DRAFT)||"null");if(d)for(const id of draftIds){const el=$(id);if(el&&typeof d[id]==="string"){el.value=d[id];if(el.value!==d[id]&&el.options)el.selectedIndex=0}}}catch(e){}
  for(const id of draftIds)$(id)?.addEventListener("input",saveDraft);

  /* প্রশ্ন লেখার সময়ই সাইটে থাকা মিলে-যাওয়া লেখা ও ভিডিও দেখানো (SUGGEST) — লেখা নতুন ট্যাবে খোলে, ভিডিও এই পাতাতেই চলে */
  const sug=$("asksug");let sugSeq=0,sugTimer=0,sugFor=null;
  const showSuggestions=async()=>{if(!sug)return;const q=aq.value.trim();if(q===sugFor)return;sugFor=q;const my=++sugSeq;
   const clear=()=>{sug.hidden=true;sug.replaceChildren()};
   if(q.length<6){clear();return}
   const r=await SUGGEST.find(q);if(my!==sugSeq)return;
   if(!r){clear();return}
   const draw=videos=>{if(!r.texts.length&&!videos.length){clear();return}
   const vids=videos.map(v=>`<button type="button" class="ask-vid" data-video-id="${escAttr(v.id)}" data-video-title="${escAttr(v.title)}" aria-label="${escAttr(v.title)} — ভিডিওটি এই পেজে চালান"><span class="ask-vid-thumb"><img alt="" loading="lazy" decoding="async" src="https://i.ytimg.com/vi/${escAttr(v.id)}/mqdefault.jpg"><i aria-hidden="true"></i></span><span class="ask-vid-info"><small>ভিডিও${v.channel?" · "+escHTML(v.channel):""}</small><b>${escHTML(v.title)}</b><em>এখানেই দেখুন ›</em></span></button>`).join("");
   const texts=r.texts.map(x=>`<a class="qcard qcard-own" href="read.html?k=${x.k}&from=${x.side}" target="_blank" rel="noopener"><small>${escHTML(!x.cat?(x.side==="f"?"ফতোয়া":"প্রশ্নোত্তর"):x.side==="f"&&!x.cat.includes("প্রবন্ধ")?"ফতোয়া · "+x.cat:x.cat)}</small><b>${escHTML(x.title)}</b><span>এখানেই পড়ুন ›</span></a>`).join("");
   sug.innerHTML=`<p class="ask-sug-head"><b>আপনার প্রশ্নের সাথে মিল আছে — এগুলো সাইটেই আছে</b><span>পাঠানোর আগে একবার দেখে নিন; উত্তর পেয়ে গেলে অপেক্ষা করতে হবে না। না পেলে নিচের বোতামে প্রশ্নটি পাঠিয়ে দিন।</span></p>${vids?`<div class="ask-sug-videos">${vids}</div>`:""}${texts?`<div class="ask-sug-list">${texts}</div>`:""}`;
   sug.hidden=false};
   draw([]);const videos=await r.videos;if(my===sugSeq&&videos.length)draw(videos)};
  if(sug){aq.addEventListener("input",()=>{clearTimeout(sugTimer);sugTimer=setTimeout(showSuggestions,600)});if(aq.value.trim().length>=6)showSuggestions()}

  /* পুরনো (ক্যাশে থাকা) ask.html-এ WhatsApp বোতাম থাকলে সেটিও কাজ করে; নতুন পাতায় বোতামটি নেই */
  if(wa)wa.addEventListener("click",()=>{const m=compose();if(m){chatOptions(m.text,"");try{window.open(CHAT.whatsapp.url(m.text),"_blank","noopener")}catch(e){}}});

  btn.addEventListener("click",async()=>{
   const m=compose();if(!m)return;
   const {data,text}=m;
   if(!directPossible){chatOptions(text,"");return}
   btn.disabled=true;msg.textContent="পাঠানো হচ্ছে...";
   try{
    let ok=false;
    if(ASK_ACTION){
     /* FormSubmit: ফাঁকা ঘর বাদ; _subject = ইমেইলের শিরোনাম; _captcha:"false" = কোনো reCAPTCHA নয়; _template:"table" = ইমেইলে ঘরগুলো ছকে;
        যোগাযোগের ঘরে ইমেইল থাকলে email ও _replyto হিসেবেও যায় (তখন ইমেইলে Reply চাপলেই উত্তর দেওয়া যায়)।
        উত্তরে success "true" না এলে (যেমন ফর্ম এখনো সক্রিয় করা হয়নি) জমা হয়নি ধরে Messenger/WhatsApp-এর পথ দেখানো হয় */
     const out={};for(const k in data)if(data[k])out[k]=data[k];
     out._subject="DAWAH X — নতুন প্রশ্ন ("+data.topic+")";out._captcha="false";out._template="table";
     if(EMAIL_RE.test(data.contact)){out.email=data.contact;out._replyto=data.contact}
     const ctl=typeof AbortController==="function"?new AbortController():null,timer=ctl?setTimeout(()=>ctl.abort(),20000):0;
     try{const r=await fetch(ASK_ACTION,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(out),signal:ctl?ctl.signal:undefined});
      let j=null;try{j=await r.json()}catch(e){}
      /* FormSubmit সফল হলে {"success":"true"} দেয়; অন্য কিছু এলে (ত্রুটির পাতা, "needs Activation") জমা হয়নি ধরা হয়, যাতে প্রশ্ন নীরবে হারিয়ে না যায় */
      ok=r.ok&&(/formsubmit\.co/i.test(ASK_ACTION)?Boolean(j)&&String(j.success)==="true":!(j&&typeof j==="object"&&"success" in j&&String(j.success)!=="true"))}
     finally{clearTimeout(timer)}}
    else{const body=new URLSearchParams({"form-name":"question",...data,"bot-field":""});
     const r=await fetch("__forms.html",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:body.toString()});
     ok=r.ok&&/netlify/i.test(r.headers.get("server")||"")} /* Netlify ছাড়া অন্য হোস্টে ফর্ম জমা হয় না */
    if(!ok)throw new Error("not delivered");
    msg.textContent="ধন্যবাদ! আপনার প্রশ্ন আমাদের কাছে পৌঁছেছে। ইন শা আল্লাহ শীঘ্রই উত্তর দেওয়া হবে।";aq.value="";saveDraft();showSuggestions();
   }catch(e){
    chatOptions(text,"সরাসরি জমা দেওয়া যায়নি। ");
   }
   btn.disabled=false;
  });
 }}

/* ---- অফলাইন: আগে খোলা পাতা ও পড়া লেখা ইন্টারনেট ছাড়াও খোলে (sw.js) ---- */
if(navigator.serviceWorker&&(location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1")){
 window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{})});
}
