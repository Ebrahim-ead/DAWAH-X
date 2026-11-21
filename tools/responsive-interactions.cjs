'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});try{
 for(const width of [320,390,768,1366]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.goto('http://127.0.0.1:4173/index.html');
  const initial=await p.getAttribute('html','data-theme');await p.click('#theme-toggle');assert.notEqual(await p.getAttribute('html','data-theme'),initial);await p.reload();assert.notEqual(await p.getAttribute('html','data-theme'),initial);
  if(width<1100){await p.click('#burger');assert.equal(await p.getAttribute('#burger','aria-expanded'),'true');await p.keyboard.press('Escape');assert.equal(await p.getAttribute('#burger','aria-expanded'),'false')}
  await p.goto('http://127.0.0.1:4173/videos.html');await p.waitForSelector('.video-card');await p.waitForFunction(()=>document.querySelectorAll('.video-chips[data-kind="topic"] .chip').length>3);
  if(width<=560){const box=p.locator('.video-chips[data-kind="topic"]');assert(await box.evaluate(e=>e.scrollWidth>e.clientWidth));for(const el of await box.locator('.chip').all()){assert((await el.boundingBox()).height>=44)}}
  const topic=p.locator('.video-chips[data-kind="topic"] .chip').nth(1);await topic.click();assert.equal(await topic.getAttribute('aria-pressed'),'true');
  await p.fill('#video-search','zzzznotavideo123');await p.waitForFunction(()=>document.querySelector('#video-grid').dataset.count==='0');await p.fill('#video-search','');await p.locator('.video-chips[data-kind="topic"] .chip').first().click();await p.waitForSelector('.video-card');
  await p.locator('.video-preview').first().click();assert.equal(await p.locator('.video-lightbox').getAttribute('open'),'');await p.locator('.video-lightbox-close').click();assert.equal(await p.locator('.video-lightbox').getAttribute('open'),null);
  await p.goto('http://127.0.0.1:4173/read.html?k=1505f35ad3d6f0');await p.waitForFunction(()=>document.querySelector('#read-body')?.textContent.trim().length>30);const a=await p.locator('.article-body').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));await p.click('#read-font-up');const b=await p.locator('.article-body').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));console.log('font',width,a,b,await p.locator('#read').evaluate(e=>e.style.getPropertyValue('--read-scale')),await p.locator('#read-font-up').isDisabled(), await p.locator('.article-body').evaluate(e=>({css:getComputedStyle(e).getPropertyValue('--read-scale'),inline:e.getAttribute('style'),supports:CSS.supports('font-size','calc(16.5px * 1.1)'),sheets:[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].filter(r=>r.cssText.includes('--read-scale')).map(r=>r.cssText)}catch(e){return []}})})));assert(b>a);if(width<=560)assert((await p.locator('#read-font-up').boundingBox()).height>=44);
  assert.deepEqual(errors,[]);await ctx.close();console.log('interaction checks passed',width);
 }
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
