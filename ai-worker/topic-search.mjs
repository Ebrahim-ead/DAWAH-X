// Candidate discovery is keyword-based, not a religious verdict. Every selected
// record is reloaded from Ebrahim Ead's structured data before model use.
import {scriptureJSON} from './scripture.mjs';
const BASE='https://ebrahim-ead.github.io/ead/';
const BOOKS=new Set(['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat']);
const GENERIC=new Set('কুরআন কুরআনের কোরআন কোরআনের কুরানের হাদিস হাদিসের হাদীস হাদীসের ইসলাম ইসলামি ইসলামের আল্লাহ আল্লাহর বিষয়ে বিষয়ে সম্পরকে গুরুত্ব গুরুতব দলিল প্রমান প্রমাণ নিয়ম নিয়ম বিধান বলে বলুন ব্যাখ্যা বযাখযা জানতে জানাবেন চাই কেন কিভাবে কিভাবে সম্পর্কে আলোচনা উল্লেখ শুনতে হয়েছে কি কী হুকুম করনীয় করণীয় অনুসারে অনুযায়ী quran hadith islam according evidence ruling'.split(' '));
const FOLD={'ী':'ি','ূ':'ু','ঈ':'ই','ঊ':'উ','ছ':'স','শ':'স','ষ':'স','য':'জ','ণ':'ন','ৎ':'ত'};
function fold(text){return String(text||'').normalize('NFC').toLowerCase().replace(/[০-৯]/g,c=>String(c.charCodeAt(0)-0x09e6)).replace(/[\u200b-\u200d\u00ad\ufeff\u0981]/g,'').replace(/([\p{L}\p{M}])[‘’'ʼ](?=\p{L})/gu,'$1').replace(/\u09af\u09bc/g,'\u09df').replace(/\u09a1\u09bc/g,'\u09dc').replace(/\u09a2\u09bc/g,'\u09dd').replace(/([কত])\u09cd\u09ac/g,'$1').replace(/[ীূঈঊছশষযণৎ]/g,c=>FOLD[c]);}
const generic=new Set([...GENERIC].map(fold));
function topics(terms){
 const seen=new Set();const result=terms.filter(group=>!group.some(x=>generic.has(x))).filter(group=>{const key=[...group].sort().join('|');if(seen.has(key))return false;seen.add(key);return true}).map(group=>[...new Set(group.flatMap(x=>{
  // A few common Bengali case suffixes; don't guess arbitrary stems.
  const stem=x.replace(/(?:ের|দের|তে|কে)$/u,'');return [...stem].length>=4?[x,stem]:[x];
 }))]);
 for(const group of result)if(group.length===1&&/^\d+$/.test(group[0]))group.numeric=new RegExp('(?<![\\p{L}\\p{M}\\p{N}])'+group[0]+'(?![\\p{L}\\p{M}\\p{N}])','u');
 return result;
}
function score(text,terms,normalized=false){const value=normalized?text:fold(text);let n=0;for(const forms of terms)if(forms.numeric?forms.numeric.test(value):forms.some(x=>value.includes(x)))n++;return n;}
function footnotes(text){return text.replace(/\[\s*([0-9০-৯]+)\s*\]/g,'(অনুবাদের টীকা $1)');}
let ayahCache=null,indexCache=null;
async function cached(slot,loader){
 // Store only completed data: Cloudflare request-bound I/O promises must not
 // be shared across simultaneous requests or retained in an isolate.
 const item=slot==='ayah'?ayahCache:indexCache;
 if(item&&item.until>Date.now())return item.value;
 const value=await loader(),next={value,until:Date.now()+30*60*1000};
 if(slot==='ayah')ayahCache=next;else indexCache=next;
 return value;
}
async function ayahIndex(){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),10000);
 try{
  const r=await fetch(BASE+'assets/search-ayahs.js',{signal:c.signal,redirect:'error'});if(!r.ok||!r.body)throw Error('Quran search unavailable');
  const reader=r.body.getReader(),parts=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4*1024*1024){await reader.cancel();throw Error('Quran index too large')}parts.push(value)}
  const bytes=new Uint8Array(size);let pos=0;for(const p of parts){bytes.set(p,pos);pos+=p.length}
  const s=new TextDecoder().decode(bytes),m=s.match(/window\.SITE_AYAHS\s*=\s*(\[[\s\S]*\])\s*;\s*$/);if(!m)throw Error('Invalid Quran search index');
  const rows=JSON.parse(m[1]);if(!Array.isArray(rows)||!rows.length||rows.length>7000)throw Error('Invalid Quran search index');
  return rows.filter(r=>Array.isArray(r)&&Number.isInteger(r[0])&&r[0]>=1&&r[0]<=114&&Number.isInteger(r[1])&&r[1]>=1&&r[1]<=286&&typeof r[2]==='string'&&r[2].length<=8000).map(r=>[r[0],r[1],fold(r[2])]);
 }finally{clearTimeout(timer)}
}
async function quran(terms){
 const rows=await cached('ayah',ayahIndex), needed=terms.length;
 const matches=[],seen=new Set();for(const row of rows){const key=row[0]+':'+row[1];if(seen.has(key))continue;seen.add(key);const n=score(row[2],terms,true);if(n>=needed)matches.push({surah:row[0],verse:row[1],score:n})}
 matches.sort((a,b)=>b.score-a.score||a.surah-b.surah||a.verse-b.verse);
 // Avoid giving all evidence slots to one chapter, but keep the highest ranks.
 const picks=[];for(const m of matches){if(picks.filter(x=>x.surah===m.surah).length<2)picks.push(m);if(picks.length===3)break}
 const chapters=[...new Set(picks.map(x=>x.surah))];
 const results=await Promise.allSettled(chapters.map(n=>scriptureJSON('assets/quran/data/suras/'+n+'.json')));
 const docs=new Map();results.forEach((r,i)=>{if(r.status==='fulfilled'&&r.value.n===chapters[i]&&Array.isArray(r.value.verses))docs.set(chapters[i],r.value)});
 let failed=docs.size!==chapters.length;const items=[];
 for(const p of picks){const d=docs.get(p.surah);if(!d)continue;const vs=d.verses.filter(v=>v.a===p.verse&&typeof v.bn==='string'&&v.bn.trim()&&v.bn.length<=6000);if(vs.length!==1||score(vs[0].bn,terms)<needed){failed=true;continue}
  const name=typeof d.bnName==='string'&&d.bnName.trim()?d.bnName.slice(0,100):String(p.surah),title='সূরা '+name+' · '+p.surah+':'+p.verse;
  items.push({title,type:'quran',surah:p.surah,verse:p.verse,text:'কুরআনের আয়াত: '+title+'\nবাংলা অনুবাদ: '+footnotes(vs[0].bn)+'\nঅনুবাদক ড. আবূ বকর মুহাম্মাদ যাকারিয়া; রাওয়াদ ট্রান্সলেশন সেন্টার, QuranEnc.com সংস্করণ ১.১.১। টীকা ও আগের-পরের আয়াত মূল উৎসে দেখুন।'});
 }
 return {items,failed};
}
async function hadith(terms){
 const idx=await cached('index',()=>scriptureJSON('assets/hadith/data/index.json'));
 if(!Array.isArray(idx.books))throw Error('Invalid hadith search index');
 const chapters=[];for(const b of idx.books){if(!BOOKS.has(b.slug)||!Array.isArray(b.chapters)||typeof b.bn!=='string')continue;for(const c of b.chapters){if(!Number.isInteger(c.id)||c.id<0||c.id>200||typeof c.bn!=='string')continue;const n=score(c.bn,terms);if(n)chapters.push({book:b.slug,name:b.bn.slice(0,100),id:c.id,score:n})}}
 chapters.sort((a,b)=>b.score-a.score);const picked=[];for(const c of chapters){if(picked.filter(x=>x.book===c.book).length<2)picked.push(c);if(picked.length===5)break}
 const results=await Promise.allSettled(picked.map(c=>scriptureJSON('assets/hadith/data/'+c.book+'/'+c.id+'.json')));
 let failed=false;const candidates=[];
 results.forEach((r,i)=>{const c=picked[i];if(r.status!=='fulfilled'||r.value.book!==c.book||r.value.chapter!==c.id||!Array.isArray(r.value.verses)){failed=true;return}
  const counts=new Map();for(const v of r.value.verses)counts.set(v.i,(counts.get(v.i)||0)+1);
  for(const v of r.value.verses){if(!Number.isInteger(v.i)||v.i<1||v.i>20000||counts.get(v.i)!==1||v.dup||typeof v.b!=='string'||!v.b.trim()||v.b.length>6000||/^(?:অনুবাদ পাওয়া যায়নি।?|\(\.\.\.\)|—|-)$/u.test(v.b.trim()))continue;
   const n=score(v.b,terms);if(n<terms.length)continue;
   const title=c.name+' · হাদিস '+v.i,grade=typeof v.g==='string'&&v.g.trim()?v.g.slice(0,100):'উৎসে উল্লেখ নেই';
   candidates.push({rank:n,title,type:'hadith',book:c.book,chapter:c.id,hadith:v.i,text:'হাদিস: '+title+'\nবাংলা পাঠ: '+footnotes(v.b)+'\nউৎসে উল্লিখিত মান: '+grade+'। মূল তথ্য: '+(c.book==='mishkat'?'মুসলিম বাংলা':'IRD Foundation / ihadis.com')+'; Ebrahim Ead-এ প্রকাশিত। সংস্করণভেদে নম্বর ভিন্ন হতে পারে।'});
  }
 });
 const counts=new Map();for(const v of candidates){const key=v.book+':'+v.hadith;counts.set(key,(counts.get(key)||0)+1)}
 candidates.sort((a,b)=>b.rank-a.rank);return {items:candidates.filter(v=>counts.get(v.book+':'+v.hadith)===1).slice(0,3).map(({rank,...item})=>item),failed};
}
export async function searchScripture(termGroups){
 const terms=topics(termGroups);if(!terms.length||terms.every(group=>group.every(x=>/^\d+$/.test(x))))return {items:[],failed:false};
 const results=await Promise.allSettled([quran(terms),hadith(terms)]);
 return {items:results.flatMap(r=>r.status==='fulfilled'?r.value.items:[]),failed:results.some(r=>r.status==='rejected'||r.value.failed)};
}
