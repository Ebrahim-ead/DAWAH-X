const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 fs.mkdirSync('/tmp/navshots',{recursive:true});
 try{
  for(const width of [320,390,768,1099,1100,1180,1280,1600]){
   const page=await browser.newPage({viewport:{width,height:800},deviceScaleFactor:1});
   await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
   await page.goto('http://127.0.0.1:4173/about.html',{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(600);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(overflow<=1,`${width}px overflow: ${overflow}`);
   if(width<1100){
    await page.click('#burger');await page.waitForTimeout(500);
    assert.equal(await page.locator('#burger').getAttribute('aria-expanded'),'true');
    assert(await page.locator('#menu a').last().isVisible());
    const rect=await page.locator('#menu').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width+1,`${width} menu out of bounds`);
    if(width===390)await page.screenshot({path:'/tmp/navshots/mobile-dark.png'});
    await page.keyboard.press('Escape');assert.equal(await page.locator('#burger').getAttribute('aria-expanded'),'false');
    assert(await page.locator('#burger').evaluate(el=>el===document.activeElement));
    await page.click('#theme-toggle');await page.click('#burger');await page.waitForTimeout(500);
    if(width===390)await page.screenshot({path:'/tmp/navshots/mobile-light.png'});
    await page.mouse.click(4,790);assert.equal(await page.locator('#burger').getAttribute('aria-expanded'),'false');
   }else{
    const boxes=await page.locator('#menu a').evaluateAll(els=>els.map(e=>{let r=e.getBoundingClientRect();return {left:r.left,right:r.right}}));
    for(let i=1;i<boxes.length;i++)assert(boxes[i].left>=boxes[i-1].right-1,`${width} overlapping links ${i}`);
    const nav=await page.locator('#menu').boundingBox(),acts=await page.locator('.acts').boundingBox();
    assert(nav.x+nav.width<=acts.x+1,`${width} nav overlaps controls`);
    if(width===1280)await page.screenshot({path:'/tmp/navshots/desktop.png'});
   }
   await page.close();console.log(`${width}px OK`);
  }
  const p=await browser.newPage({viewport:{width:390,height:800},reducedMotion:'reduce'});await p.goto('http://127.0.0.1:4173/about.html');await p.click('#burger');assert.equal(await p.locator('#menu').evaluate(el=>getComputedStyle(el).animationName),'none');await p.close();console.log('reduced motion OK');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
