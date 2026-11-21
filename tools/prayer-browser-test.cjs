'use strict';
const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});try{
 for(const width of [320,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  const panel=page.locator('.prayer-panel');await panel.scrollIntoViewIfNeeded();
  assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1,`${width} overflow`);
  assert(await page.locator('.prayer-source').isVisible());
  const f=page.frameLocator('#prayer-frame');await f.locator('body').waitFor({timeout:20000});
  try{await f.getByText('Dhaka, Bangladesh',{exact:false}).first().waitFor({timeout:12000})}catch(e){const body=await f.locator('body').innerText().catch(()=>'<unreadable>');const url=page.frames().map(f=>f.url()).join(' | ');throw new Error(`frame body: ${body.slice(0,300)} frame URLs: ${url}`)};
  const body=await f.locator('body').innerText();for(const name of ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'])assert(body.includes(name),`${width}: missing ${name}`);
  assert.equal((body.match(/\b\d{1,2}:\d{2}\s*[AP]M\b/g)||[]).length,6,`${width}: expected six times`);
  assert(await page.locator('#prayer-frame').evaluate(e=>{let r=e.getBoundingClientRect();return r.right<=innerWidth&&r.left>=0}));
  await page.close();console.log(`${width}px source iframe loaded`);
 }
 }finally{await browser.close()}})().catch(e=>{console.error('::error::'+String(e).replace(/[\r\n]+/g,' ').slice(0,1500));process.exitCode=1});
