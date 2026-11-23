import {sourceText,EAD_SNAPSHOT} from './source-fetch.mjs';
// Direct numbered lookups use only the user's own Ebrahim Ead site. No URL or
// text supplied by the browser is fetched, and no model supplies a reference.
const BASE='https://ebrahim-ead.github.io/ead/';
const BOOKS=[
 {slug:'bukhari',match:/(?:বুখার[ীি]|বুখারী|bukhari)/iu},
 {slug:'muslim',match:/(?:মুসলিম|muslim)/iu},
 {slug:'abu-dawud',match:/(?:আব[ুূ]\s*দা[উঊুূদদ্‌]+|abu[ -]?daw(?:u|o)d)/iu},
 {slug:'tirmidhi',match:/(?:তিরমি[জয][ীি]|তিরমিজি|tirmidhi)/iu},
 {slug:'nasai',match:/(?:নাসা[ঈইিী]|নাসাঈ|nasai)/iu},
 {slug:'ibn-majah',match:/(?:ইবন[ুে]?\s*মাজা[হহ্]?|ibn[ -]?majah)/iu},
 {slug:'mishkat',match:/(?:মিশকাত|mishkat)/iu}
];
const digits=s=>String(s).replace(/[০-৯]/g,c=>String(c.charCodeAt(0)-0x09e6));

// Detect common book-first references in generated prose. This conservative
// check is not a complete parser for every edition or citation notation.
export function hadithMentions(message){
 const q=digits(String(message).normalize('NFC')),out=[];
 for(const book of BOOKS){
  const re=new RegExp(book.match.source+'[\\s,،:：()–-]*(?:(?:হাদিস|হাদীস|হাদীছ|হাদীথ|হা|hadith)\\s*[:ঃ/.-]?\\s*)?(?:(?:নং|নম্বর|নাম্বার|number|no\\.?)\\s*[:ঃ/.-]?\\s*)?(\\d{1,5})(?!\\d)','giu');
  for(const m of q.matchAll(re))out.push({book:book.slug,number:Number(m[1])});
 }
 return out;
}

// Ranges and multiple references are rejected rather than silently showing a
// single verse/hadith as an answer to a request for several.
export function parseScripture(message){
 const q=digits(message.normalize('NFC'));
 const hasQuran=/(?:কুরআন|কোরআন|কোরান|কুরান|সূরা|সুরা|আয়াত|আয়াত|আযাত|quran|surah|ayah|verse)/iu.test(q);
 const pairs=[...q.matchAll(/(?<!\d)(\d{1,3})\s*[:/]\s*(\d{1,3})(?!\d)/g)];
 const separate=hasQuran?[...q.matchAll(/(?:সূরা|সুরা|surah)\s*(\d{1,3})\s*(?:নং|নম্বর|number)?\s*[,;:–-]?\s*(?:এর\s*)?(?:আয়াত|আয়াত|আযাত|ayah|verse)\s*(\d{1,3})(?!\d)/giu)]:[];
 const hits=BOOKS.flatMap(b=>[...q.matchAll(new RegExp(b.match.source+'\\s*(?:(?:হাদিস|হাদীস|হাদীছ|hadith)\\s*)?(?:(?:নং|নম্বর|নাম্বার|number|no\\.?)\\s*[:：]?\\s*)?(\\d{1,5})(?!\\d)', 'giu'))].map(m=>({book:b.slug,number:Number(m[1]),index:m.index,end:m.index+m[0].length})));
 const qhits=hasQuran?[...pairs,...separate]:[];
 if(!qhits.length&&!hits.length)return null;
 if(qhits.length+hits.length!==1)return {kind:'unsupported'};
 const match=qhits[0];
 if(match){
  // A separately stated surah name is not assumed to match its number. Until
  // aliases can be verified reliably, ask for a purely numeric reference.
  const before=q.slice(0,match.index);
  const named=before.match(/(?:সূরা|সুরা|surah)\s+([^\d:]+?)\s*$/iu);
  if(named&&!/^(?:নম্বর|নং|number)$/iu.test(named[1].trim()))return {kind:'unsupported'};
  const tail=q.slice(match.index+match[0].length);
  if(/^\s*(?:[-–—,،]|থেকে|পর্যন্ত)\s*(?:\d|আয়াত|আয়াত)/u.test(tail))return {kind:'unsupported'};
  return {kind:'quran',surah:Number(match[1]),verse:Number(match[2])};
 }
 const h=hits[0],tail=q.slice(h.end);
 if(/^\s*(?:[:/\-–—,،]|থেকে|পর্যন্ত)\s*\d/u.test(tail))return {kind:'unsupported'};
 return {kind:'hadith',book:h.book,number:h.number};
}
// Only pure requests for a single text bypass the model. Any extra condition,
// interpretation or second question must be handled with that text as evidence.
export function isPlainScriptureRequest(message,ref){
 if(!ref||ref.kind==='unsupported'||ref.kind==='surah')return true;
 const words=digits(String(message).normalize('NFC')).toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu)||[];
 const allowed=new Set('কুরআন কুরআনের কোরআন কোরআনের কোরান কুরান সূরা সুরা সূরার সুরার আয়াত আয়াত আয়াতটি আয়াতটি আয়াতের আয়াতের আযাত নম্বর নাম্বার নং এর হাদিস হাদীস হাদীছ হাদীথ হাদিসটি হাদীসটি বুখারী বুখারি মুসলিম সহিহ সহীহ সহীহ্ আবু আবূ দাউদ দাঊদ তিরমিজি তিরমিযী তিরমিজী নাসাঈ নাসাই ইবনে ইবনু মাজাহ মিশকাত পাঠ বাংলা অনুবাদ পড়ুন পড়ুন পড়ি পড়তে পড়তে দেখাও দেখান দেখুন দিন দাও বলুন বলো বলবেন বলবেন জানাবেন জানতে চাই করুন করে এরটি quran koran surah sura ayah ayat verse verses bukhari muslim abu dawud dawod tirmidhi nasai ibn majah mishkat hadith no number bangla bengali translation text show give read me please of the'.split(' '));
 const numbers=words.filter(w=>/^\d+$/.test(w));
 if(numbers.length!==(ref.kind==='quran'?2:1))return false;
 // Mentions of another source can be a request for additional evidence.
 if(ref.kind==='quran'&&words.some(w=>/^(?:হাদিস|হাদীস|হাদীছ|হাদীথ|hadith|বুখারী|বুখারি|bukhari|মুসলিম|muslim)$/.test(w)))return false;
 if(ref.kind==='hadith'&&words.some(w=>/^(?:কুরআন|কুরআনের|কোরআন|কোরআনের|কোরান|কুরান|quran|koran|সূরা|সুরা|surah|sura|আয়াত|আয়াত|ayah|verse)$/.test(w)))return false;
 return words.length>0&&words.every(w=>/^\d{1,5}$/.test(w)||allowed.has(w));
}
function notesAsText(text){return String(text).replace(/\[\s*([0-9০-৯]+)\s*\]/g,'(অনুবাদের টীকা $1)');}

// Simple factual chapter-metadata questions, including common Banglish forms.
// A closed vocabulary prevents a question about a chapter's meaning or a
// particular verse from being silently answered as if it only asked its name.
export function parseSurah(message){
 const normalized=digits(String(message).normalize('NFC')).toLowerCase();
 if(/\d\s*[:/\-–—]\s*\d/.test(normalized))return null;
 const words=normalized.match(/[\p{L}\p{M}\p{N}]+/gu)||[];
 if(!words.some(w=>/^(?:সূরা|সুরা|সূরার|সুরার|surah|sura|surah?r)$/.test(w)))return null;
 const ordinals={'প্রথম':1,'দ্বিতীয়':2,'দ্বিতীয়':2,'তৃতীয়':3,'তৃতীয়':3,'চতুর্থ':4,'পঞ্চম':5,first:1,second:2,third:3,fourth:4,fifth:5};
 const allowed=new Set('কুরআন কুরআনের কোরআন কোরআনের কুরানের কোরানের সূরা সুরা সূরার সুরার এর নম্বর নাম্বার নং তম নাম নামটি কী কি কোন কোনটি কোনটা কত কয়টি কয়টি কয়টি আয়াত আয়াত আয়াতের আয়াতের সংখ্যা আছে বলুন বলো বলবেন জানাবেন জানতে চাই please quran quraner koran koraner surah sura er number num no name named ki konti konta koto koyti ayat ayah ayahs verse verses many how what which is the of in tell me please th st nd rd'.split(' '));
 const numbers=[];for(const w of words){if(/^\d{1,3}(?:st|nd|rd|th|তম)?$/.test(w))numbers.push(Number(w.match(/^\d+/)[0]));else if(Object.hasOwn(ordinals,w))numbers.push(ordinals[w]);else if(!allowed.has(w))return null}
 if(numbers.length!==1)return null;
 // If the user mentions a verse, only count questions are chapter metadata.
 if(words.some(w=>/^(?:আয়াত|আয়াত|আয়াতের|আয়াতের|ayat|ayah|ayahs|verse|verses)$/.test(w))&&!words.some(w=>/^(?:কত|কয়টি|কয়টি|সংখ্যা|koto|koyti|many)$/.test(w)))return null;
 if(!words.some(w=>/^(?:কী|কি|কোন|কোনটি|কোনটা|নাম|নামটি|কত|কয়টি|কয়টি|সংখ্যা|ki|what|which|name|koto|koyti|many|বলুন|বলো|বলবেন|জানাবেন)$/.test(w)))return null;
 return {kind:'surah',surah:numbers[0]};
}
export async function scriptureJSON(path,mirrors){
 return JSON.parse(await sourceText(BASE+path,3*1024*1024,mirrors));
}
export async function lookupScripture(ref,mirrors){
 if(ref.kind==='unsupported')return null;
 if(ref.kind==='surah'){
  if(!Number.isInteger(ref.surah)||ref.surah<1||ref.surah>114)return null;
  const index=await scriptureJSON('assets/quran/data/index.json',mirrors);
  if(!Array.isArray(index.suras))throw Error('Invalid Quran index');
  const rows=index.suras.filter(row=>row.n===ref.surah);
  if(rows.length!==1)throw Error('Invalid Quran index');
  const row=rows[0];
  if(typeof row.bn!=='string'||!row.bn.trim()||row.bn.length>100||!Number.isInteger(row.count)||row.count<1||row.count>286||!['makki','madani'].includes(row.type))throw Error('Invalid Quran metadata');
  const title='সূরা '+row.bn+' · সূরা নম্বর '+ref.surah;
  const answer='কুরআনের '+ref.surah+' নম্বর সূরা হলো '+row.bn+'। [1]\n\nএই সূরায় '+row.count+'টি আয়াত আছে; উৎসের তালিকা অনুযায়ী এটি '+(row.type==='makki'?'মাক্কী':'মাদানী')+' সূরা।';
  return {answer,source:{number:1,title,type:'quran-surah',surah:ref.surah,...(mirrors?.has(BASE+'assets/quran/data/index.json')?{snapshot:EAD_SNAPSHOT}:{})}};
 }
 if(ref.kind==='quran'){
  if(!Number.isInteger(ref.surah)||ref.surah<1||ref.surah>114||!Number.isInteger(ref.verse)||ref.verse<1||ref.verse>286)return null;
  const data=await scriptureJSON('assets/quran/data/suras/'+ref.surah+'.json',mirrors);
  if(data.n!==ref.surah||!Array.isArray(data.verses))throw Error('Invalid Quran source');
  const rows=data.verses.filter(x=>x.a===ref.verse&&typeof x.bn==='string'&&x.bn.trim());if(rows.length!==1)return null;
  const v=rows[0],title='সূরা '+String(data.bnName||data.translit||ref.surah).slice(0,100)+' · '+ref.surah+':'+ref.verse;
  if(v.bn.length>8000)return null;
  const arabic=typeof v.ar==='string'&&v.ar.trim()&&v.ar.length<=4000?'আরবি মূল:\n'+v.ar+'\n\n':'';
  const answer='নির্দিষ্ট নম্বরের অনুবাদ নিচে দেওয়া হলো; অতিরিক্ত ব্যাখ্যা বা অন্য প্রশ্নের উত্তর এখানে যাচাই করা হয়নি।\n\n'+title+' [1]\n\n'+arabic+'বাংলা অনুবাদ:\n'+v.bn+'\n\nবাংলা অনুবাদ: ড. আবূ বকর মুহাম্মাদ যাকারিয়া, রাওয়াদ ট্রান্সলেশন সেন্টার; সূত্র: QuranEnc.com (সংস্করণ ১.১.১), Ebrahim Ead সাইটে প্রকাশিত। বন্ধনীর নম্বরগুলো অনুবাদের টীকা; সম্পূর্ণ টীকা ও প্রসঙ্গ মূল পাতায় দেখুন।';
  return {answer,evidence:'কুরআনের আয়াত: '+title+'\nবাংলা অনুবাদ: '+notesAsText(v.bn)+(arabic?'\n'+arabic.trim():'')+'\nঅনুবাদক ড. আবূ বকর মুহাম্মাদ যাকারিয়া; রাওয়াদ ট্রান্সলেশন সেন্টার, QuranEnc.com সংস্করণ ১.১.১। মূল পাতায় টীকা ও প্রসঙ্গ দেখুন।',source:{number:1,title,type:'quran',surah:ref.surah,verse:ref.verse,...(mirrors?.has(BASE+'assets/quran/data/suras/'+ref.surah+'.json')?{snapshot:EAD_SNAPSHOT}:{})}};
 }
 if(ref.kind!=='hadith'||!BOOKS.some(b=>b.slug===ref.book)||!Number.isInteger(ref.number)||ref.number<1||ref.number>20000)return null;
 const idx=await scriptureJSON('assets/hadith/data/index.json',mirrors);
 const book=Array.isArray(idx.books)&&idx.books.find(b=>b.slug===ref.book);if(!book||!Array.isArray(book.chapters))throw Error('Invalid hadith index');
 const chapters=book.chapters.filter(c=>Number.isInteger(c.id)&&c.id>=0&&c.id<=200&&Number.isInteger(c.from)&&Number.isInteger(c.to)&&ref.number>=c.from&&ref.number<=c.to);
 if(!chapters.length)return null;if(chapters.length>2)throw Error('Ambiguous hadith index');
 const data=await Promise.all(chapters.map(c=>scriptureJSON('assets/hadith/data/'+ref.book+'/'+c.id+'.json',mirrors)));
 const found=[];data.forEach((d,i)=>{if(d.book!==ref.book||d.chapter!==chapters[i].id||!Array.isArray(d.verses))throw Error('Invalid hadith source');for(const v of d.verses)if(v.i===ref.number&&typeof v.b==='string'&&v.b.trim()&&!/^(?:অনুবাদ পাওয়া যায়নি।?|\(\.\.\.\)|—|-)$/.test(v.b.trim()))found.push({v,chapter:chapters[i].id})});
 // Multiple variants or numbering overlaps must not be silently conflated.
 if(found.length!==1||found[0].v.b.length>8000)return null;
 const {v,chapter}=found[0],title=String(book.bn||ref.book).slice(0,100)+' · হাদিস '+ref.number;
 const grade=typeof v.g==='string'&&v.g.trim()?'\nউৎসে উল্লিখিত মান: '+v.g.slice(0,100):'\nমান উৎসে স্পষ্ট পাওয়া যায়নি।';
 const attribution=ref.book==='mishkat'?'মুসলিম বাংলা (muslimbangla.com)':'আল-হাদিস / IRD Foundation (ihadis.com)';
 const arabic=typeof v.a==='string'&&v.a.trim()&&v.a.length<=4000?'\n\nআরবি পাঠ:\n'+v.a:'';
 const answer='নির্দিষ্ট নম্বরের বাংলা পাঠ নিচে দেওয়া হলো; অতিরিক্ত ব্যাখ্যা বা অন্য প্রশ্নের উত্তর এখানে যাচাই করা হয়নি।\n\n'+title+' [1]\n\n'+v.b+arabic+grade+'\n\nউৎস: '+attribution+'; Ebrahim Ead সাইটে প্রকাশিত। হাদিসের নম্বর প্রকাশনী ও সংস্করণভেদে ভিন্ন হতে পারে; মূল উৎসে যাচাই করুন।';
 return {answer,evidence:'হাদিস: '+title+'\nবাংলা পাঠ: '+notesAsText(v.b)+arabic+grade+'\nমূল তথ্য: '+attribution+'; Ebrahim Ead-এ প্রকাশিত। সংস্করণভেদে নম্বর ভিন্ন হতে পারে।',source:{number:1,title,type:'hadith',book:ref.book,chapter,hadith:ref.number,...(mirrors?.has(BASE+'assets/hadith/data/'+ref.book+'/'+chapter+'.json')?{snapshot:EAD_SNAPSHOT}:{})}};
}
