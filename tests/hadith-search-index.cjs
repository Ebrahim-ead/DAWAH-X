'use strict';
// Validate the checked-in candidate index, including every bounded posting.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'..','hadith-search'),meta=JSON.parse(fs.readFileSync(path.join(dir,'meta.json')));
assert.equal(meta.version,1);assert.equal(meta.shards,32);assert.match(meta.source,/^[a-f0-9]{40}$/);assert.deepEqual(meta.books,['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat']);assert(meta.docs.length>1000&&meta.docs.length<100000);
const unique=new Set();for(const row of meta.docs){assert(Array.isArray(row)&&row.length===3);assert(Number.isInteger(row[0])&&row[0]>=0&&row[0]<7);assert(Number.isInteger(row[1])&&row[1]>=0&&row[1]<=200);assert(Number.isInteger(row[2])&&row[2]>0&&row[2]<=20000);const key=row.join(':');assert(!unique.has(key),'duplicate candidate identity '+key);unique.add(key)}
function shard(k){let h=0x811c9dc5;for(let i=0;i<k.length;i++){h^=k.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0)%32}
let keys=0,postings=0;for(let part=0;part<32;part++){
 const o=JSON.parse(fs.readFileSync(path.join(dir,String(part).padStart(2,'0')+'.json')));
 for(const [key,base64] of Object.entries(o)){
  keys++;assert.equal(key.length,4);assert.equal(shard(key),part);assert.match(base64,/^[A-Za-z0-9+/]*={0,2}$/);
  const buf=Buffer.from(base64,'base64');let value=0,shift=0,prev=0,count=0;
  for(const byte of buf){value+=(byte&127)*2**shift;if(byte&128){shift+=7;assert(shift<=28)}else{const id=prev+value;assert(id>=0&&id<meta.docs.length&&(!count||id>prev));prev=id;value=0;shift=0;count++;postings++}}
  assert.equal(shift,0);assert(count>0);
 }
}
assert(keys>1000&&postings>meta.docs.length);assert(unique.has('0:23:1359'));console.log(`hadith search index: ${meta.docs.length} records, ${keys} prefixes, ${postings} validated postings`);
