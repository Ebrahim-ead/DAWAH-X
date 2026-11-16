/* DAWAH X — হাতে তোলা লেখা যোগ করা: tools/manual/*.txt → texts/<bucket>.json + texts/index.json
   চালানো: node tools/add-texts.cjs   (একই ঠিকানার লেখা থাকলে নতুনটি দিয়ে বদলে যায়)
   ফাইলের গঠন: উপরে "নাম: মান" লাইন (u, a, d, t, asker, asked, q), একটি ফাঁকা লাইন, তারপর লেখা
   (অনুচ্ছেদের মাঝে ফাঁকা লাইন; "## " উপশিরোনাম, "> " উদ্ধৃতি, "- " / "1. " তালিকা, [লেখা](ঠিকানা), **গাঢ়**, _বাঁকা_)। */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'texts'),DIR=path.join(__dirname,'manual');
/* app.js-এর textKey() ও import-texts.cjs-এর keyOfUrl()-এর সাথে হুবহু এক */
const keyOfUrl=u=>{try{u=decodeURI(u)}catch(e){}let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<u.length;i++){const c=u.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
 return (4294967296*(2097151&h2)+(h1>>>0)).toString(16).padStart(14,'0')};
const HOSTS={'www.insightzonebd.com':'iz','www.frommuslims.com':'fm'};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escA=s=>esc(s).replace(/"/g,'&quot;');
const links=[];
const inline=s=>{const out=[];let i=0;const re=/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|(?<![\p{L}\p{N}])_([^_\n]+)_(?![\p{L}\p{N}])/gu;let m;
 s=s.replace(/\\([\\\-|*_.#>\[\]()!])/g,'$1');
 while((m=re.exec(s))){out.push(esc(s.slice(i,m.index)));
  if(m[2]){let u=m[2];try{u=encodeURI(decodeURI(u))}catch(e){throw new Error('bad link '+u)}links.push(decodeURI(u));out.push('<a href="'+escA(u)+'" rel="noopener nofollow" target="_blank">'+esc(m[1])+'</a>')}
  else if(m[3])out.push('<b>'+esc(m[3])+'</b>');else out.push('<i>'+esc(m[4])+'</i>');i=m.index+m[0].length}
 out.push(esc(s.slice(i)));return out.join('')};
const toHtml=md=>md.replace(/\r/g,'').split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean).map(b=>{
  const ls=b.split('\n').map(l=>l.trim());let m;
  if((m=b.match(/^(#{1,6})\s+(.*)$/s)))return(m[1].length<=3?'<h3>':'<h4>')+inline(m[2].replace(/\n/g,' '))+(m[1].length<=3?'</h3>':'</h4>');
  if(ls.every(l=>/^>\s?/.test(l)))return'<blockquote><p>'+ls.map(l=>inline(l.replace(/^>\s?/,''))).join('<br>')+'</p></blockquote>';
  if(ls.every(l=>/^[-*]\s+/.test(l)))return'<ul>'+ls.map(l=>'<li>'+inline(l.replace(/^[-*]\s+/,''))+'</li>').join('')+'</ul>';
  if(ls.every(l=>/^\d+[.)]\s+/.test(l)))return'<ol>'+ls.map(l=>'<li>'+inline(l.replace(/^\d+[.)]\s+/,''))+'</li>').join('')+'</ol>';
  return'<p>'+ls.map(inline).join('<br>')+'</p>'}).join('');
/* কার্ডের বিভাগ ও শিরোনাম app.js-এর তালিকা থেকে */
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),rows={};
for(const m of app.matchAll(/\["([^"]*)","([^"]*)","(https:\/\/[^"]*)"\]/g))rows[keyOfUrl(m[3])]=[m[1],m[2]];
const idx=JSON.parse(fs.readFileSync(path.join(OUT,'index.json'),'utf8')),keys=new Set(idx.keys);let added=0,n=0;
for(const f of fs.readdirSync(DIR).filter(f=>f.endsWith('.txt')).sort()){
 const raw=fs.readFileSync(path.join(DIR,f),'utf8').replace(/\r/g,''),cut=raw.indexOf('\n\n'),h={};
 for(const l of raw.slice(0,cut).split('\n')){const m=l.match(/^([a-z]+):\s*(.*)$/);if(!m)throw new Error(f+': bad header line: '+l);h[m[1]]=m[2].trim()}
 const s=HOSTS[new URL(h.u).host],k=keyOfUrl(h.u),row=rows[k];
 if(!s)throw new Error(f+': unknown host');if(!row)throw new Error(f+': address is not a card in app.js');
 let html=toHtml(raw.slice(cut+2));
 if(h.q)html='<h2>প্রশ্ন</h2><p>'+esc(h.q)+'</p>'+(h.asker?'<p>— '+esc([h.asker,h.asked].filter(Boolean).join(', '))+'</p>':'')+'<h2>অফিসিয়াল উত্তর</h2>'+html;
 const b=k.slice(-3),file=path.join(OUT,b+'.json'),data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
 if(!data[k])added++;data[k]={u:h.u,s,c:row[0],t:h.t||row[1].replace(/\s*\(প্রশ্নোত্তর\)\s*$/,''),l:row[1],d:h.d||'',a:h.a||'',h:html};
 fs.writeFileSync(file,JSON.stringify(data));if(!idx.full[s])keys.add(k);n++;
 console.log(f,k,s,html.replace(/<[^>]+>/g,'').length+' chars')}
idx.keys=[...keys].sort();idx.n+=added;fs.writeFileSync(path.join(OUT,'index.json'),JSON.stringify(idx));
console.log(JSON.stringify({files:n,added,total:idx.n}));
console.log('links:\n'+[...new Set(links)].join('\n'));
