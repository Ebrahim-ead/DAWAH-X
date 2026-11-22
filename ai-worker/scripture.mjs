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
async function getJSON(path){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const res=await fetch(BASE+path,{signal:controller.signal,redirect:'error'});if(!res.ok)throw Error('Source unavailable');
  // Limit decoded input even when Content-Length is missing or false.
  const reader=res.body?.getReader();if(!reader)throw Error('Source unavailable');
  let size=0;const parts=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>3*1024*1024){await reader.cancel();throw Error('Source too large')}parts.push(value)}
  const bytes=new Uint8Array(size);let pos=0;for(const p of parts){bytes.set(p,pos);pos+=p.length}return JSON.parse(new TextDecoder().decode(bytes));
 }finally{clearTimeout(timer)}
}
export async function lookupScripture(ref){
 if(ref.kind==='unsupported')return null;
 if(ref.kind==='quran'){
  if(!Number.isInteger(ref.surah)||ref.surah<1||ref.surah>114||!Number.isInteger(ref.verse)||ref.verse<1||ref.verse>286)return null;
  const data=await getJSON('assets/quran/data/suras/'+ref.surah+'.json');
  if(data.n!==ref.surah||!Array.isArray(data.verses))throw Error('Invalid Quran source');
  const rows=data.verses.filter(x=>x.a===ref.verse&&typeof x.bn==='string'&&x.bn.trim());if(rows.length!==1)return null;
  const v=rows[0],title='সূরা '+String(data.bnName||data.translit||ref.surah).slice(0,100)+' · '+ref.surah+':'+ref.verse;
  if(v.bn.length>8000)return null;
  const arabic=typeof v.ar==='string'&&v.ar.trim()&&v.ar.length<=4000?'আরবি মূল:\n'+v.ar+'\n\n':'';
  const answer='নির্দিষ্ট নম্বরের অনুবাদ নিচে দেওয়া হলো; অতিরিক্ত ব্যাখ্যা বা অন্য প্রশ্নের উত্তর এখানে যাচাই করা হয়নি।\n\n'+title+' [1]\n\n'+arabic+'বাংলা অনুবাদ:\n'+v.bn+'\n\nবাংলা অনুবাদ: ড. আবূ বকর মুহাম্মাদ যাকারিয়া, রাওয়াদ ট্রান্সলেশন সেন্টার; সূত্র: QuranEnc.com (সংস্করণ ১.১.১), Ebrahim Ead সাইটে প্রকাশিত। বন্ধনীর নম্বরগুলো অনুবাদের টীকা; সম্পূর্ণ টীকা ও প্রসঙ্গ মূল পাতায় দেখুন।';
  return {answer,source:{number:1,title,type:'quran',surah:ref.surah,verse:ref.verse}};
 }
 if(ref.kind!=='hadith'||!BOOKS.some(b=>b.slug===ref.book)||!Number.isInteger(ref.number)||ref.number<1||ref.number>20000)return null;
 const idx=await getJSON('assets/hadith/data/index.json');
 const book=Array.isArray(idx.books)&&idx.books.find(b=>b.slug===ref.book);if(!book||!Array.isArray(book.chapters))throw Error('Invalid hadith index');
 const chapters=book.chapters.filter(c=>Number.isInteger(c.id)&&c.id>=0&&c.id<=200&&Number.isInteger(c.from)&&Number.isInteger(c.to)&&ref.number>=c.from&&ref.number<=c.to);
 if(!chapters.length)return null;if(chapters.length>2)throw Error('Ambiguous hadith index');
 const data=await Promise.all(chapters.map(c=>getJSON('assets/hadith/data/'+ref.book+'/'+c.id+'.json')));
 const found=[];data.forEach((d,i)=>{if(d.book!==ref.book||d.chapter!==chapters[i].id||!Array.isArray(d.verses))throw Error('Invalid hadith source');for(const v of d.verses)if(v.i===ref.number&&typeof v.b==='string'&&v.b.trim()&&!/^(?:অনুবাদ পাওয়া যায়নি।?|\(\.\.\.\)|—|-)$/.test(v.b.trim()))found.push({v,chapter:chapters[i].id})});
 // Multiple variants or numbering overlaps must not be silently conflated.
 if(found.length!==1||found[0].v.b.length>8000)return null;
 const {v,chapter}=found[0],title=String(book.bn||ref.book).slice(0,100)+' · হাদিস '+ref.number;
 const grade=typeof v.g==='string'&&v.g.trim()?'\nউৎসে উল্লিখিত মান: '+v.g.slice(0,100):'\nমান উৎসে স্পষ্ট পাওয়া যায়নি।';
 const attribution=ref.book==='mishkat'?'মুসলিম বাংলা (muslimbangla.com)':'আল-হাদিস / IRD Foundation (ihadis.com)';
 const arabic=typeof v.a==='string'&&v.a.trim()&&v.a.length<=4000?'\n\nআরবি পাঠ:\n'+v.a:'';
 const answer='নির্দিষ্ট নম্বরের বাংলা পাঠ নিচে দেওয়া হলো; অতিরিক্ত ব্যাখ্যা বা অন্য প্রশ্নের উত্তর এখানে যাচাই করা হয়নি।\n\n'+title+' [1]\n\n'+v.b+arabic+grade+'\n\nউৎস: '+attribution+'; Ebrahim Ead সাইটে প্রকাশিত। হাদিসের নম্বর প্রকাশনী ও সংস্করণভেদে ভিন্ন হতে পারে; মূল উৎসে যাচাই করুন।';
 return {answer,source:{number:1,title,type:'hadith',book:ref.book,chapter,hadith:ref.number}};
}
