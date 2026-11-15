/* DAWAH X — লাইব্রেরির লেখা আমদানি (GitHub Actions-এ চলে; দেখুন .github/workflows/import-texts.yml)
   প্রকাশকের অনুমতি সাপেক্ষে উৎস সাইট থেকে লেখা এনে texts/<bucket>.json-এ রাখে। প্রতিটি লেখার সাথে উৎসের ঠিকানা থাকে।
   নিয়ন্ত্রণ: tools/import-request.json  {"set":"builtin"|"all","hosts":["ai","ra","at","ia"],"limits":{"at":100},"minutes":300}  (আগে আনা লেখা আবার আনা হয় না) */
const fs=require('fs'),path=require('path'),cheerio=require('cheerio');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'texts');
const REQ=JSON.parse(fs.readFileSync(path.join(__dirname,'import-request.json'),'utf8'));
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* app.js-এর textKey()-এর সাথে হুবহু এক হতে হবে */
const keyOfUrl=u=>{try{u=decodeURI(u)}catch(e){}let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<u.length;i++){const c=u.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
 return (4294967296*(2097151&h2)+(h1>>>0)).toString(16).padStart(14,'0')};
const SOURCES={
 ai:{host:'al-itisam.com',delay:350,extract($){const meta=$('.post-footer-meta-info').first().text();
   return{title:$('.section-title h1').first().text(),body:$('.post-cont-wrapper').first(),date:(meta.match(/[\u0980-\u09ff]+\s+[০-৯0-9]{1,2},\s*[০-৯0-9]{4}/)||[''])[0],author:''}}},
 ra:{host:'www.response-to-anti-islam.com',delay:500,extract($){const head=$('h1.post-title').first().parent();
   return{title:$('h1.post-title').first().text(),body:$('.entry-content').first(),date:(head.text().match(/[A-Z][a-z]{2} \d{1,2}, \d{4}/)||[''])[0],author:head.find('a[href*="author_id"]').first().text()}}},
 at:{host:'at-tahreek.com',delay:350,extract($){const body=$('.main_content_area .article-details').first();body.find('.subjects,.fb-comments,#fb-root,.related-articles').remove();
   const crumbs=$('.styled_breadcumb a').toArray().map(a=>$(a).text().replace(/\s+/g,' ').trim()).filter(Boolean);
   return{title:$('.bread-title h1').first().text(),body,date:crumbs.find(t=>/[০-৯0-9]{4}/.test(t))||'',author:''}}},
 ia:{host:'islamicauthors.com',delay:600,extract($){const art=$('article.article-body').first();
   return{title:art.find('.article-header h1').first().text(),body:art.find('.article-content').first(),date:'',
    /* লেখক-কার্ডের লেখা: "<ছবির আদ্যক্ষর> <নাম> <সংখ্যা> আর্টিকেল …" */
    author:(t=>{const m=t.match(/^\S{1,2}\s+(.{2,140}?)\s+[0-9০-৯]+\s*আর্টিকেল/);return m?m[1]:''})(art.find('.author-card').first().text().replace(/\s+/g,' ').trim())}}}
,
 /* manual: রানার থেকে আনা যায় না (Cloudflare); লেখা tools/add-texts.cjs দিয়ে tools/manual/ থেকে যোগ হয় */
 iz:{host:'www.insightzonebd.com',manual:true},
 /* wayback: সাইটটি রানারকে ঢুকতে দেয় না, তাই Internet Archive-এ সংরক্ষিত সর্বশেষ কপি থেকে পড়া হয় */
 fm:{host:'www.frommuslims.com',delay:12000,wayback:'frommuslims.com',extract($,base){
   const title=$('h1.post-title,h1.entry-title').first().text(),name=(e,word)=>$(e).children('span').first().text().replace(/\s+/g,' ').trim().split(' '+word+' ')[0].replace(/\s+Staff$/,'').trim();
   /* প্রশ্নোত্তর পেজ (DW Question & Answer): প্রশ্ন + সব উত্তর; মন্তব্য, ভোট, শেয়ার বাদ */
   if($('.dwqa-single-question').length){const q=$('.dwqa-question-item').first(),ans=$('.dwqa-answer-item').toArray();if(!ans.length)return{title,html:''};
    const by=n=>n?'<p>— '+esc(n)+'</p>':'',names=[];
    let html='<h2>প্রশ্ন</h2>'+clean($,q.find('.dwqa-question-content').first(),base)+by(name(q.find('.dwqa-question-meta').first(),'asked'));
    for(const a of ans){const n=name($(a).find('.dwqa-answer-meta').first(),'answered');if(n&&!names.includes(n))names.push(n);html+='<h2>উত্তর</h2>'+clean($,$(a).find('.dwqa-answer-content').first(),base)+by(n)}
    return{title,html,date:'',author:names.join(', ')}}
   /* সাধারণ লেখা (Jannah থিম) */
   const body=$('#the-post .entry-content,.entry-content').first();
   body.find('.wp-block-wptelegram-widget-join-channel,.post-bottom-meta,.stream-item,#jp-relatedposts,.sharedaddy,#ez-toc-container,.ez-toc-container,.code-block,.addtoany_share_save_container,.yarpp-related,.share-buttons,.post-shortlink,.footnote_referrer_base,.footnote_reference_container_collapse_button').remove();
   body.children('div').filter((k,e)=>{const t=$(e).text().replace(/\s+/g,' ').trim();return t.length<260&&/^আর[োও] পড়ুন/.test(t)}).remove();
   /* টীকা: পূর্ণ তালিকা থাকলে ভাসমান কপি বাদ; না থাকলে ভাসমান লেখা দিয়ে নিচে তালিকা */
   const refs=$('.footnote_plugin_text');
   if(refs.length){body.find('.footnote_tooltip').remove();const box=$('.footnotes_reference_container').first();if(box.length&&!body.find('.footnote_plugin_text').length)body.append(box)}
   else{const tips=body.find('.footnote_tooltip').toArray();if(tips.length){$(tips).find('.footnote_tooltip_continue').remove();body.append('<ol>'+tips.map(e=>'<li>'+$(e).html()+'</li>').join('')+'</ol>');$(tips).remove()}}
   body.find('.footnote_referrer').each((k,e)=>{$(e).replaceWith('<sup>'+esc($(e).text().replace(/\s+/g,''))+'</sup>')});
   body.find('.footnote_backlink').each((k,e)=>{$(e).replaceWith(esc($(e).text().replace(/[^0-9০-৯]/g,'')))});
   const info=$('#post-extra-info').first().text().replace(/\s+/g,' ').trim();
   return{title,body,date:($('meta[property="article:published_time"]').attr('content')||'').slice(0,10),
    author:$('#the-post .meta-author a,#the-post a.author-name').first().text()||info.replace(/\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}.*$/,'')}}}
};
const sourceOf=u=>{try{const h=new URL(u).host;return Object.keys(SOURCES).find(k=>SOURCES[k].host===h)||null}catch(e){return null}};

/* ---- পরিষ্কার HTML: শুধু নিরীহ ট্যাগ, কোনো স্ক্রিপ্ট/স্টাইল/ইভেন্ট নয় ---- */
const INLINE={b:'b',strong:'b',i:'i',em:'i',u:'u',sup:'sup',sub:'sub',br:'br'};
const BLOCK={p:'p',h1:'h2',h2:'h2',h3:'h3',h4:'h4',h5:'h4',h6:'h4',ul:'ul',ol:'ol',li:'li',blockquote:'blockquote',table:'table',thead:'thead',tbody:'tbody',tr:'tr',td:'td',th:'th'};
const DROP=new Set(['script','style','noscript','iframe','object','embed','form','input','button','select','textarea','svg','canvas','video','audio','link','meta','ins']);
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escA=s=>esc(s).replace(/"/g,'&quot;');
function clean($,root,base){
 const kids=n=>(n.children||[]).map(walk).join('');
 function walk(n){
  if(n.type==='text')return esc(n.data.replace(/\u00a0/g,' ').replace(/[ \t\r\n]+/g,' '));
  if(n.type!=='tag')return'';
  const t=n.tagName.toLowerCase();if(DROP.has(t))return'';
  if(t==='br')return'<br>';
  if(t==='img'){let src=n.attribs['data-src']||n.attribs.src||'';try{src=new URL(src,base).href}catch(e){src=''}
   return /^https:\/\//.test(src)?`<img src="${escA(src)}" alt="${escA(n.attribs.alt||'')}" loading="lazy">`:''}
  if(t==='a'){const inner=kids(n);let h=n.attribs.href||'';const id=n.attribs.name||n.attribs.id||'';
   const idA=/^_?(ftn|ftnref|edn|ednref)\d+$/.test(id)?` id="x${escA(id)}"`:'';
   const fn=h.match(/#(_?(?:ftn|ftnref|edn|ednref)\d+)$/);
   let own=h.startsWith('#');try{const U=new URL(h,base);own=own||U.host===new URL(base).host;h=U.href}catch(e){h=''}
   if(fn&&own)return`<a${idA} href="#x${fn[1]}">${inner}</a>`;
   if(/^https?:\/\//.test(h)&&inner.trim())return`<a${idA} href="${escA(h)}" rel="noopener nofollow" target="_blank">${inner}</a>`;
   return idA?`<a${idA}>${inner}</a>`:inner}
  if(INLINE[t]){const inner=kids(n);return inner.trim()?`<${INLINE[t]}>${inner}</${INLINE[t]}>`:inner}
  if(BLOCK[t]){const inner=kids(n);return`<${BLOCK[t]}>${inner}</${BLOCK[t]}>`}
  if(t==='div'||t==='section'||t==='article'||t==='center'||t==='figure'){const inner=kids(n);
   return /<(p|h2|h3|h4|ul|ol|blockquote|table|div)\b/.test(inner)?inner:(inner.trim()?`<p>${inner}</p>`:'')}
  return kids(n)}
 let html=kids(root.get(0));
 html=html.replace(/<(p|h2|h3|h4|li|blockquote|td|th)>\s+/g,'<$1>').replace(/\s+<\/(p|h2|h3|h4|li|blockquote|td|th)>/g,'</$1>')
  .replace(/<(p|h2|h3|h4|b|i|u|blockquote)>(?:\s|<br>)*<\/\1>/g,'').replace(/<(p|h2|h3|h4|b|i|u|blockquote)>(?:\s|<br>)*<\/\1>/g,'')
  .replace(/(?:<br>\s*){3,}/g,'<br><br>').replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/g,'');
 if(!/^<(p|h2|h3|h4|ul|ol|blockquote|table)\b/.test(html))html='<p>'+html+'</p>';
 return html}
const textLen=h=>h.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().length;

/* ---- কোন লেখাগুলো আনতে হবে ---- */
function builtinRows(){const s=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');const grab=n=>{const i=s.indexOf('const '+n+'=['),j=s.indexOf('].map(',i);return (0,eval)(s.slice(i+7+n.length,j+1))};
 const QB=s.match(/const QB="([^"]+)"/)[1],AI=s.match(/AI="([^"]+)"/)[1];
 return[...grab('QS').map(x=>[x[0],x[1],x[2].startsWith('http')?x[2]:encodeURI(QB+x[2])]),...grab('FT').map(x=>[x[0],x[1],String(x[2]).startsWith('http')?x[2]:AI+x[2]])]}
function catalogRows(){const w={};const rows=[];for(const f of fs.readdirSync(ROOT).filter(f=>/-catalog-part-\d+\.js$/.test(f)).sort()){new Function('window',fs.readFileSync(path.join(ROOT,f),'utf8'))(w)}
 for(const k of['DAWAH_QUESTIONS_PARTS','DAWAH_FATWAS_PARTS'])for(const c in(w[k]||{}))for(const r of w[k][c])rows.push(r);return rows}

/* ---- সংরক্ষণ ---- */
const buckets=new Map();
const bucketOf=k=>k.slice(-3); /* app.js-এর সাথে এক */
const bucketFile=b=>path.join(OUT,b+'.json');
const loadBucket=b=>{if(!buckets.has(b))buckets.set(b,{dirty:false,data:fs.existsSync(bucketFile(b))?JSON.parse(fs.readFileSync(bucketFile(b),'utf8')):{}});return buckets.get(b)};
/* index.json: যে উৎসের (প্রায়) সব লেখা আনা হয়েছে সেটি full, শুধু বাদ পড়াগুলো missing-এ; অন্য উৎসের আনা লেখার key তালিকা keys-এ */
let WANT={};
const flush=()=>{for(const[b,o]of buckets)if(o.dirty){fs.writeFileSync(bucketFile(b),JSON.stringify(o.data));o.dirty=false}
 const have={};let n=0;for(const f of fs.readdirSync(OUT))if(/^[0-9a-f]{3}\.json$/.test(f)){const o=JSON.parse(fs.readFileSync(path.join(OUT,f),'utf8'));for(const k in o){(have[o[k].s]=have[o[k].s]||new Set()).add(k);n++}}
 const idx={v:1,n,full:{},missing:[],keys:[]};
 for(const s of Object.keys(SOURCES)){const h=have[s]||new Set(),w=WANT[s]||new Set(),miss=[...w].filter(k=>!h.has(k));
  if(w.size&&h.size&&miss.length<=w.size*0.05){idx.full[s]=SOURCES[s].host;idx.missing.push(...miss)}else idx.keys.push(...h)}
 idx.missing.sort();idx.keys.sort();fs.writeFileSync(path.join(OUT,'index.json'),JSON.stringify(idx));return n};

/* ---- Internet Archive (Wayback Machine) ---- */
const wbNorm=u=>{try{let p=new URL(u).pathname;try{p=decodeURIComponent(p)}catch(e){}return p.replace(/\/+$/,'')}catch(e){return''}};
/* প্রতিটি পেজের সর্বশেষ সফল (200) কপি: path → {ts,orig} */
async function waybackMap(domain){const map=new Map(),info={rows:0,pages:0};let resume='';
 for(let i=0;i<60;i++){const r=await getSlow('https://web.archive.org/cdx/search/cdx?url='+domain+'&matchType=domain&output=json&fl=timestamp,original&filter=statuscode:200&filter=mimetype:text/html&limit=15000&showResumeKey=true'+(resume?'&resumeKey='+encodeURIComponent(resume):''),180000);
  if(r.status!==200){info.err=r.err||('HTTP '+r.status);break}
  let j;try{j=JSON.parse(r.html)}catch(e){info.err='bad CDX json: '+r.html.slice(0,80);break}
  info.pages++;resume='';
  for(let k=0;k<j.length;k++){const row=j[k];if(!row.length){resume=(j[k+1]||[])[0]||'';break}
   if(row[0]==='timestamp')continue;info.rows++;
   let U;try{U=new URL(row[1])}catch(e){continue}
   if(/\/(amp|feed)\/?$/.test(U.pathname))continue;
   const key=wbNorm(row[1]),q=U.search?1:0,old=map.get(key);
   if(!old||q<old.q||(q===old.q&&row[0]>old.ts))map.set(key,{ts:row[0],orig:row[1],q})}
  if(!resume)break;await sleep(1500)}
 info.urls=map.size;return{map,info}}

/* Internet Archive ধীর এবং বেশি অনুরোধে 429 দেয় বা সংযোগ বন্ধ রাখে: তখন লম্বা বিরতি (Retry-After মেনে) */
async function getSlow(u,ms=90000){let last;for(let a=0;a<3;a++){try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),ms);
   const res=await fetch(u,{headers:{'user-agent':UA},redirect:'follow',signal:ac.signal});const html=await res.text();clearTimeout(tm);
   if(res.status>=500||res.status===429){last='HTTP '+res.status;const ra=parseInt(res.headers.get('retry-after')||'',10);if(a<2)await sleep(1000*Math.min(600,Math.max(ra||0,120*(a+1))));continue}
   return{status:res.status,html,final:res.url}}catch(e){last=(String(e)+' '+String(e&&e.cause||'')).slice(0,120);if(a<2)await sleep(120000*(a+1))}}
 return{status:0,html:'',err:last}}
async function get(u,ms=30000){let last;for(let a=0;a<3;a++){try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),ms);
   const res=await fetch(u,{headers:{'user-agent':UA,'accept-language':'bn,en;q=0.8'},redirect:'follow',signal:ac.signal});const html=await res.text();clearTimeout(tm);
   if(res.status>=500||res.status===429){last='HTTP '+res.status;await sleep(4000*(a+1));continue}return{status:res.status,html,final:res.url}}catch(e){last=(String(e)+' '+String(e&&e.cause||'')).slice(0,120);await sleep(3000*(a+1))}}
 return{status:0,html:'',err:last}}

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const report={at:new Date().toISOString(),request:REQ,done:0,skipped:0,failed:[],bySource:{}};
 /* ping: কোনো ঠিকানা (ফিড/API/সাইটম্যাপ) এই সার্ভার থেকে খোলে কি না দেখার জন্য */
 if(REQ.ping)report.ping=[];
 for(const u of REQ.ping||[]){const r=await get(u);const o={u,status:r.status,len:r.html.length,err:r.err};
  try{const j=JSON.parse(r.html);o.json=Array.isArray(j)?{array:j.length,keys:j[0]&&typeof j[0]==='object'?Object.keys(j[0]).slice(0,30):[]}:{keys:Object.keys(j).slice(0,60)}}
  catch(e){o.head=r.html.replace(/\s+/g,' ').slice(0,160);o.locs=(r.html.match(/<loc>[^<]{0,120}/g)||[]).slice(0,6)}
  report.ping.push(o);await sleep(400)}
 if(REQ.probe)report.probe=[];
 /* probe: অচেনা সাইটের পেজের গঠন দেখার জন্য (texts/_report.json-এ যায়) */
 let WBP=null;
 for(let u of REQ.probe||[]){ /* "wb:<ঠিকানা>" = Internet Archive-এর সর্বশেষ সফল কপি */
  if(u.startsWith('wb:')){WBP=WBP||(await waybackMap('frommuslims.com')).map;const w=WBP.get(wbNorm(u.slice(3)));if(!w){report.probe.push({u,status:'not archived'});continue}u='https://web.archive.org/web/'+w.ts+'id_/'+w.orig}
  const r=await get(u,60000);const $=cheerio.load(r.html);$('script,style,noscript,svg,iframe').remove();
  const sig=e=>e.tagName+(e.attribs.id?'#'+e.attribs.id:'')+(e.attribs.class?'.'+e.attribs.class.trim().split(/\s+/).slice(0,4).join('.'):'');
  const walk=(e,d)=>$(e).children().toArray().slice(0,REQ.probeKids||22).map(c=>{const t=$(c).text().replace(/\s+/g,' ').trim();const o={s:sig(c),n:t.length,t:t.slice(0,40)};if(d<4&&t.length>200&&$(c).children().length)o.c=walk(c,d+1);return o});
  const o={u,status:r.status,err:r.err,final:r.final,len:r.html.length,title:$('title').text().trim().slice(0,80),h1:$('h1').toArray().slice(0,3).map(h=>({t:$(h).text().trim().slice(0,50),path:$(h).parents().toArray().slice(0,6).map(sig)}))};
  let best=null;$('h1').first().parents().each((i,p)=>{if(!best&&$(p).text().replace(/\s+/g,' ').length>800)best=p});
  if(!best)best=$('main,article,body').first().get(0);if(best){o.best=sig(best);o.tree=walk(best,0)}
  o.time=$('time').toArray().slice(0,3).map(t=>sig(t)+' '+$(t).text().trim().slice(0,30)+' '+(t.attribs.datetime||''));
  o.meta=['og:title','article:published_time','author','og:site_name'].map(n=>n+'='+($('meta[property="'+n+'"],meta[name="'+n+'"]').attr('content')||'').slice(0,50));
  if(REQ.sel)o.sel=REQ.sel.map(q=>[q,$(q).length,...$(q).toArray().slice(0,2).map(e=>sig(e)+' > '+$(e).children().toArray().slice(0,6).map(sig).join(' , ')+' :: '+$(e).text().replace(/\s+/g,' ').trim().slice(0,110))]);
  report.probe.push(o)}
 const want=new Set(REQ.hosts||Object.keys(SOURCES)),seen=new Set(),queue={};
 const rows=REQ.set==='all'?[...builtinRows(),...catalogRows()]:REQ.set==='builtin'?builtinRows():[];
 for(const r of[...builtinRows(),...catalogRows()]){const s=sourceOf(r[2]);if(s)(WANT[s]=WANT[s]||new Set()).add(keyOfUrl(r[2]))}
 for(const r of rows){const s=sourceOf(r[2]);if(!s||!want.has(s)||SOURCES[s].manual)continue;const k=keyOfUrl(r[2]);if(seen.has(k))continue;seen.add(k);
  if(loadBucket(bucketOf(k)).data[k]){report.skipped++;continue}(queue[s]=queue[s]||[]).push({k,s,c:r[0],t:r[1],u:r[2]})}
 const WB={};
 for(const s of Object.keys(SOURCES))if(SOURCES[s].wayback&&(queue[s]||REQ.wayback)){const cf=path.join(OUT,'_wayback-'+s+'.json');
  if(fs.existsSync(cf)&&!REQ.wayback){WB[s]=new Map(Object.entries(JSON.parse(fs.readFileSync(cf,'utf8'))).map(([k,v])=>[k,{ts:v[0],orig:v[1]}]));(report.wayback=report.wayback||{})[s]={cached:WB[s].size};continue}
  const w=await waybackMap(SOURCES[s].wayback);WB[s]=w.map;
  const all=[...new Set([...builtinRows(),...catalogRows()].map(r=>r[2]).filter(u=>sourceOf(u)===s))],hit=all.filter(u=>!/\?/.test(u)&&w.map.has(wbNorm(u)));
  w.info.catalog=all.length;w.info.matched=hit.length;w.info.newest=hit.map(u=>w.map.get(wbNorm(u)).ts.slice(0,4)).reduce((o,y)=>(o[y]=(o[y]||0)+1,o),{});
  w.info.qna=[all.filter(u=>/\/qna\/./.test(u)).length,hit.filter(u=>/\/qna\/./.test(u)).length];w.info.unmatched=all.filter(u=>!hit.includes(u)).slice(0,8).map(u=>{try{return decodeURI(u)}catch(e){return u}});(report.wayback=report.wayback||{})[s]=w.info;
  if(!w.info.err&&hit.length)fs.writeFileSync(cf,JSON.stringify(Object.fromEntries(hit.map(u=>{const k=wbNorm(u),v=w.map.get(k);return[k,[v.ts,v.orig]]}))))}
 const deadline=Date.now()+(REQ.minutes||300)*60000,limit=REQ.limit||Infinity;let lastFlush=Date.now();
 await Promise.all(Object.keys(queue).map(async s=>{const src=SOURCES[s],st=report.bySource[s]={queued:queue[s].length,done:0,failed:0};let streak=0;
  for(const it of queue[s].slice(0,(REQ.limits&&REQ.limits[s])||limit)){if(Date.now()>deadline||streak>=25)break;
   let r,fail='';
   if(src.wayback){const w=!/\?/.test(it.u)&&WB[s].get(wbNorm(it.u));
    if(!w){st.failed++;st.unarchived=(st.unarchived||0)+1;if(report.failed.length<400)report.failed.push([it.u,'not archived']);continue}
    r=await getSlow('https://web.archive.org/web/'+w.ts+'id_/'+w.orig);
    if(r.status===200&&/<title>\s*(Just a moment|Attention Required)/i.test(r.html.slice(0,3000)))r={status:0,html:'',err:'challenge page in archive'};
    else if(r.status===200){r.final=it.u;r.w=w.ts}}
   else r=await get(it.u);
   if(r.status!==200)fail=r.err||('HTTP '+r.status);
   else{try{const $=cheerio.load(r.html);const x=src.extract($,r.final||it.u);const html=x.html!==undefined?x.html:(x.body&&x.body.length?clean($,x.body,r.final||it.u):'');const title=(x.title||'').replace(/\s+/g,' ').trim();
     if(!title||textLen(html)<40)fail='no content';
     else{const b=loadBucket(bucketOf(it.k));b.data[it.k]={u:it.u,s,c:it.c,t:title,l:it.t,d:(x.date||'').trim(),a:(x.author||'').replace(/\s+/g,' ').trim(),h:html};if(r.w)b.data[it.k].w=r.w;b.dirty=true;st.done++;report.done++;streak=0}}catch(e){fail='parse: '+String(e).slice(0,80)}}
   if(fail){st.failed++;streak++;if(report.failed.length<400)report.failed.push([it.u,fail])}
   if(Date.now()-lastFlush>120000){lastFlush=Date.now();flush()}
   await sleep(src.delay)}
  if(streak>=25)st.stopped='25 failures in a row'}));
 report.total=flush();fs.writeFileSync(path.join(OUT,'_report.json'),JSON.stringify(report,null,1));
 if(fs.existsSync(path.join(OUT,'_probe.json')))fs.unlinkSync(path.join(OUT,'_probe.json'));
 console.log(JSON.stringify({done:report.done,failed:report.failed.length,total:report.total,bySource:report.bySource}))})();
