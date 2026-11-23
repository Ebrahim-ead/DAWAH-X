// Candidate discovery is keyword-based, not a religious verdict. Every selected
// record is reloaded from Ebrahim Ead's structured data before model use.
import {scriptureJSON} from './scripture.mjs';
import {sourceText,EAD_SNAPSHOT} from './source-fetch.mjs';
import {findHadithCandidates} from './hadith-index.mjs';
const BASE='https://ebrahim-ead.github.io/ead/';
const BOOKS=new Set(['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat']);
const GENERIC=new Set('কুরআন কুরআনের কোরআন কোরআনের কুরানের হাদিস হাদিসের হাদীস হাদীসের ইসলাম ইসলামি ইসলামের আল্লাহ আল্লাহর বিষয়ে বিষয়ে সম্পরকে গুরুত্ব গুরুতব গুরুত্বপূর্ণ গুরুতবপূর্ণ আলোকে দলিল প্রমান প্রমাণ নিয়ম নিয়ম বিধান বলে বলুন ব্যাখ্যা বযাখযা জানতে জানাবেন চাই কেন কিভাবে কিভাবে সম্পর্কে আলোচনা উল্লেখ শুনতে শুনছি শুনেছি শুনেছি নাকি সঙ্গে সহিত প্রত্যেক প্রতিটি প্রতিটা প্রতিটিই প্রত্যেকটি হিসেবে রূপে হয়েছে কি কী হুকুম করনীয় করণীয় রেখে নিলে নিয়েছে নিয়েছে ভেঙে ভাঙে ভাঙ্গে যায় যায় হলো হলে করতে করলে অনুসারে অনুযায়ী quran hadith islam according evidence ruling'.split(' '));
const FOLD={'ী':'ি','ূ':'ু','ঈ':'ই','ঊ':'উ','ছ':'স','শ':'স','ষ':'স','য':'জ','ণ':'ন','ৎ':'ত'};
export function fold(text){return String(text||'').normalize('NFC').toLowerCase().replace(/[০-৯]/g,c=>String(c.charCodeAt(0)-0x09e6)).replace(/[\u200b-\u200d\u00ad\ufeff\u0981]/g,'').replace(/([\p{L}\p{M}])[‘’'ʼ](?=\p{L})/gu,'$1').replace(/\u09af\u09bc/g,'\u09df').replace(/\u09a1\u09bc/g,'\u09dc').replace(/\u09a2\u09bc/g,'\u09dd').replace(/([কত])\u09cd\u09ac/g,'$1').replace(/[ীূঈঊছশষযণৎ]/g,c=>FOLD[c]);}
const generic=new Set([...GENERIC].map(fold));
// Small, explicit topic vocabulary, used for candidate discovery only. The
// original question and the full source always go to the model for context.
const CONCEPTS=[['শিশু','বাচ্চা','সন্তান','নবজাতক'],['জন্ম','প্রসব'],['মুসলিম','মুসলমান','ইসলাম','ফিতরাত','ফিত্রাত','স্বভাবজাত'],['মা','মায়ের','মাতা','মাতাপিতা','পিতামাতা'],['বাবা','পিতা','মাতাপিতা','পিতামাতা'],['সদ্ব্যবহার','সদ্ব্যবহার','সদাচরণ','সৎব্যবহার','উত্তম ব্যবহার','ভালো ব্যবহার','ভাল ব্যবহার','সম্মান','ইহসান'],['তাওহিদ','একমাত্র ইলাহ','এক ইলাহ','ইলাহ এক','আল্লাহ ছাড়া কোনো সত্য ইলাহ','এক আল্লাহ']].map(g=>g.map(fold));
// These narrowly defined inflections are candidates, not synonyms for every
// use of the words. Keep short পা boundary-checked (it must not match পানি).
const INFLECTIONS=[
 {forms:['পা','পায়ে','পায়ের','পায়ে','পায়ের'],match:['পা']},
 {forms:['মিলানো','মিলানোর','মিলানোয়','মিলিয়ে','মিলিয়ে','মিলানোকে','মিলান'],match:['মিলানো','মিলিয়ে','মিলান']},
 // Nominal forms such as ভাঙার/ভঙ্গের describe the same candidate topic;
 // keep the subject and other conditions required, and do not guess rulings.
 {forms:['ভাঙা','ভাঙ্গা','ভাঙার','ভাঙ্গার','ভঙ্গ','ভঙ্গের'],match:['ভাঙা','ভাঙ্গা','ভঙ্গ']}
].map(({forms,match})=>({forms:new Set(forms.map(fold)),match:match.map(fold)}));
export function topics(terms){
 const expanded=terms.filter(group=>!group.some(x=>generic.has(x))).map(group=>{const inflection=INFLECTIONS.find(g=>group.some(x=>g.forms.has(x)));if(inflection)return inflection.match;const concept=CONCEPTS.find((g,i)=>!(i===2&&group.some(x=>generic.has(x)))&&group.some(x=>g.some(y=>x===y||([...y].length>=3&&x.startsWith(y)))));return concept||group});
 const seen=new Set();const result=expanded.filter(group=>{const key=[...group].sort().join('|');if(seen.has(key))return false;seen.add(key);return true}).map(group=>[...new Set(group.flatMap(x=>{
  // A few common Bengali case suffixes; don't guess arbitrary stems.
  const stem=x.replace(/(?:ের|তে|কে)$/u,'');return [...stem].length>=4?[x,stem]:[x];
 }))]);
 const numberWords={1:'এক',2:'দুই',3:'তিন',4:'চার',5:'পাঁচ',6:'ছয়',7:'সাত',8:'আট',9:'নয়',10:'দশ'};
 for(const group of result)if(group.length===1){
  const token=group[0];let number=/^\d+$/.test(token)?token:null;
  if(number===null)for(const [n,word] of Object.entries(numberWords))if(new RegExp('^'+fold(word)+'(?:টি|টিই|টা|বার|জন)?$','u').test(token)){number=n;break}
  if(number===null)continue;
  const word=numberWords[Number(number)],alternate=word?'|'+fold(word)+'(?:টি|টিই|টা|বার|জন)?':'';
  group.numeric=new RegExp('(?<![\\p{L}\\p{M}\\p{N}])(?:'+number+alternate+')(?![\\p{L}\\p{M}\\p{N}])','u');
 }
 return result;
}
function locations(value,form){
 if([...form].length<=3){
  // Short Bengali stems occur inside unrelated words (সুদ / সুদৃশ্য).
  // Match whole words and a conservative set of case/derivational suffixes.
  const suffix=form===fold('পা')?'(?:য়ের|য়ে|য়ের|য়ে|ের|তে|কে|টি|টা|গুলো|গুলি|ই|ও|ে|র)?':'(?:ের|দের|তে|কে|টি|টা|রা|গুলো|গুলি|ই|ও|ে|ি|র)?';
  const r=new RegExp('(?<![\\p{L}\\p{M}\\p{N}])'+form+suffix+'(?![\\p{L}\\p{M}\\p{N}])','gu'),out=[];
  for(const m of value.matchAll(r)){out.push(m.index);if(out.length===100)break}return out;
 }
 const out=[];let at=-1;while(out.length<100&&(at=value.indexOf(form,at+1))!==-1)out.push(at);return out;
}
export function score(text,terms,normalized=false){const value=normalized?text:fold(text);let n=0;for(const forms of terms)if(forms.numeric?forms.numeric.test(value):forms.some(x=>[...x].length<=3?locations(value,x).length>0:value.includes(x)))n++;return n;}
// Co-occurrence across a long narration/verse can describe unrelated events.
// Require all meaningful groups near one another; this still is not semantic proof.
function near(text,terms,window=240,normalized=false){
 if(terms.length<2)return true;const value=normalized?text:fold(text),hits=[];
 for(let g=0;g<terms.length;g++){
  const forms=terms[g];if(forms.numeric){const r=new RegExp(forms.numeric.source,'gu');for(const m of value.matchAll(r))hits.push([m.index,g]);continue}
  for(const form of forms)for(const at of locations(value,form))hits.push([at,g]);
 }
 hits.sort((a,b)=>a[0]-b[0]);const counts=new Map();let left=0;
 for(let right=0;right<hits.length;right++){const [pos,g]=hits[right];counts.set(g,(counts.get(g)||0)+1);while(pos-hits[left][0]>window){const old=hits[left++][1],n=counts.get(old)-1;if(n)counts.set(old,n);else counts.delete(old)}if(counts.size===terms.length)return true}return false;
}
function footnotes(text){return text.replace(/\[\s*([0-9০-৯]+)\s*\]/g,'(অনুবাদের টীকা $1)');}
let ayahCache=null,indexCache=null;
async function cached(slot,loader,mirrors){
 // Store only completed data: Cloudflare request-bound I/O promises must not
 // be shared across simultaneous requests or retained in an isolate.
 const item=slot==='ayah'?ayahCache:indexCache;
 if(item&&item.until>Date.now()){for(const url of item.mirrors)mirrors?.add(url);return item.value}
 const used=new Set();const value=await loader(used),next={value,mirrors:[...used],until:Date.now()+30*60*1000};
 for(const url of used)mirrors?.add(url);
 if(slot==='ayah')ayahCache=next;else indexCache=next;
 return value;
}
async function ayahIndex(mirrors){
 const s=await sourceText(BASE+'assets/search-ayahs.js',4*1024*1024,mirrors);
 const m=s.match(/window\.SITE_AYAHS\s*=\s*(\[[\s\S]*\])\s*;\s*$/);if(!m)throw Error('Invalid Quran search index');
 const rows=JSON.parse(m[1]);if(!Array.isArray(rows)||!rows.length||rows.length>7000)throw Error('Invalid Quran search index');
 return rows.filter(r=>Array.isArray(r)&&Number.isInteger(r[0])&&r[0]>=1&&r[0]<=114&&Number.isInteger(r[1])&&r[1]>=1&&r[1]<=286&&typeof r[2]==='string'&&r[2].length<=8000).map(r=>[r[0],r[1],fold(r[2])]);
}
async function quran(terms,mirrors){
 const rows=await cached('ayah',ayahIndex,mirrors), needed=terms.length;
 const matches=[],seen=new Set();for(const row of rows){const key=row[0]+':'+row[1];if(seen.has(key))continue;seen.add(key);const n=score(row[2],terms,true);if(n>=needed&&near(row[2],terms,240,true))matches.push({surah:row[0],verse:row[1],score:n})}
 matches.sort((a,b)=>b.score-a.score||a.surah-b.surah||a.verse-b.verse);
 // Avoid giving all evidence slots to one chapter, but keep the highest ranks.
 const picks=[];for(const m of matches){if(picks.filter(x=>x.surah===m.surah).length<2)picks.push(m);if(picks.length===3)break}
 const chapters=[...new Set(picks.map(x=>x.surah))];
 const results=await Promise.allSettled(chapters.map(n=>scriptureJSON('assets/quran/data/suras/'+n+'.json',mirrors)));
 const docs=new Map();results.forEach((r,i)=>{if(r.status==='fulfilled'&&r.value.n===chapters[i]&&Array.isArray(r.value.verses))docs.set(chapters[i],r.value)});
 let failed=docs.size!==chapters.length;const items=[];
 for(const p of picks){const d=docs.get(p.surah);if(!d)continue;const vs=d.verses.filter(v=>v.a===p.verse&&typeof v.bn==='string'&&v.bn.trim()&&v.bn.length<=6000);if(vs.length!==1||score(vs[0].bn,terms)<needed||!near(vs[0].bn,terms)){failed=true;continue}
  const name=typeof d.bnName==='string'&&d.bnName.trim()?d.bnName.slice(0,100):String(p.surah),title='সূরা '+name+' · '+p.surah+':'+p.verse;
  items.push({title,type:'quran',surah:p.surah,verse:p.verse,...(mirrors?.has(BASE+'assets/quran/data/suras/'+p.surah+'.json')?{snapshot:EAD_SNAPSHOT}:{}),text:'কুরআনের আয়াত: '+title+'\nবাংলা অনুবাদ: '+footnotes(vs[0].bn)+'\nঅনুবাদক ড. আবূ বকর মুহাম্মাদ যাকারিয়া; রাওয়াদ ট্রান্সলেশন সেন্টার, QuranEnc.com সংস্করণ ১.১.১। টীকা ও আগের-পরের আয়াত মূল উৎসে দেখুন।'});
 }
 return {items,failed};
}
async function hadith(terms,mirrors){
 const idx=await cached('index',used=>scriptureJSON('assets/hadith/data/index.json',used),mirrors);
 if(!Array.isArray(idx.books))throw Error('Invalid hadith search index');
 let candidatesFromIndex=[],indexFailed=false,indexLimited=false;
 try{candidatesFromIndex=await findHadithCandidates(terms,mirrors);indexLimited=!!candidatesFromIndex.limited}catch(_){indexFailed=true}
 const chapters=[];for(const b of idx.books){if(!BOOKS.has(b.slug)||!Array.isArray(b.chapters)||typeof b.bn!=='string')continue;for(const c of b.chapters){if(!Number.isInteger(c.id)||c.id<0||c.id>200||typeof c.bn!=='string')continue;const n=score(c.bn,terms);if(n)chapters.push({book:b.slug,name:b.bn.slice(0,100),id:c.id,score:n})}}
 const titleOnly=terms.length===1&&chapters.length>0;
 const picked=[];for(const c of (titleOnly?[]:candidatesFromIndex)){const b=idx.books.find(b=>b.slug===c.book),chapter=b?.chapters?.find(x=>x.id===c.id);if(b&&chapter&&typeof b.bn==='string')picked.push({...c,name:b.bn.slice(0,100)})}
 // Fall back to title search if no indexed candidates were found or the
 // candidate index is temporarily unavailable. It is not full-text coverage.
 if(!picked.length){chapters.sort((a,b)=>b.score-a.score);for(const c of chapters){if(picked.filter(x=>x.book===c.book).length<2)picked.push(c);if(picked.length===5)break}}
 const results=await Promise.allSettled(picked.map(c=>scriptureJSON('assets/hadith/data/'+c.book+'/'+c.id+'.json',mirrors)));
 let failed=indexFailed;const candidates=[];
 results.forEach((r,i)=>{const c=picked[i];if(r.status!=='fulfilled'||r.value.book!==c.book||r.value.chapter!==c.id||!Array.isArray(r.value.verses)){failed=true;return}
  const counts=new Map();for(const v of r.value.verses)counts.set(v.i,(counts.get(v.i)||0)+1);
  const indexed=c.numbers?new Set(c.numbers):null;if(indexed&&[...indexed].some(id=>counts.get(id)!==1))failed=true;
  for(const v of r.value.verses){if(indexed&&!indexed.has(v.i))continue;if(!Number.isInteger(v.i)||v.i<1||v.i>20000||counts.get(v.i)!==1||v.dup||typeof v.b!=='string'||!v.b.trim()||v.b.length>6000||/^(?:অনুবাদ পাওয়া যায়নি।?|\(\.\.\.\)|—|-)$/u.test(v.b.trim()))continue;
   const n=score(v.b,terms);if(n<terms.length||!near(v.b,terms,300))continue;
   const title=c.name+' · হাদিস '+v.i,grade=typeof v.g==='string'&&v.g.trim()?v.g.slice(0,100):'উৎসে উল্লেখ নেই';
   candidates.push({rank:c.ranks?.[v.i]||n,title,type:'hadith',book:c.book,chapter:c.id,hadith:v.i,...(mirrors?.has(BASE+'assets/hadith/data/'+c.book+'/'+c.id+'.json')?{snapshot:EAD_SNAPSHOT}:{}),text:'হাদিস: '+title+'\nবাংলা পাঠ: '+footnotes(v.b)+'\nউৎসে উল্লিখিত মান: '+grade+'। মূল তথ্য: '+(c.book==='mishkat'?'মুসলিম বাংলা':'IRD Foundation / ihadis.com')+'; Ebrahim Ead-এ প্রকাশিত। সংস্করণভেদে নম্বর ভিন্ন হতে পারে।'});
  }
 });
 const counts=new Map();for(const v of candidates){const key=v.book+':'+v.hadith;counts.set(key,(counts.get(key)||0)+1)}
 candidates.sort((a,b)=>b.rank-a.rank);return {items:candidates.filter(v=>counts.get(v.book+':'+v.hadith)===1).slice(0,3).map(({rank,...item})=>item),failed,limited:indexLimited||titleOnly};
}
// A lexical pre-filter, not proof of relevance. An identified single topic
// must still occur in the body; empty topic sets retain the previous behavior.
export function articleCandidate(text,termGroups){const t=topics(termGroups);const body=text.split('\nলেখার প্রাসঙ্গিক পাদটীকা')[0].replace(/\([^()]{0,500}\)/gu,' ');return !t.length||(score(body,t)===t.length&&near(body,t,300));}
export async function searchScripture(termGroups,mirrors){
 const terms=topics(termGroups);if(!terms.length||terms.every(group=>group.every(x=>/^\d+$/.test(x))))return {items:[],failed:false,skipped:true};
 const results=await Promise.allSettled([quran(terms,mirrors),hadith(terms,mirrors)]);
 const failedSources=results.flatMap((r,i)=>r.status==='rejected'||r.value.failed?[i===0?'quran':'hadith']:[]);
 return {items:results.flatMap(r=>r.status==='fulfilled'?r.value.items:[]),failed:failedSources.length>0,failedSources,limited:results.some(r=>r.status==='fulfilled'&&r.value.limited===true)};
}
