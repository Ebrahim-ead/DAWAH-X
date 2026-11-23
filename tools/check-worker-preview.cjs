'use strict';
// Opt-in live check of a DAWAH X Worker Preview. Sends only one public,
// numbered Quran lookup; this verifies bindings, CORS and source access, not
// model inference or theological correctness.
const assert=require('node:assert/strict');
(async()=>{
 const branch=process.env.PREVIEW_BRANCH||'';
 const value=process.env.WORKER_PREVIEW_URL||(/^arena\/[a-z0-9-]+$/.test(branch)?'https://'+branch.replace('/','-')+'-dawahx-assistant.www-mdrazu55555.workers.dev/':'');
 if(!value)throw Error('A valid preview URL or arena branch is required');
 const url=new URL(value);
 assert.equal(url.protocol,'https:');assert(!url.username&&!url.password&&!url.port&&url.pathname==='/'&&!url.search&&!url.hash,'invalid preview URL');
 assert(/^[a-z0-9-]+-dawahx-assistant\.www-mdrazu55555\.workers\.dev$/.test(url.hostname),'not a DAWAH X Worker preview');
 const origin='https://ebrahim-ead.github.io',headers={Origin:origin,'Content-Type':'application/json'},payload={message:'কুরআন ২:২৫৫',ids:[],pages:[],history:[],lookupComplete:true,allSources:true};
 const request=(options)=>fetch(url,{...options,signal:AbortSignal.timeout(30000),redirect:'error'});
 const preflight=await request({method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type'}});
 assert.equal(preflight.status,204,'preflight failed');assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
 const blocked=await request({method:'POST',headers:{...headers,Origin:'https://invalid.example'},body:JSON.stringify(payload)});assert.equal(blocked.status,403,'unapproved origins must be rejected');
 const response=await request({method:'POST',headers,body:JSON.stringify(payload)});assert.equal(response.status,200,'direct lookup failed: '+response.status);assert.equal(response.headers.get('access-control-allow-origin'),origin);
 const data=await response.json();assert.equal(data.grounded,true);assert(data.sources?.some(s=>s.type==='quran'&&s.surah===2&&s.verse===255),'direct verse source was not returned');
 console.log('Preview Worker: CORS, required bindings and direct Quran lookup passed. Model inference was not tested.');
})().catch(error=>{console.error('Preview Worker check failed:',error.message);process.exitCode=1});
