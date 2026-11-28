'use strict';
// Disposable workerd and synthetic secret; no production request is made.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),{Miniflare}=require('miniflare');
(async()=>{
 let mf;const seen=[];
 const server=http.createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{seen.push({key:req.headers['x-goog-api-key'],payload:JSON.parse(body)});res.setHeader('content-type','application/json');res.end(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'পরীক্ষা [1]'}]}}]}))})});
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
  const helper=fs.readFileSync('ai-worker/gemini.mjs','utf8').replace(/^export /gm,'').replace("'https://generativelanguage.googleapis.com/v1beta/models/'+GEMINI_MODEL+':generateContent'",`'http://127.0.0.1:${port}/generateContent'`);
  const script=helper+`\nexport default {async fetch(){const ai=answerAI({GEMINI_ENABLED:'true',gem:'disposable-test-key',AI:{run(){throw Error('unexpected fallback')}}},'primary');const result=await ai.run('primary',{messages:[{role:'system',content:'test system'},{role:'user',content:'test question'}],max_tokens:12});return new Response(result.response)}};`;
  mf=new Miniflare({modules:true,script,compatibilityDate:'2025-04-01'});const res=await mf.dispatchFetch('http://test/');assert.equal(res.status,200);assert.equal(await res.text(),'পরীক্ষা [1]');assert.equal(seen.length,1);assert.equal(seen[0].key,'disposable-test-key');assert.equal(seen[0].payload.contents[0].parts[0].text,'test question');console.log('Gemini adapter: actual workerd fetch and response parsing pass (local mock only)');
 }finally{if(mf)await mf.dispose();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
