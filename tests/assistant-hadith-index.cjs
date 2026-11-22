'use strict';
// Exercises the published candidate shards with synthetic chapter responses.
// The example numbers and short Bengali quotations match the Ebrahim Ead data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const {queryTerms,default:worker}=await import('../ai-worker/worker.mjs');
 const {topics,articleCandidate}=await import('../ai-worker/topic-search.mjs');
 const {findHadithCandidates}=await import('../ai-worker/hadith-index.mjs');
 const old=global.fetch,origin='https://ebrahim-ead.github.io',requests=[];
 const q='আমি শুনছি প্রত্যেক শিশুই নাকি মুসলিম হিসেবে জন্মগ্রহণ করে';
 const bad=require('../texts/c67.json')['11df79032aec67'];
 let candidates=[],calls=0,questionContext='',stale=false,modelAnswer='ফিতরাত সম্পর্কে প্রাসঙ্গিক তথ্য [1]';
 const names={bukhari:'সহীহ বুখারী',muslim:'সহীহ মুসলিম','abu-dawud':'আবু দাউদ',tirmidhi:'তিরমিজি',nasai:'নাসাঈ','ibn-majah':'ইবনে মাজাহ',mishkat:'মিশকাত'};
 global.fetch=async u=>{
  u=String(u);requests.push(u);
  if(u.includes('/hadith-search/')){const filename=u.slice(u.lastIndexOf('/')+1);return new Response(fs.readFileSync(path.join(__dirname,'..','hadith-search',filename)))}
  if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS='+JSON.stringify([[46,15,'মা সন্তানকে প্রসব করেন। '+('অন্য ঘটনা '.repeat(50))+' পরে আমি মুসলিম']])+';');
  if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:Object.entries(names).map(([slug,bn])=>({slug,bn,chapters:candidates.filter(x=>x.book===slug).map(x=>({id:x.id,bn:'পরীক্ষার অধ্যায়'}))}))});
  const hit=u.match(/\/hadith\/data\/([a-z-]+)\/(\d+)\.json$/);
  if(hit){const book=hit[1],chapter=Number(hit[2]),selected=candidates.find(c=>c.book===book&&c.id===chapter);assert(selected,'only indexed and validated chapters are fetched');
   const verses=selected.numbers.filter(i=>!(stale&&book==='bukhari'&&chapter===23&&i===1359)).map(i=>({i,dup:0,b:'অপ্রাসঙ্গিক পরীক্ষার তথ্য'}));
   const set=(id,b)=>{const v=verses.find(v=>v.i===id);if(v)v.b=b};
   if(book==='bukhari'&&chapter===23)set(1359,'প্রত্যেক নবজাতকই ফিত্‌রাতের উপর জন্মলাভ করে। অতঃপর তার পিতামাতা তাকে ইয়াহূদী, নাসারা বা মাজূসী রূপে গড়ে তোলে।');
   if(book==='muslim'&&chapter===47)set(6648,'প্রতিটি নবজাতক স্বভাবজাত ইসলাম নিয়ে জন্মলাভ করে। (সূরাহ্ আর্ রূম ৩৩:৩০)');
   return Response.json({book,chapter,verses});
  }
  if(u.endsWith('/texts/c67.json'))return Response.json({'11df79032aec67':bad});
  throw Error('Unexpected '+u);
 };
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_model,args)=>{calls++;questionContext=args.messages[1].content;return {response:modelAnswer}}}};
 const req=()=>new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:q,ids:['11df79032aec67'],history:[],lookupComplete:true,scriptureSearch:true})});
 try{
  const terms=queryTerms(q);assert.equal(topics(terms).length,3);
  assert.deepEqual(topics(queryTerms('protyek shishu muslim hisebe jonmogrohon kore')),topics(terms),'common Banglish form must preserve the same topic groups');
  assert(!topics(queryTerms('মাগরিব কখন হয়')).some(g=>g.includes('মাতাপিতা')),'short মা must not turn unrelated words into a parent topic');
  assert.equal(articleCandidate(bad.h,terms),false,'a collection name inside a citation is not evidence about a child’s faith');
  assert.equal(articleCandidate('শিশুর জন্ম হয়েছে। '+('অন্য ঘটনা '.repeat(50))+'সে মুসলিম হয়েছে',terms),false,'distant topic words alone must not make an unrelated article relevant');
  candidates=await findHadithCandidates(topics(terms));
  assert(candidates.some(c=>c.book==='bukhari'&&c.id===23&&c.numbers.includes(1359)));
  assert(candidates.some(c=>c.book==='muslim'&&c.id===47&&c.numbers.includes(6648)));
  let r=await worker.fetch(req(),env),data=await r.json();assert.equal(r.status,200);assert.equal(data.grounded,true);assert.match(questionContext,/হাদিস 1359/);assert.match(questionContext,/হাদিস 6648/);assert(!questionContext.includes('শয়তান স্পর্শ করে'), 'unrelated article must not become answer evidence');assert.equal(data.sources[0].type,'hadith');
  modelAnswer='সহীহ মুসলিম, হাদিস ৬৬৪৮ [1]';r=await worker.fetch(req(),env);data=await r.json();assert.equal(data.grounded,true,'matching hadith number and source accepted');
  modelAnswer='সহীহ মুসলিম, হাদিস ৬৬৪৯ [1]';r=await worker.fetch(req(),env);data=await r.json();assert.equal(data.grounded,false,'a fabricated hadith number must be rejected');
  modelAnswer='সূরা রূম ৩৩:৩০ [1]';r=await worker.fetch(req(),env);data=await r.json();assert.equal(data.grounded,false,'unverified verse numbers inside hadith are not promoted as Quran citations');
  modelAnswer='সূরা রূম ৩৩ আয়াত ৩০ [1]';r=await worker.fetch(req(),env);data=await r.json();assert.equal(data.grounded,false,'named numeric Quran references must also be checked');
  stale=true;modelAnswer='পরীক্ষিত [1]';r=await worker.fetch(req(),env);data=await r.json();assert.equal(data.partial,true,'a missing indexed record must be reported');assert(!questionContext.includes('হাদিস 1359'), 'stale candidates are not evidence');
  assert(calls>=2);assert(!requests.some(u=>!u.startsWith('https://ebrahim-ead.github.io/')));
  console.log('hadith full-text index: screenshot question, reference verification and unrelated article filtering pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
