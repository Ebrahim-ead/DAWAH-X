'use strict';
// Offline integration: real catalogue, mocked model and network. This checks
// evidence selection and error handling, not the semantic accuracy of AI text.
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {sitePageMatches,default:worker}=await import('../ai-worker/worker.mjs');
 const {SITE_SNAPSHOT}=await import('../ai-worker/source-fetch.mjs');
 const samples=[
  'ইসলামিক বই বিভাগে কতগুলো সংগ্রহ আছে?',
  'ইসলামিক বই বিভাগে কোন বই আছে?',
  'ইসলামিক বই বিভাগে তাফসীরে উসমানীর কোন খণ্ড রয়েছে?',
  'DAWAH X সাইটে ইবনে কাসীরের কয়টি PDF আছে?',
  'ওয়েবসাইটের বইগুলো কোথা থেকে আসে?',
  'বইয়ের সংগ্রহে মুসনাদে আহমদ আছে?',
  'আপনাদের লাইব্রেরিতে সব বই কি সম্পূর্ণ?',
  'islamic books কোন পৃষ্ঠায়?',
  'আপনাদের ওয়েবসাইটে বইয়ের ভেতরে কী লেখা আছে?',
  'ইসলামিক বই থেকে তাফসীরের ব্যাখ্যা লিখে দিন',
 ];
 for(const q of samples)assert(sitePageMatches(q).includes('islamic-books.html'),q);
 assert.deepEqual(sitePageMatches('তাফসীর ইবনে কাসীরে এ আয়াতের অর্থ কী?'),[],'ordinary religious queries do not become site navigation queries');
 const origin='https://ebrahim-ead.github.io',old=global.fetch,real=fs.readFileSync('islamic-books-catalog.js','utf8');let mode='valid',prompt='',requests=[];
 global.fetch=async u=>{
  const url=String(u);requests.push(url);
  if(url.includes('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"পরীক্ষার তথ্য"]];');
  if(url.includes('/assets/hadith/data/index.json'))return Response.json({books:[]});
  if(url.endsWith('/islamic-books-catalog.js')){
   if(url.startsWith('https://raw.githubusercontent.com/'))return mode==='fallback'?new Response(real):new Response('',{status:503});
   if(mode==='valid')return new Response(real);
   if(mode==='malformed')return new Response('window.ISLAMIC_BOOKS=[{invalid:true}];');
   return new Response('',{status:503});
  }
  if(url.includes('/hadith-search/meta.json'))return Response.json(JSON.parse(fs.readFileSync('hadith-search/meta.json','utf8')));
  const shard=url.match(/\/hadith-search\/(\d\d)\.json$/);if(shard)return Response.json(JSON.parse(fs.readFileSync('hadith-search/'+shard[1]+'.json','utf8')));
  if(url.match(/\/DAWAH-X\/(?:index|about)\.html$/))return new Response(fs.readFileSync(url.endsWith('/index.html')?'index.html':'about.html','utf8'));
  throw Error('unexpected source '+url);
 };
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_m,args)=>{prompt=args.messages[1].content;const match=prompt.match(/\[(\d+)\] ইসলামিক বইয়ের তালিকা/);return {response:match?'তালিকায় তথ্য রয়েছে ['+match[1]+']':'NOT_ENOUGH_INFORMATION'}}}};
 const ask=(message,history=[])=>worker.fetch(new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message,ids:[],pages:[],history,lookupComplete:true,allSources:true,siteSearchLimited:true})}),env).then(r=>r.json());
 try{
  for(const q of samples){const data=await ask(q);assert.equal(data.grounded,true,q+': '+JSON.stringify(data));assert(data.sources.some(x=>x.path==='islamic-books.html'),q);assert(prompt.includes('এই তালিকা বইয়ের ভেতরের পাঠ নয়'));}
  assert(prompt.includes('তাফসীরে উসমানী ১ম খন্ড pdf'));assert(prompt.includes('তাফসীরে উসমানী ২য় খন্ড pdf'));assert(prompt.includes('তাফসীরে উসমানী ৭ম খন্ড pdf'));assert(!prompt.includes('তাফসীরে উসমানী ৩য় খন্ড pdf'));assert(prompt.includes('মুসনাদে আহমদ'));
  let data=await ask('এর কোন খণ্ড আছে?',[{role:'user',content:'ইসলামিক বই বিভাগে তাফসীরে উসমানী আছে?'},{role:'assistant',content:'পূর্বের উত্তর প্রমাণ নয়'}]);assert(data.sources.some(x=>x.path==='islamic-books.html'),'follow-up retrieves real catalogue');
  mode='malformed';data=await ask(samples[0]);assert.equal(data.partial,true);assert(data.search_failures.includes('site_pages'));assert(!data.sources.some(x=>x.path==='islamic-books.html'));
  mode='fallback';data=await ask(samples[0]);assert.equal(data.grounded,true);assert.equal(data.snapshot_search,true);assert.equal(data.sources.find(x=>x.path==='islamic-books.html').snapshot,SITE_SNAPSHOT);
  mode='outage';data=await ask(samples[0]);assert.equal(data.partial,true);assert(data.search_failures.includes('site_pages'));
  assert(requests.every(u=>u.startsWith('https://ebrahim-ead.github.io/')||u.startsWith('https://raw.githubusercontent.com/Ebrahim-ead/DAWAH-X/')),'no arbitrary remote URLs');
  const client=fs.readFileSync('assistant.js','utf8');assert(client.includes("item.path==='islamic-books.html'?'islamic-books-catalog.js'"),'snapshot link identifies actual inventory source');assert(!client.includes('নববী ও মুয়াত্তা মালিকের নির্দিষ্ট নম্বর খোঁজা যায়'));
  console.log('Assistant books: 10 question phrasings, actual inventory, gaps, follow-up, malformed source, outage and pinned fallback pass (mocked model).');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
