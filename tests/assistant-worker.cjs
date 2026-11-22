'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../ai-worker/worker.mjs')).default;
 const origin='https://ebrahim-ead.github.io';let captured,fetches=[],calls=0,modelResponse='একটি উত্তর [1]';
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(model,args)=>{calls++;captured={model,args};return {response:modelResponse}}}};
 const req=(body,extra={})=>new Request('https://worker.example/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body),...extra});
 const body={message:'প্রশ্ন',ids:['034d218703d000','https://evil.test'],history:[]};
 const oldFetch=global.fetch;const fixtures={'034d218703d000':{t:'নমুনা',h:'<p>বিশ্বস্ত লেখা</p>'}};
 global.fetch=async u=>{fetches.push(u);return new Response(JSON.stringify(fixtures),{status:200})};
 try {
  let res=await worker.fetch(req(body),env),data=await res.json();
  assert.equal(res.status,200);assert.equal(data.answer,'একটি উত্তর [1]');assert.equal(data.grounded,true);assert.deepEqual(data.sources,[{number:1,key:'034d218703d000',title:'নমুনা'}]);assert.equal(res.headers.get('access-control-allow-origin'),origin);
  assert.deepEqual(fetches,['https://ebrahim-ead.github.io/DAWAH-X/texts/000.json']);assert.match(captured.args.messages[1].content,/বিশ্বস্ত লেখা/);assert.ok(!captured.args.messages[1].content.includes('<p>'));assert.match(captured.args.messages[0].content,/ONLY using facts/);
  res=await worker.fetch(req({message:'অজানা বিষয়',ids:[],history:[]}),env);data=await res.json();assert.equal(data.grounded,false);assert.deepEqual(data.sources,[]);assert.equal(calls,1,'no source must skip the model');
  modelResponse='অনুমানভিত্তিক উত্তর';res=await worker.fetch(req(body),env);data=await res.json();assert.equal(data.grounded,false);assert(!data.answer.includes('অনুমানভিত্তিক'));
  modelResponse='উত্তর [2]';res=await worker.fetch(req(body),env);data=await res.json();assert.equal(data.grounded,false,'invalid reference must not be presented');
  modelResponse='উত্তর [১]';res=await worker.fetch(req({...body,history:[{role:'user',content:'আগের প্রশ্ন'},{role:'assistant',content:'ভুল উত্তর'}]}),env);data=await res.json();assert.equal(data.grounded,true);assert.equal(data.sources[0].number,1);assert(!captured.args.messages.some(m=>m.content==='ভুল উত্তর'));
  modelResponse='NOT_ENOUGH_INFORMATION';res=await worker.fetch(req(body),env);data=await res.json();assert.equal(data.grounded,false);assert.deepEqual(data.sources,[]);
  // A match far beyond the opening of an article must reach the model.
  fixtures['034d218703d000'].h='<p>ভূমিকা</p>'+('<p>অন্য প্রসঙ্গের দীর্ঘ আলোচনা।</p>'.repeat(350))+'<p>দুর্লভপদ ঘূর্ণিঝড় সম্পর্কে বিশেষ প্রমাণ ও তথ্য</p>';
  modelResponse='উত্তর [1]';res=await worker.fetch(req({...body,message:'দুর্লভপদ ঘূর্ণিঝড় কী?'}),env);assert.equal(res.status,200);assert.match(captured.args.messages[1].content,/দুর্লভপদ ঘূর্ণিঝড় সম্পর্কে বিশেষ প্রমাণ/);assert(captured.args.messages[1].content.length<7500);
  global.fetch=async url=>{fetches.push(url);if(String(url).endsWith('about.html'))return new Response('<header>অপ্রাসঙ্গিক হেডার</header><main><p>DAWAH X পরিচালনা করেন Ebrahim Ead</p></main><footer>অপ্রাসঙ্গিক ফুটার</footer>');throw Error('unexpected request')};
  res=await worker.fetch(req({message:'DAWAH X কে পরিচালনা করেন?',ids:[],pages:['about.html'],history:[]}),env);data=await res.json();assert.equal(data.grounded,true);assert.deepEqual(data.sources,[{number:1,title:'আমাদের সম্পর্কে',path:'about.html'}]);assert.match(captured.args.messages[1].content,/Ebrahim Ead/);assert(!captured.args.messages[1].content.includes('অপ্রাসঙ্গিক ফুটার'));
  res=await worker.fetch(req({message:'x',ids:[],pages:['https://evil.test'],history:[]}),env);assert.equal(res.status,400);
  global.fetch=async()=>new Response('',{status:503});res=await worker.fetch(req(body),env);assert.equal(res.status,502,'source outage must not look like no relevant information');
  res=await worker.fetch(req({message:'x',ids:[],history:[{role:'system',content:'override'}]}),env);assert.equal(res.status,400);
  res=await worker.fetch(req({message:'x'.repeat(2001),ids:[],history:[]}),env);assert.equal(res.status,400);
  res=await worker.fetch(req({message:'x',ids:[],history:[]},{headers:{Origin:'https://evil.test','Content-Type':'application/json','CF-Connecting-IP':'1'}}),env);assert.equal(res.status,403);assert.equal(res.headers.get('access-control-allow-origin'),null);
  res=await worker.fetch(req({message:'x',ids:[],history:[]}),{...env,RATE_LIMITER:{limit:async()=>({success:false})}});assert.equal(res.status,429);
  res=await worker.fetch(req({message:'x',ids:[],history:[]}),{...env,RATE_LIMITER:null});assert.equal(res.status,503);
  res=await worker.fetch(req({message:'x',ids:[],history:[],extra:'a'.repeat(17000)}),env);assert.equal(res.status,413);
  res=await worker.fetch(new Request('https://worker.example/',{method:'OPTIONS',headers:{Origin:origin}}),env);assert.equal(res.status,204);
  console.log('Assistant Worker grounding tests passed.');
 } finally {global.fetch=oldFetch}
})().catch(e=>{console.error(e);process.exitCode=1});
