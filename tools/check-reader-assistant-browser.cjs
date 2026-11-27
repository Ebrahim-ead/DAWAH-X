#!/usr/bin/env node
'use strict';
// Real reader shell and local search, with deterministic Worker responses.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');let broken=false;
const server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(!name.startsWith('/project/'))return res.writeHead(404).end();name=name.slice(9);
 if(broken&&name==='search/meta.json')return res.writeHead(503).end();
 const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();let type={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type}).end(data)});
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});const base=`http://127.0.0.1:${server.address().port}/project/`;
 for(const file of ['quran.html','hadith.html'])for(const width of [320,1100,1280,1600]){
  broken=false;const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'}),page=await ctx.newPage(),payloads=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://dawahx-assistant.www-mdrazu55555.workers.dev/',async route=>{const p=route.request().postDataJSON();payloads.push(p);
   const result=!p.lookupComplete?{needs_sources:true,all_sources:true,direct_lookup:p.message==='সূরা ১ আয়াত ১'}:p.message==='সূরা ১ আয়াত ১'?{answer:'নির্দিষ্ট মূল পাঠ',sources:[{number:1,title:'সূরা ১ আয়াত ১',type:'quran',surah:1,verse:1}],grounded:true,direct_lookup:true}:p.siteSearchFailed?{answer:'অনুসন্ধান অসম্পূর্ণ',sources:[],grounded:false,partial:true,search_failures:['site_search']}:{answer:'পরীক্ষামূলক উত্তর [1]',sources:[{number:1,title:'সাইটের লেখা',key:p.ids[0]}],grounded:true};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
  });
  await page.goto(base+file);await page.waitForSelector('.dxa-trigger');
  if(width>=1100){await page.evaluate(()=>document.fonts.ready);const bounds=await page.locator('#menu a').evaluateAll(links=>links.map(a=>{const r=a.getBoundingClientRect();return {left:r.left,right:r.right,scroll:a.scrollWidth,client:a.clientWidth}}));for(let i=0;i<bounds.length;i++){assert(bounds[i].scroll<=bounds[i].client+1,`${file} ${width}: clipped menu item`);if(i)assert(bounds[i].left>=bounds[i-1].right+5,`${file} ${width}: navigation links too close or overlapping`)}const actions=await page.locator('.acts').boundingBox();assert(bounds.at(-1).right<=actions.x+1,`${file} ${width}: menu overlaps actions`)}assert.equal(await page.locator('.dxa-trigger').count(),1);assert(await page.locator('.dxa-trigger').isVisible());await page.click('.dxa-trigger');
  assert(await page.locator('.dxa-privacy').isVisible());assert.equal(await page.locator('.dxa-log-toggle, .dxa-filter').count(),0);await page.fill('#dxa-input','পর্দার গুরুত্ব কী?');await page.locator('.dxa-form').evaluate(f=>f.requestSubmit());await page.waitForFunction(()=>!document.querySelector('.dxa-form button[type="submit"]').disabled);
  assert.equal(payloads[0].unansweredLogging,true);assert(payloads[0].ids.length>0,`${file} ${width}: real local search returned candidates`);assert.equal(payloads[0].siteSearchFailed,false);assert(await page.locator('.dxa-sources a[href*="read.html?k="]').count());
  await page.fill('#dxa-input','এটা কেন?');await page.locator('.dxa-form').evaluate(f=>f.requestSubmit());await page.waitForFunction(()=>!document.querySelector('.dxa-form button[type="submit"]').disabled);assert.equal(payloads[1].history.length,2);
  await page.click('.dxa-reset');assert.equal(await page.locator('.dxa-message.user').count(),0);
  await page.fill('#dxa-input','সূরা ১ আয়াত ১');await page.locator('.dxa-form').evaluate(f=>f.requestSubmit());await page.waitForFunction(()=>!document.querySelector('.dxa-form button[type="submit"]').disabled);assert.equal(payloads[2].history.length,0);assert.equal(payloads[2].lookupComplete,true);
  await page.keyboard.press('Escape');assert.equal(await page.getAttribute('.dxa-trigger','aria-expanded'),'false');
  assert.deepEqual(errors,[]);await ctx.close();
 }
 // A fresh page with a broken index still sends an honest partial-search flag.
 broken=true;const ctx=await browser.newContext({serviceWorkers:'block'}),page=await ctx.newPage();let final;
 await page.route('https://dawahx-assistant.www-mdrazu55555.workers.dev/',async route=>{let p=route.request().postDataJSON();if(p.lookupComplete)final=p;await route.fulfill({contentType:'application/json',body:JSON.stringify(!p.lookupComplete?{needs_sources:true,all_sources:true}:{answer:'অনুসন্ধান অসম্পূর্ণ',sources:[],grounded:false,partial:true,search_failures:['site_search']})})});
 await page.goto(base+'quran.html');await page.click('.dxa-trigger');await page.fill('#dxa-input','পর্দার গুরুত্ব কী?');await page.locator('.dxa-form').evaluate(f=>f.requestSubmit());await page.waitForFunction(()=>!document.querySelector('.dxa-form button[type="submit"]').disabled);assert.equal(final.siteSearchFailed,true);assert(await page.getByText('এই অংশগুলোতে সমস্যা হয়েছে:',{exact:false}).count());await ctx.close();
 console.log('Reader assistant: both pages, real local search, history reset, direct lookup and search outage pass at mobile/desktop sizes');
 }finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
