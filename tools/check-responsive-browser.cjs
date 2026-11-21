#!/usr/bin/env node
'use strict';
// Browser smoke test against the GitHub Pages project subpath. No real form
// submission, external video playback, or network access to third parties.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 if(!url.startsWith('/DAWAH-X/')){res.writeHead(404).end();return}
 const file=path.resolve(root,url.slice('/DAWAH-X/'.length)||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data)});
});
const checkOverflow=async(page,label)=>{
 const sizes=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert(sizes.scroll<=sizes.width+1,`${label}: horizontal overflow ${sizes.scroll-sizes.width}px`);
};
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page;
 try{
  const base=`http://127.0.0.1:${server.address().port}/DAWAH-X/`;
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  for(const width of [320,390,768,1280])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
   let response='true',submissions=[];
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.continue();
    if(url.hostname==='formsubmit.co'){
     const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept'};
     if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
     submissions.push(route.request().postDataJSON());return route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify({success:response})});
    }
    return route.abort();
   });
   page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});await page.evaluate(t=>localStorage.setItem('dawahx-theme',t),theme);
   const visit=async name=>{await page.goto(base+name,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme);await checkOverflow(page,`${theme} ${width} ${name}`)};
   await visit('index.html');
   await page.click('#theme-toggle');assert.notEqual(await page.getAttribute('html','data-theme'),theme);await page.reload();assert.notEqual(await page.getAttribute('html','data-theme'),theme);await page.click('#theme-toggle');
   if(width<1100){await page.click('#burger');assert.equal(await page.getAttribute('#burger','aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.getAttribute('#burger','aria-expanded'),'false')}
   await page.evaluate(()=>scrollTo(0,1200));await page.waitForFunction(()=>document.querySelector('#back-to-top')?.classList.contains('is-visible'));await page.click('#back-to-top');await page.waitForFunction(()=>scrollY===0);
   for(const name of ['questions.html','fatwa.html'])await visit(name);
   await visit('videos.html');await page.waitForSelector('.video-card');await page.waitForFunction(()=>document.querySelectorAll('.video-chips[data-kind="topic"] .chip').length>3);
   await checkOverflow(page,`${theme} ${width} videos loaded`);
   if(width<=560){const box=page.locator('.video-chips[data-kind="topic"]');assert(await box.evaluate(e=>e.scrollWidth>e.clientWidth));for(const button of await box.locator('.chip').all())assert((await button.boundingBox()).height>=44)}
   const topic=page.locator('.video-chips[data-kind="topic"] .chip').nth(1);await topic.click();assert.equal(await topic.getAttribute('aria-pressed'),'true');
   await page.fill('#video-search','zzzznotavideo123');await page.waitForFunction(()=>document.querySelector('#video-grid').dataset.count==='0');await page.fill('#video-search','');await page.locator('.video-chips[data-kind="topic"] .chip').first().click();await page.waitForSelector('.video-card');
   await page.locator('.video-preview').first().click();assert.equal(await page.locator('.video-lightbox').getAttribute('open'),'');assert(await page.locator('.video-lightbox iframe').count());await page.locator('.video-lightbox-close').click();assert.equal(await page.locator('.video-lightbox').getAttribute('open'),null);
   await visit('read.html?k=1505f35ad3d6f0');await page.waitForFunction(()=>document.querySelector('#read-body')?.textContent.trim().length>30);
   await checkOverflow(page,`${theme} ${width} article loaded`);
   const size=await page.locator('#read-body').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));await page.click('#read-font-up');await page.waitForFunction(before=>parseFloat(getComputedStyle(document.querySelector('#read-body')).fontSize)>before,size);
   if(width<=560)assert((await page.locator('#read-font-up').boundingBox()).height>=44);
   await page.click('#read-save');assert.equal(await page.getAttribute('#read-save','aria-pressed'),'true');await page.reload();assert.equal(await page.getAttribute('#read-save','aria-pressed'),'true');
   await visit('ask.html');await page.click('#askbtn');assert.equal(await page.getAttribute('#an','aria-invalid'),'true');assert.equal(submissions.length,0);
   if(width===390){
    await page.fill('#an','পরীক্ষার নাম');await page.click('#askbtn');assert.equal(await page.getAttribute('#ac','aria-invalid'),'true');
    await page.fill('#ac','invalid');await page.click('#askbtn');assert.equal(await page.getAttribute('#ac','aria-invalid'),'true');
    await page.fill('#ac','test@example.com');await page.click('#askbtn');assert.equal(await page.getAttribute('#ar','aria-invalid'),'true');
    await page.selectOption('#ar',{label:'মুসলিম'});await page.click('#askbtn');assert.equal(await page.getAttribute('#aq','aria-invalid'),'true');assert.equal(submissions.length,0);
    await page.fill('#aq','এটি পরীক্ষার একটি প্রশ্ন।');
    // Form's anti-bot gate is time based; the remote endpoint is intercepted.
    await page.waitForTimeout(1600);await page.click('#askbtn');await page.waitForFunction(()=>document.querySelector('#askm').textContent.includes('পৌঁছেছে'));assert.equal(submissions.length,1);assert.equal(submissions[0].email,'test@example.com');assert.equal(await page.inputValue('#aq'),'');
    response='false';await page.fill('#aq','আরেকটি পরীক্ষার প্রশ্ন।');await page.click('#askbtn');await page.waitForSelector('#askm .ask-whatsapp');assert.equal(submissions.length,2);assert(await page.locator('#askm .ask-messenger').count());assert.equal(await page.inputValue('#aq'),'আরেকটি পরীক্ষার প্রশ্ন।');
   }
   assert.deepEqual(errors,[],`${theme} ${width}: page errors`);
   await context.close();page=null;console.log(`${theme} ${width}px: navigation, reading, videos and form passed`);
  }
 }catch(error){
  if(page&&process.env.TEST_ARTIFACT_DIR){try{fs.mkdirSync(process.env.TEST_ARTIFACT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.TEST_ARTIFACT_DIR,'responsive-failure.png'),fullPage:true})}catch{}}
  throw error;
 }finally{await browser?.close();server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
