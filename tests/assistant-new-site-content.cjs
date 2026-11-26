'use strict';
// Actual shipped site pages, mocked model/upstream scripture. Tests evidence
// selection and outage handling, not semantic correctness of generated text.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const {sitePageMatches,default:worker}=await import('../ai-worker/worker.mjs');
 const samples=[
  ['আপনাদের ওয়েবসাইটে কুরআনের ইংরেজি অনুবাদ আছে কি?','index.html'],
  ['DAWAH X সাইটে কয়টি হাদিসের গ্রন্থ আছে?','index.html'],
  ['তোমাদের সাইটে নতুন কী কী বিভাগ আছে?','index.html'],
  ['ওয়েবসাইটে নাস্তিকতা বিষয়ে লেখা কোথায়?','questions.html'],
  ['সাইটের ইসলামিক প্রশ্নোত্তর বিভাগে কী আছে?','fatwa.html'],
  ['তোমাদের ফতোয়া বিভাগটি কোথায়?','fatwa.html'],
  ['আপনাদের ওয়েবসাইটে যোগাযোগের উপায় কী?','contact.html'],
  ['DAWAH X সাইটের তথ্যসূত্র নীতি কী?','policy.html'],
  ['আপনাদের সেবাগুলো কী?','services.html'],
  ['ইসলামিক বই বিভাগে কয়টি সংগ্রহ আছে?','islamic-books.html'],
  ['ওয়েবসাইটে তাফসীরের বই আছে কি?','islamic-books.html'],
  ['DAWAH X কে পরিচালনা করেন?','about.html']
 ];
 for(const [q,page] of samples)assert(sitePageMatches(q).includes(page),q);
 assert.deepEqual(sitePageMatches('কুরআনের ইংরেজি অনুবাদ কী?'),[],'do not infer site context from scripture alone');
 assert.deepEqual(sitePageMatches('জ্বর হলে কী করব?'),[]);
 assert(sitePageMatches('আপনাদের সাইটের উৎস যোগাযোগ সেবা নাস্তিকতা ফতোয়া কুরআন').length<=4,'bounded page requests');
 const root=path.resolve(__dirname,'..'),old=global.fetch,origin='https://ebrahim-ead.github.io';let prompt='',broken=false,paths=[];
 global.fetch=async u=>{const url=String(u);paths.push(url);
  if(url.endsWith('/islamic-books-catalog.js')){if(broken)return new Response('',{status:503});return new Response(fs.readFileSync(path.join(root,'islamic-books-catalog.js'),'utf8'))}
  if(url.includes('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,\"পরীক্ষার তথ্য\"]];');
  if(url.includes('/assets/hadith/data/index.json'))return Response.json({books:[]});
  const m=url.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(index|questions|fatwa|about|services|contact|policy)\.html$/);
  if(m){if(broken)return new Response('',{status:503});return new Response(fs.readFileSync(path.join(root,m[1]+'.html'),'utf8'))}
  if(url.startsWith('https://raw.githubusercontent.com/'))return new Response('',{status:503});
  if(url.includes('/hadith-search/meta.json'))return Response.json(JSON.parse(fs.readFileSync(path.join(root,'hadith-search/meta.json'),'utf8')));
  const shard=url.match(/\/hadith-search\/(\d\d)\.json$/);if(shard)return Response.json(JSON.parse(fs.readFileSync(path.join(root,'hadith-search',shard[1]+'.json'),'utf8')));
  throw Error('unexpected source '+url);
 };
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_model,args)=>{prompt=args.messages[1].content;return {response:'প্রাপ্ত পাতায় তথ্য আছে [1]'}}}};
 const ask=(message,history=[])=>worker.fetch(new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,ids:[],pages:[],history,lookupComplete:true,allSources:true,siteSearchLimited:true})}),env).then(r=>r.json());
 try{
  let data=await ask('আপনাদের ওয়েবসাইটে কুরআনের ইংরেজি অনুবাদ আছে কি?');
  assert.equal(data.grounded,true,JSON.stringify(data));assert(data.sources.some(x=>x.path==='index.html'));assert(prompt.includes('ইংরেজি অনুবাদ'), 'real homepage evidence reaches model');assert(!prompt.includes('20,005'),'stale dynamic counts excluded');assert(!prompt.includes('দাওয়াতের সুন্দর পদ্ধতি'),'hidden example template excluded');
  data=await ask('তোমাদের সাইটে নতুন কী কী বিভাগ আছে?');assert(data.sources.some(x=>x.path==='index.html'));assert(prompt.includes('হাদিসের গ্রন্থসমূহ'));
  data=await ask('ইসলামিক বই বিভাগে তাফসীরে উসমানীর কত খণ্ড আছে?');assert(data.sources.some(x=>x.path==='islamic-books.html'));assert(prompt.includes('তাফসীরে উসমানী ১ম খন্ড pdf'));assert(prompt.includes('তাফসীরে উসমানী ৭ম খন্ড pdf'));assert(!prompt.includes('তাফসীরে উসমানী ৩য় খন্ড pdf'));assert(prompt.includes('এই তালিকা বইয়ের ভেতরের পাঠ নয়'));
  data=await ask('ওয়েবসাইটে নাস্তিকতা বিষয়ে লেখা কোথায়?');assert(data.sources.some(x=>x.path==='questions.html'));assert(prompt.includes('Response to Anti-Islam'));
  data=await ask('তোমাদের ফতোয়া বিভাগটি কোথায়?');assert(data.sources.some(x=>x.path==='fatwa.html'));
  data=await ask('এর সম্পর্কে আরও বলুন',[{role:'user',content:'আপনাদের ওয়েবসাইটে কুরআনের ইংরেজি অনুবাদ আছে কি?'},{role:'assistant',content:'অনিশ্চিত আগের উত্তর'}]);assert(data.sources.some(x=>x.path==='index.html'),'follow-up uses earlier user topic');
  broken=true;data=await ask('আপনাদের ওয়েবসাইটে কুরআনের ইংরেজি অনুবাদ আছে কি?');assert.equal(data.partial,true);assert(data.search_failures.includes('site_pages'),'failed page retrieval disclosed');
  assert(paths.every(u=>u.startsWith('https://ebrahim-ead.github.io/')||u.startsWith('https://raw.githubusercontent.com/Ebrahim-ead/DAWAH-X/')),'fixed allowlist only');
  console.log('assistant new site content: 10 question types, follow-up, real pages, hidden content and outage disclosure pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
