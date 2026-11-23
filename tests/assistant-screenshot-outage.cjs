'use strict';
// The screenshot question with real local article shards and a mock model.
// Tests retrieval/labels, not the semantic or religious correctness of answers.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const module=await import('../ai-worker/worker.mjs'),worker=module.default,old=global.fetch,oldWarn=console.warn;
 assert(module.queryTerms('নামাজের সময় কখন?').some(g=>g.includes('সময়')),'a prayer-time question keeps the time condition');
 let prompt='';console.warn=()=>{};
 global.fetch=async url=>{url=String(url);
  const shard=url.match(/^https:\/\/raw\.githubusercontent\.com\/Ebrahim-ead\/DAWAH-X\/[a-f0-9]{40}\/texts\/([a-f0-9]{3})\.json$/);
  if(shard)return new Response(fs.readFileSync(path.join(__dirname,'..','texts',shard[1]+'.json')));
  return new Response('',{status:503});
 };
 const origin='https://ebrahim-ead.github.io',env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_,args)=>{prompt=args.messages[1].content;return {response:'বাছাই করা লেখায় বিষয়টি আলোচনা করা হয়েছে [1]'}}}};
 const question='নামাজের সময় হাত কোথায় বাঁধবো বুকে নাকি নাভির নিচে';
 try{
  const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:question,ids:['12d3bce133da64','1cdcea4ead1cbb','1baadfbb8e91fa','1592fe54154eac'],pages:[],history:[],lookupComplete:true,allSources:true})});
  const data=await (await worker.fetch(req,env)).json();assert.equal(data.grounded,true,JSON.stringify(data));assert.equal(data.partial,true);assert.deepEqual(data.search_failures,['quran','hadith']);assert.equal(data.snapshot_search,true);assert(['12d3bce133da64','1cdcea4ead1cbb','1baadfbb8e91fa','1592fe54154eac'].includes(data.sources[0].key));assert.match(data.sources[0].snapshot,/^[a-f0-9]{40}$/);assert(prompt.includes(question));assert(prompt.includes('নাভির'));assert.match(prompt,/Some source searches failed/);
  console.log('screenshot question: article snapshot can supply partial evidence when scripture endpoints are down');
 }finally{global.fetch=old;console.warn=oldWarn}
})().catch(e=>{console.error(e);process.exitCode=1});
