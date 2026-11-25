'use strict';
// Real shipped reader shards with deterministic source/model doubles. Tests
// numbering, provenance and failure handling, not theological correctness.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),{parseScripture,isPlainScriptureRequest,lookupScripture}=await import('../ai-worker/scripture.mjs'),{SITE_SNAPSHOT}=await import('../ai-worker/source-fetch.mjs'),worker=(await import('../ai-worker/worker.mjs')).default;
 assert.equal(spawnSync(process.execPath,['tools/build-assistant-local-hadith.cjs','--check'],{cwd:root}).status,0,'locator must match current reader data');
 const cases=[['নববী হাদিস ১','nawawi',1],['নববী ৪২','nawawi',42],['মুয়াত্তা মালিক হাদিস ১','malik',1],['মুওয়াত্তা মালিক ৩২','malik',32],['nawawi 2','nawawi',2],['muwatta malik 2','malik',2]];
 for(const [q,book,n] of cases){const p=parseScripture(q);assert.equal(p?.book,book,q);assert.equal(p?.number,n,q);assert(isPlainScriptureRequest(q,p),q)}
 assert.equal(parseScripture('নববী ১ ও বুখারী ২').kind,'unsupported');assert(!isPlainScriptureRequest('নববী ১ এর ব্যাখ্যা দিন',parseScripture('নববী ১ এর ব্যাখ্যা দিন')));assert.equal(parseScripture('মালিক ১'),null,'ambiguous bare name must not select a book');
 let mode='gzip',requests=[],prompt='',response='পাঠের ব্যাখ্যা [1]';const old=global.fetch,oldWarn=console.warn;console.warn=()=>{};
 global.fetch=async u=>{u=String(u);requests.push(u);let m=u.match(/^https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/(scripture-hadith-(?:nawawi|malik)-\d+\.json\.gz)$/),mirror=u.match(/^https:\/\/raw\.githubusercontent\.com\/Ebrahim-ead\/DAWAH-X\/[a-f0-9]{40}\/(scripture-hadith-(?:nawawi|malik)-\d+\.json\.gz)$/);
  if(m||mirror){if(mode==='outage'||mode==='mirror'&&m)return new Response('',{status:503});const bytes=fs.readFileSync(path.join(root,(m||mirror)[1]));if(mode==='corrupt')return new Response('[]');return new Response(mode==='decoded'?zlib.gunzipSync(bytes):bytes)}
  if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"নিয়ত পরীক্ষা"]];');
  if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});
  if(u.includes('/hadith-search/'))return new Response('{}');throw Error('unexpected '+u);
 };
 const env={ALLOWED_ORIGINS:'https://ebrahim-ead.github.io',RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_m,args)=>{prompt=args.messages[1].content;return {response}}}};
 const ask=q=>worker.fetch(new Request('https://worker.test/',{method:'POST',headers:{Origin:'https://ebrahim-ead.github.io','CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:q,ids:[],pages:[],history:[],lookupComplete:true,allSources:true,siteSearchFailed:true})}),env).then(r=>r.json());
 try{
  for(const [q,book,n] of cases){const d=await ask(q);assert.equal(d.grounded,true,q+JSON.stringify(d));assert.equal(d.direct_lookup,true);assert.equal(d.sources[0].book,book);assert.equal(d.sources[0].hadith,n);assert.equal(d.sources[0].origin,'dawahx');assert(Number.isInteger(d.sources[0].readerIndex));assert(d.answer.includes('hadithbd.com'));assert(!d.partial,'irrelevant article-index failure must not block a direct lookup')}
  // Reader data itself is authoritative: verify every empty Bengali entry is
  // refused and every exceptional number outside section metadata is reachable.
  const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'scripture-hadith-index.js'),'utf8'),ctx);let blanks=0,outside=0;
  for(const section of ctx.window.HADITH_INDEX.books.malik.sections.filter(x=>x.count)){
   const rows=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,`scripture-hadith-malik-${section.id}.json.gz`))));
   for(const row of rows){if(!row[3]?.trim()||/^(?:অনুবাদ পাওয়া যায়নি।?|\(\.\.\.\)|—|-)$/u.test(row[3].trim())){blanks++;assert.equal(await lookupScripture({kind:'hadith',book:'malik',number:row[1]},new Set()),null)}
    if(row[1]<section.hadithFirst||row[1]>section.hadithLast){outside++;const before=requests.length;assert.equal(await lookupScripture({kind:'hadith',book:'malik',number:row[1]},new Set()),null,'out-of-range entries have no Bengali translation');assert(requests.slice(before).some(x=>x.endsWith(`scripture-hadith-malik-${section.id}.json.gz`)),'out-of-range number must reach its shard')}}
  }
  assert.equal(blanks,109);assert.equal(outside,2);
  mode='decoded';let d=await ask('নববী হাদিস ১');assert.equal(d.grounded,true,'host may decode gzip');
  mode='mirror';d=await ask('নববী হাদিস ১');assert.equal(d.grounded,true);assert.equal(d.snapshot_search,true);assert.equal(d.sources[0].snapshot,SITE_SNAPSHOT);
  mode='outage';d=await ask('নববী হাদিস ১');assert.equal(d.grounded,false);assert(d.partial&&d.search_failures.includes('direct_lookup'));
  mode='corrupt';d=await ask('নববী হাদিস ১');assert.equal(d.grounded,false);assert(d.partial,'locator mismatch fails closed');
  mode='gzip';d=await ask('মুয়াত্তা মালিক ১ এর ব্যাখ্যা দিন');assert.equal(d.grounded,true,JSON.stringify(d));assert(prompt.includes('মুয়াত্তা মালিক · হাদিস 1'));assert.equal(d.sources[0].origin,'dawahx');
  response='মুয়াত্তা মালিক 999 [1]';d=await ask('মুয়াত্তা মালিক ১ এর ব্যাখ্যা দিন');assert.equal(d.grounded,false);assert(d.verification_failed,'unmatched numbering cannot be cited');
  assert(requests.filter(x=>x.includes('scripture-hadith')).every(x=>/^(?:https:\/\/ebrahim-ead\.github\.io\/DAWAH-X\/|https:\/\/raw\.githubusercontent\.com\/Ebrahim-ead\/DAWAH-X\/[a-f0-9]{40}\/)scripture-hadith-(?:malik|nawawi)-\d+\.json\.gz$/.test(x)));
  console.log('local hadith: six direct references, two new books, exact shard validation, explanation, fallback and outage pass');
 }finally{global.fetch=old;console.warn=oldWarn}
})().catch(e=>{console.error(e);process.exitCode=1});
