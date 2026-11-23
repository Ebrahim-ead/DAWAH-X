#!/usr/bin/env node
'use strict';
// Execute the actual shared fetch helper in workerd, not just Node's fetch.
// The only upstream is a local, disposable test server; no AI or real data.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {Miniflare}=require('miniflare');
(async()=>{
 let mf;const hits=[];
 const server=http.createServer((req,res)=>{
  hits.push({path:req.url,ua:req.headers['user-agent']});
  if(req.url==='/redirect'){res.writeHead(302,{Location:'/must-not-follow'});return res.end()}
  return res.end('source text');
 });
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const port=server.address().port;
  const helper=fs.readFileSync('ai-worker/source-fetch.mjs','utf8').replace(/^export /gm,'');
  const script=helper+`\nexport default {async fetch(request){try{const text=await sourceText('http://127.0.0.1:${port}'+new URL(request.url).pathname,100);return new Response(text)}catch(e){return new Response(e.code||'failure',{status:502})}}};`;
  mf=new Miniflare({modules:true,script,compatibilityDate:'2025-04-01'});
  let response=await mf.dispatchFetch('http://test/ok');assert.equal(response.status,200);assert.equal(await response.text(),'source text');
  response=await mf.dispatchFetch('http://test/redirect');assert.equal(response.status,502);assert.equal(await response.text(),'http-302');
  assert.deepEqual(hits.map(x=>x.path),['/ok','/redirect'],'redirect target must not be fetched');
  assert(hits.every(x=>x.ua?.startsWith('DAWAH-X-Assistant/')));
  console.log('workerd source fetch: valid request and no-follow redirect pass');
 }finally{if(mf)await mf.dispose();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
