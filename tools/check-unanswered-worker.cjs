'use strict';
// Real workerd, disposable in-memory KV; no production requests or questions.
const assert=require('node:assert/strict'),fs=require('node:fs'),{Miniflare}=require('miniflare');
(async()=>{
 const helper=fs.readFileSync('ai-worker/unanswered.mjs','utf8').replace(/^export /gm,'');
 const script=helper+`\nexport default {fetch(request,env,ctx){queueUnanswered({UNANSWERED_QUESTIONS:env.TEST,UNANSWERED_LIMITER:{limit:async()=>({success:true})}},ctx,'রোজার পরীক্ষামূলক প্রশ্ন','no_candidates','192.0.2.1');return new Response('ok')}};`;
 const mf=new Miniflare({modules:true,script,compatibilityDate:'2025-04-01',kvNamespaces:['TEST']});
 try{
  const res=await mf.dispatchFetch('http://example.test/');assert.equal(await res.text(),'ok');if(typeof res.waitUntil==='function')await res.waitUntil();
  const kv=await mf.getKVNamespace('TEST'),list=await kv.list({prefix:'unanswered/'});assert.equal(list.keys.length,1);const record=JSON.parse(await kv.get(list.keys[0].name));assert.equal(record.reason,'no_candidates');assert.equal(record.question,'রোজার পরীক্ষামূলক প্রশ্ন');assert(list.keys[0].expiration,'KV record has expiry');assert(!JSON.stringify(record).includes('192.0.2.1'));
  console.log('Unanswered tracker: real workerd waitUntil and KV TTL pass (test namespace only)');
 }finally{await mf.dispose()}
})().catch(e=>{console.error(e);process.exitCode=1});
