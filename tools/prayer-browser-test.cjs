'use strict';
// The external service returned 403 to GitHub runners; the response below is mocked.
// This verifies our layout and iframe plumbing, not the live provider's availability or times.
const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});try{
 for(const width of [320,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});let requests=[];
  await page.route('**/*',route=>{let url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();if(url.hostname==='www.islamicfinder.org'&&url.pathname.startsWith('/prayer-widget/')){requests.push(url);return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body>Dhaka, Bangladesh Fajr Sunrise Dhuhr Asr Maghrib Isha</body></html>'})}return route.abort()});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  const panel=page.locator('.prayer-panel');await panel.scrollIntoViewIfNeeded();
  assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1,`${width} overflow`);
  assert(await page.locator('.prayer-source').isVisible());
  const f=page.frameLocator('#prayer-frame');await f.getByText('Dhaka, Bangladesh',{exact:false}).waitFor();
  assert.equal(requests.length,1);assert.equal(requests[0].pathname,'/prayer-widget/1185241/shafi/3/0/18/18/');
  assert.match(requests[0].searchParams.get('dawahx_day'),/^\d{4}-\d{2}-\d{2}$/);
  assert(await page.locator('#prayer-frame').evaluate(e=>{let r=e.getBoundingClientRect();return r.right<=innerWidth&&r.left>=0}));
  await page.close();console.log(`${width}px mocked widget layout OK`);
 }
 const p=await browser.newPage({viewport:{width:390,height:900}});await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:4173/index.html');await p.locator('.prayer-panel').scrollIntoViewIfNeeded();assert(await p.locator('.prayer-source').isVisible());assert((await p.locator('.prayer-caption').innerText()).includes('ব্লক হতে পারে'));await p.close();
 }finally{await browser.close()}})().catch(e=>{console.error('::error::'+String(e).replace(/[\r\n]+/g,' ').slice(0,1500));process.exitCode=1});
