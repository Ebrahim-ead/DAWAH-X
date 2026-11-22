#!/usr/bin/env node
'use strict';
// Rebuild candidate-only postings from a locally downloaded, pinned Ebrahim Ead
// assets/hadith/data directory. Full texts are NOT copied into this project.
const fs=require('node:fs'),path=require('node:path');
const input=process.argv[2],commit=process.argv[3];
if(!input||!/^[a-f0-9]{40}$/.test(commit||'')){console.error('Usage: node tools/build-hadith-search.cjs <ead-hadith-data-dir> <upstream-commit-sha>');process.exit(1)}
(async()=>{
 const {fold}=await import('../ai-worker/topic-search.mjs');
 const idx=JSON.parse(fs.readFileSync(path.join(input,'index.json'),'utf8'));
 const allowed=['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat'],books=allowed,docs=[],posts=new Map();
 function shard(k){let h=0x811c9dc5;for(let i=0;i<k.length;i++){h^=k.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0)%32}
 for(const [bi,slug] of books.entries()){
  const b=idx.books.find(x=>x.slug===slug);if(!b||!Array.isArray(b.chapters))throw Error('Missing book '+slug);
  for(const c of b.chapters){const data=JSON.parse(fs.readFileSync(path.join(input,slug,c.id+'.json'),'utf8'));if(data.book!==slug||data.chapter!==c.id||!Array.isArray(data.verses))throw Error('Invalid chapter '+slug+':'+c.id);
   const counts=new Map();for(const v of data.verses)counts.set(v.i,(counts.get(v.i)||0)+1);
   for(const v of data.verses){if(!Number.isInteger(v.i)||v.i<1||v.i>20000||v.dup||counts.get(v.i)!==1||typeof v.b!=='string'||!v.b.trim()||v.b.length>6000||/^(?:অনুবাদ পাওয়া যায়নি।?|\(\.\.\.\)|—|-)$/u.test(v.b.trim()))continue;
    const id=docs.length;docs.push([bi,c.id,v.i]);const tokens=fold(v.b).match(/[\p{L}\p{M}\p{N}]+/gu)||[];
    for(const key of new Set(tokens.filter(t=>[...t].length>=4&&!/^\d+$/.test(t)).map(t=>t.slice(0,4)))){let a=posts.get(key);if(!a)posts.set(key,a=[]);a.push(id)}
   }
  }
 }
 function encode(ids){const bytes=[];let prev=0;for(let i=0;i<ids.length;i++){let n=i?ids[i]-prev:ids[i];prev=ids[i];do{let byte=n&127;n>>>=7;bytes.push(byte|(n?128:0))}while(n)}return Buffer.from(bytes).toString('base64')}
 const shards=Array.from({length:32},()=>({}));for(const [key,ids] of [...posts].sort((a,b)=>a[0].localeCompare(b[0],'en')))shards[shard(key)][key]=encode(ids);
 const out=path.join(__dirname,'..','hadith-search');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify({version:1,source:commit,books,docs,shards:32})+'\n');
 shards.forEach((data,i)=>fs.writeFileSync(path.join(out,String(i).padStart(2,'0')+'.json'),JSON.stringify(data)+'\n'));
 console.log(`Indexed ${docs.length} unambiguous records, ${posts.size} prefixes, 32 shards; source ${commit}`);
})().catch(e=>{console.error(e);process.exitCode=1});
