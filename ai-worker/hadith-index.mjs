import {sourceText} from './source-fetch.mjs';
// Compact, candidate-only inverted index. This index does not supply religious
// text or citations: all matches must be reloaded and validated at the source.
const SITE='https://ebrahim-ead.github.io/DAWAH-X/hadith-search/';
const BOOKS=['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat'];
const cache=new Map(),TTL=30*60*1000;
function shard(k){let h=0x811c9dc5;for(let i=0;i<k.length;i++){h^=k.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0)%32}
async function load(file){
 const old=cache.get(file);if(old&&old.until>Date.now())return old.value;
 const data=JSON.parse(await sourceText(SITE+file,2*1024*1024));
 cache.set(file,{value:data,until:Date.now()+TTL});return data;
}
function decode(s,max){
 if(typeof s!=='string'||s.length>1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('Invalid postings');
 const bytes=atob(s),out=[];let value=0,shift=0,prev=0;
 for(let i=0;i<bytes.length;i++){const c=bytes.charCodeAt(i);value+=(c&127)*2**shift;if(c&128){shift+=7;if(shift>28)throw Error('Invalid postings')}else{const id=prev+value;if(!Number.isSafeInteger(id)||id<0||id>=max||(out.length&&id<=prev))throw Error('Invalid postings');out.push(id);prev=id;value=0;shift=0}}
 if(shift)throw Error('Invalid postings');return out;
}
export async function findHadithCandidates(terms){
 const groups=terms.filter(g=>!g.numeric&&g.every(x=>[...x].length>=4&&!/^\d+$/.test(x))).map(g=>[...new Set(g.map(x=>x.slice(0,4)))]);
 if(!groups.length)return Object.assign([],{limited:true});
 const shardIds=[...new Set(groups.flat().map(shard))];if(shardIds.length>24)return Object.assign([],{limited:true});
 // Limit simultaneous streaming responses in Workers; other source categories
 // can be using connections at the same time. Failed batches still fail closed.
 const meta=await load('meta.json'),parts=[];
 for(let i=0;i<shardIds.length;i+=2)parts.push(...await Promise.all(shardIds.slice(i,i+2).map(n=>load(String(n).padStart(2,'0')+'.json'))));
 if(!meta||meta.version!==1||meta.shards!==32||!Array.isArray(meta.books)||meta.books.length!==BOOKS.length||meta.books.some((b,i)=>b!==BOOKS[i])||!Array.isArray(meta.docs)||meta.docs.length>100000||!meta.docs.length)throw Error('Invalid hadith search metadata');
 const shards=new Map(shardIds.map((n,i)=>[n,parts[i]]));
 // Within each concept, prefer the rarer matching form. This promotes, for
 // example, "ফিতরাত" over generic mentions of "ইসলাম" without treating the
 // index or a high score as proof that a narration answers the question.
 const matches=groups.map(group=>{const found=new Map();for(const key of group){const data=shards.get(shard(key));if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid hadith search shard');if(!Object.hasOwn(data,key))continue;const ids=decode(data[key],meta.docs.length),weight=Math.log(1+meta.docs.length/(1+ids.length));for(const id of ids)found.set(id,Math.max(found.get(id)||0,weight))}return found});
 matches.sort((a,b)=>a.size-b.size);if(!matches[0]?.size)return [];
 const ids=[...matches[0].keys()].filter(id=>matches.every(s=>s.has(id)));
 const chapters=new Map();for(const id of ids){const row=meta.docs[id];if(!Array.isArray(row)||row.length!==3||!Number.isInteger(row[0])||row[0]<0||row[0]>=BOOKS.length||!Number.isInteger(row[1])||row[1]<0||row[1]>200||!Number.isInteger(row[2])||row[2]<1||row[2]>20000)throw Error('Invalid hadith search record');const key=BOOKS[row[0]]+':'+row[1],rank=matches.reduce((n,m)=>n+m.get(id),0);let c=chapters.get(key);if(!c)chapters.set(key,c={book:BOOKS[row[0]],id:row[1],numbers:[],ranks:{},rank:0});c.numbers.push(row[2]);c.ranks[row[2]]=rank;c.rank=Math.max(c.rank,rank)}
 // Round-robin books so a common word does not use every slot on one book.
 const out=[],lists=BOOKS.map(book=>[...chapters.values()].filter(c=>c.book===book).sort((a,b)=>b.rank-a.rank||a.id-b.id));
 for(let i=0;out.length<8&&lists.some(a=>i<a.length);i++)for(const list of lists){if(list[i])out.push(list[i]);if(out.length===8)break}
 return out;
}
