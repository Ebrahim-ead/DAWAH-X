import locator from './local-hadith-locator.mjs';
import {sourceBytes,SITE_SNAPSHOT} from './source-fetch.mjs';
const SITE='https://ebrahim-ead.github.io/DAWAH-X/';
const MAX=8*1024*1024;
async function decode(bytes){
 if(bytes[0]!==0x1f||bytes[1]!==0x8b){if(bytes.length>MAX)throw Error('Hadith data too large');return bytes}
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX){await reader.cancel();throw Error('Hadith data too large')}parts.push(value)}}finally{reader.releaseLock()}
 const result=new Uint8Array(size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.byteLength}return result;
}
export async function lookupLocalHadith(ref,mirrors){
 const book=Object.hasOwn(locator,ref.book)?locator[ref.book]:null;
 if(!book||!Number.isInteger(ref.number)||ref.number<1||ref.number>20000)return null;
 const position=book.entries[ref.number];if(!position)return null;
 const [chapter,readerIndex]=position,path=`scripture-hadith-${ref.book}-${chapter}.json.gz`,url=SITE+path;
 const bytes=await sourceBytes(url,3*1024*1024,mirrors),rows=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await decode(bytes)));
 if(!Array.isArray(rows)||rows.some(r=>!Array.isArray(r)||r.length!==8))throw Error('Invalid hadith section');
 const found=rows.filter(r=>r[0]===readerIndex&&r[1]===ref.number);
 if(found.length!==1)throw Error('Hadith locator out of date');
 const row=found[0];if(typeof row[3]!=='string'||!row[3].trim()||/^(?:অনুবাদ পাওয়া যায়নি।?|\(\.\.\.\)|—|-)$/u.test(row[3].trim())||row[3].length>8000)return null;
 const title=book.title+' · হাদিস '+ref.number;
 const grade=typeof row[7]==='string'&&row[7].trim()?'\nউৎসে উল্লিখিত মান: '+row[7].slice(0,100):'\nমান উৎসে স্পষ্ট পাওয়া যায়নি।';
 const arabic=typeof row[4]==='string'&&row[4].trim()&&row[4].length<=4000?'\n\nআরবি পাঠ:\n'+row[4]:'';
 const attribution='বাংলা অনুবাদের মূল উৎস hadithbd.com; fawazahmed0/hadith-api-ভিত্তিক সংগ্রহ DAWAH X-এ প্রকাশিত।';
 const answer='নির্দিষ্ট নম্বরের বাংলা পাঠ নিচে দেওয়া হলো; অতিরিক্ত ব্যাখ্যা বা অন্য প্রশ্নের উত্তর এখানে যাচাই করা হয়নি।\n\n'+title+' [1]\n\n'+row[3]+arabic+grade+'\n\n'+attribution+' হাদিসের নম্বর প্রকাশনী ও সংস্করণভেদে ভিন্ন হতে পারে; মূল উৎসে যাচাই করুন।';
 const evidence='হাদিস: '+title+'\nবাংলা পাঠ: '+row[3].replace(/\[\s*([0-9০-৯]+)\s*\]/g,'(অনুবাদের টীকা $1)')+arabic+grade+'\n'+attribution+' সংস্করণভেদে নম্বর ভিন্ন হতে পারে।';
 return {answer,evidence,source:{number:1,title,type:'hadith',book:ref.book,chapter,hadith:ref.number,origin:'dawahx',readerIndex,...(mirrors?.has(url)?{snapshot:SITE_SNAPSHOT}:{})}};
}
