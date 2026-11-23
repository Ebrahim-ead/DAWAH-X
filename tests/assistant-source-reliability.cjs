'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {sourceText}=await import('../ai-worker/source-fetch.mjs'),old=global.fetch;
 try{
  let calls=0;global.fetch=async()=>{calls++;return calls===1?new Response('',{status:503}):new Response('ok')};
  assert.equal(await sourceText('https://example.test/a',10),'ok');assert.equal(calls,2,'transient server errors retry once');
  calls=0;global.fetch=async()=>{calls++;if(calls===1)throw Error('temporary network failure');return new Response('ok')};
  assert.equal(await sourceText('https://example.test/a',10),'ok');assert.equal(calls,2);
  calls=0;global.fetch=async()=>{calls++;if(calls===1)return new Response(new ReadableStream({pull(c){c.error(Error('broken stream'))}}));return new Response('ok')};
  assert.equal(await sourceText('https://example.test/a',10),'ok');assert.equal(calls,2);
  for(const [status,expected] of [[404,1],[429,1],[503,2]]){calls=0;global.fetch=async()=>{calls++;return new Response('',{status})};await assert.rejects(sourceText('https://example.test/a',10));assert.equal(calls,expected)}
  calls=0;global.fetch=async()=>{calls++;return new Response('12345678901')};await assert.rejects(sourceText('https://example.test/a',10),/too large/);assert.equal(calls,1);
  calls=0;global.fetch=async(url,options)=>{calls++;assert.equal(options.redirect,'manual','Cloudflare Workers rejects redirect:error');return new Response(null,{status:302,headers:{Location:'https://attacker.test/private'}})};
  await assert.rejects(sourceText('https://example.test/a',10));assert.equal(calls,1,'redirect target must never be fetched');

  console.log('assistant source fetch: bounded retries, read failure, permanent and oversized responses pass');
 }finally{global.fetch=old}
})().catch(e=>{console.error(e);process.exitCode=1});
