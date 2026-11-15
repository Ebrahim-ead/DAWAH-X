/* DAWAH X — লাইব্রেরির লেখা আমদানি (GitHub Actions-এ চলে; দেখুন .github/workflows/import-texts.yml)
   প্রকাশকের অনুমতি সাপেক্ষে উৎস সাইট থেকে লেখা এনে texts/<bucket>.json-এ রাখে। প্রতিটি লেখার সাথে উৎসের ঠিকানা থাকে।
   নিয়ন্ত্রণ: tools/import-request.json  {"set":"builtin"|"all","hosts":["ai","ra","at"],"limits":{"at":100},"minutes":300}  (আগে আনা লেখা আবার আনা হয় না) */
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
   return{title:$('.bread-title h1').first().text(),body,date:crumbs.find(t=>/[০-৯0-9]{4}/.test(t))||'',author:''}}}
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
const bucketFile=b=>path.join(OUT,b+'.json');
const loadBucket=b=>{if(!buckets.has(b))buckets.set(b,{dirty:false,data:fs.existsSync(bucketFile(b))?JSON.parse(fs.readFileSync(bucketFile(b),'utf8')):{}});return buckets.get(b)};
const flush=()=>{for(const[b,o]of buckets)if(o.dirty){fs.writeFileSync(bucketFile(b),JSON.stringify(o.data));o.dirty=false}
 const keys=[];for(const f of fs.readdirSync(OUT))if(/^[0-9a-f]{2}\.json$/.test(f))keys.push(...Object.keys(JSON.parse(fs.readFileSync(path.join(OUT,f),'utf8'))));
 fs.writeFileSync(path.join(OUT,'index.json'),JSON.stringify(keys.sort()));return keys.length};

async function get(u){let last;for(let a=0;a<3;a++){try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),30000);
   const res=await fetch(u,{headers:{'user-agent':UA,'accept-language':'bn,en;q=0.8'},redirect:'follow',signal:ac.signal});const html=await res.text();clearTimeout(tm);
   if(res.status>=500||res.status===429){last='HTTP '+res.status;await sleep(4000*(a+1));continue}return{status:res.status,html,final:res.url}}catch(e){last=String(e).slice(0,80);await sleep(3000*(a+1))}}
 return{status:0,html:'',err:last}}

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const report={at:new Date().toISOString(),request:REQ,done:0,skipped:0,failed:[],bySource:{}};
 if(REQ.probe)report.probe=[];
 for(const u of REQ.probe||[]){const r=await get(u);const $=cheerio.load(r.html);$('script,style,noscript,svg').remove();const sig=e=>e.tagName+(e.attribs.id?'#'+e.attribs.id:'')+(e.attribs.class?'.'+e.attribs.class.trim().split(/\s+/).slice(0,4).join('.'):'');
  const walk=(e,d)=>$(e).children().toArray().slice(0,25).map(c=>{const t=$(c).text().replace(/\s+/g,' ').trim();const o={s:sig(c),n:t.length,t:t.slice(0,40)};if(d<4&&t.length>120&&$(c).children().length)o.c=walk(c,d+1);return o});
  const el=$(REQ.probeSel||'.main_content_area .col-md-9').first();report.probe.push({u,status:r.status,tree:el.length?walk(el.get(0),0):null})}
 const want=new Set(REQ.hosts||Object.keys(SOURCES)),seen=new Set(),queue={};
 const rows=REQ.set==='all'?[...builtinRows(),...catalogRows()]:REQ.set==='builtin'?builtinRows():[];
 for(const r of rows){const s=sourceOf(r[2]);if(!s||!want.has(s))continue;const k=keyOfUrl(r[2]);if(seen.has(k))continue;seen.add(k);
  if(loadBucket(k.slice(0,2)).data[k]){report.skipped++;continue}(queue[s]=queue[s]||[]).push({k,s,c:r[0],t:r[1],u:r[2]})}
 const deadline=Date.now()+(REQ.minutes||300)*60000,limit=REQ.limit||Infinity;let lastFlush=Date.now();
 await Promise.all(Object.keys(queue).map(async s=>{const src=SOURCES[s],st=report.bySource[s]={queued:queue[s].length,done:0,failed:0};let streak=0;
  for(const it of queue[s].slice(0,(REQ.limits&&REQ.limits[s])||limit)){if(Date.now()>deadline||streak>=25)break;
   const r=await get(it.u);let fail='';
   if(r.status!==200)fail=r.err||('HTTP '+r.status);
   else{try{const $=cheerio.load(r.html);const x=src.extract($);const html=x.body&&x.body.length?clean($,x.body,r.final||it.u):'';const title=(x.title||'').replace(/\s+/g,' ').trim();
     if(!title||textLen(html)<40)fail='no content';
     else{const b=loadBucket(it.k.slice(0,2));b.data[it.k]={u:it.u,s,c:it.c,t:title,l:it.t,d:(x.date||'').trim(),a:(x.author||'').replace(/\s+/g,' ').trim(),h:html};b.dirty=true;st.done++;report.done++;streak=0}}catch(e){fail='parse: '+String(e).slice(0,80)}}
   if(fail){st.failed++;streak++;if(report.failed.length<400)report.failed.push([it.u,fail])}
   if(Date.now()-lastFlush>120000){lastFlush=Date.now();flush()}
   await sleep(src.delay)}
  if(streak>=25)st.stopped='25 failures in a row'}));
 report.total=flush();fs.writeFileSync(path.join(OUT,'_report.json'),JSON.stringify(report,null,1));
 if(fs.existsSync(path.join(OUT,'_probe.json')))fs.unlinkSync(path.join(OUT,'_probe.json'));
 console.log(JSON.stringify({done:report.done,failed:report.failed.length,total:report.total,bySource:report.bySource}))})();
