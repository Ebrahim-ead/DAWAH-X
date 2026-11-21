'use strict';
const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});try{
 for(const width of [320,390,520,768,850,851,1280]){
  const page=await browser.newPage({viewport:{width,height:900},timezoneId:'Pacific/Honolulu',reducedMotion:'reduce'});let widgetLoads=0;
  await page.addInitScript(()=>{window.fakeTime=Date.parse('2026-11-15T05:00:00Z');const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[window.fakeTime]))}static now(){return window.fakeTime}}});
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1')return r.continue();if(u.hostname==='www.islamicfinder.org'&&u.pathname.startsWith('/prayer-widget/')){widgetLoads++;return r.fulfill({contentType:'text/html',body:'Dhaka, Bangladesh'})}return r.abort()});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});await page.locator('.prayer-panel').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.prayer-card').count(),6);assert.equal(await page.locator('.prayer-card.is-current h3').innerText(),'সূর্যোদয়');assert.equal(await page.locator('.prayer-card.is-next h3').innerText(),'যোহর');
  assert.match(await page.locator('[data-prayer="fajr"] time').innerText(),/04:54\s*AM/);assert.equal(widgetLoads,0);
  assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1,`${width} page overflow`);
  for(const card of await page.locator('.prayer-card').all())assert(await card.evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${width} card overflow`);
  const boxes=await page.locator('.prayer-card').evaluateAll(els=>els.map(e=>{let r=e.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right}}));let cols=width>850?6:width>520?3:2;assert.equal(boxes.filter(b=>Math.abs(b.top-boxes[0].top)<2).length,cols,`${width} cols`);
  await page.evaluate(()=>{window.fakeTime=Date.parse('2026-11-15T16:00:00Z');window.dispatchEvent(new Event('pageshow'))});assert((await page.locator('#prayer-next').innerText()).includes('আগামীকাল'));assert.equal(await page.locator('.prayer-card.is-next').count(),0);
  await page.locator('#prayer-reference summary').click();await page.frameLocator('#prayer-frame').getByText('Dhaka, Bangladesh').waitFor();assert.equal(widgetLoads,1);
  await page.locator('#theme-toggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.equal(errors.length,0,errors.join('; '));await page.close();
 }
 const p=await browser.newPage({viewport:{width:390,height:900}});await p.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'&&!u.pathname.endsWith('/adhan.min.js')?r.continue():r.abort()});await p.goto('http://127.0.0.1:4173/index.html');assert((await p.locator('#prayer-next').innerText()).includes('গণনা করা যাচ্ছে না'));assert.equal(await p.locator('[data-prayer="fajr"] time').innerText(),'—');await p.close();
 }finally{await browser.close()}})().catch(e=>{console.error('::error::'+String(e).replace(/[\r\n]+/g,' ').slice(0,1500));process.exitCode=1});
