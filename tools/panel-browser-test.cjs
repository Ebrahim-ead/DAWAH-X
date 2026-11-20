'use strict';
const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});try{
 for(const width of [320,390,560,768,1024,1100,1280,1600]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:4173/fatwa.html',{waitUntil:'domcontentloaded'});await page.waitForSelector('.library-link');
  assert.equal(await page.locator('.library-links > a.library-link').count(),6);
  let dims=await page.evaluate(()=>{let panel=document.querySelector('.library-panel'),r=panel.getBoundingClientRect();return {height:r.height,overflow:document.documentElement.scrollWidth-innerWidth,cards:[...panel.querySelectorAll('.library-link')].map(el=>{let r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,scroll:el.scrollWidth,client:el.clientWidth}})}});
  assert(dims.overflow<=1,`${width} horizontal overflow ${dims.overflow}`);
  for(const card of dims.cards)assert(card.scroll<=card.client+1,`${width} card content overflows`);
  const expected=width>=1100?3:width>560?2:1;
  assert.equal(dims.cards.filter(r=>Math.abs(r.top-dims.cards[0].top)<2).length,expected,`${width} columns`);
  await page.addStyleTag({content:fs.readFileSync('/tmp/panel-old.css','utf8')});let old=await page.locator('.library-panel').evaluate(e=>e.getBoundingClientRect().height);
  assert(dims.height<old,`${width} not smaller: ${dims.height} vs ${old}`);
  console.log(`${width}px height ${dims.height} vs ${old}, ${expected} columns`);await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4173/fatwa.html',{waitUntil:'domcontentloaded'});await page.locator('.library-link').nth(3).click();await page.waitForSelector('#fchips .chip.on');assert((await page.locator('#fchips .chip.on').innerText()).includes('আল-ইতিছাম'));await page.close();
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
