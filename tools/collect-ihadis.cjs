#!/usr/bin/env node
'use strict';
// Collect only ordinary public HTML pages with a fixed delay; stop on any
// anti-bot, HTTP or parsing failure. User has confirmed publication rights.
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const x=require('./ihadis-extract.cjs');
const books=process.argv.slice(2);
if(!books.length || books.some(s=>! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s))) throw Error('Supply one or more valid iHadis book slugs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function get(path){
 await wait(1000);const response=await fetch('https://ihadis.com'+path,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'DAWAHX-HadithImporter/1.0 (contact: https://ebrahim-ead.github.io/DAWAH-X/contact.html)'}});
 if(!response.ok)throw Error('HTTP '+response.status+' '+path);const text=await response.text();if(text.length>12_000_000||text.length<5000||/Just a moment\.\.\.|cf-chl-/i.test(text))throw Error('Unusable page '+path);return text;
}
(async()=>{let report=JSON.parse(fs.readFileSync('tools/ihadis-collection-report.json')); report=report.filter(r=>!books.includes(r.slug));
 for(const slug of books){try{
  let html=await get('/'+slug),meta=x.index(html,slug),sections=[],ids=new Set();
  for(const ch of meta.chapters){html=await get('/'+slug+'/'+ch.id);let data=x.chapter(html,slug,ch.id);const rows=new Map(data.rows.map(r=>[r.id,r]));
   for(const id of data.missing){if(rows.has(id))throw Error('Duplicate internal id '+id);const raw=await get('/'+slug+'/hadith/'+id);rows.set(id,x.single(raw,slug,id));}
   const ordered=[...rows.values()].sort((a,b)=>a.id-b.id);for(const row of ordered){if(ids.has(row.id))throw Error('Repeated identity '+row.id);ids.add(row.id)}
   sections.push({id:ch.id,name:ch.name,chapterSha256:data.sha256,rows:ordered});
  }
  if(ids.size!==meta.expected)throw Error('Record count mismatch '+slug+' '+ids.size+'/'+meta.expected);
  const snapshot={source:'https://ihadis.com/'+slug,extractedAt:new Date().toISOString(),meta,sections};const buffer=Buffer.from(JSON.stringify(snapshot));
  fs.writeFileSync('tools/ihadis-'+slug+'-snapshot.json.gz',zlib.gzipSync(buffer,{level:9,mtime:0}));report.push({slug,status:'complete',count:ids.size,chapters:sections.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex')});
 }catch(e){report.push({slug,status:'failed',error:String(e)});if(/HTTP (?:403|429)|Unusable page|fetch failed|TimeoutError/.test(String(e))) break}}
 fs.writeFileSync('tools/ihadis-collection-report.json',JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
