#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), http=require('node:http'), path=require('node:path');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname.replace(/^\/DAWAH-X\//,'');
 if(!/^[-a-z0-9.]+$/.test(name))return res.writeHead(404).end();
 fs.readFile(path.join(root,name),(err,data)=>{if(err)return res.writeHead(404).end();
 const ext=path.extname(name), types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.woff2':'font/woff2','.gz':'application/gzip'};
 res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'}).end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try {
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const base=`http://127.0.0.1:${server.address().port}/DAWAH-X/`;
  for(const width of [320,390,768,1280]) for(const theme of ['light','dark']) {
   const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
   const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(t=>localStorage.setItem('dawahx-quran:theme',JSON.stringify(t)),theme);
   const check=async(label)=>{await page.evaluate(()=>document.fonts.ready);const s=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));if(s.scroll>s.client+1)console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('*')).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right,e.scrollWidth,e.clientWidth]).filter(r=>r[2]>document.documentElement.clientWidth+1).slice(0,20)));assert(s.scroll<=s.client+1,`${width} ${theme} ${label}: overflow ${s.scroll-s.client}px`)};
   await page.goto(base+'quran.html');await page.waitForSelector('.surah-card');assert.equal(await page.locator('.surah-card').count(),114);await check('surahs');
   await page.goto(base+'quran.html#/s/1/a/1');await page.waitForFunction(()=>document.querySelector('#v1 .verse-translation')?.textContent.includes('রহমান, রহীম'));await check('verse');
   await page.goto(base+'hadith.html');await page.waitForSelector('.hadith-book');assert.equal(await page.locator('.hadith-book').count(),9);await check('books');
   await page.goto(base+'hadith.html#/hadith/bukhari/section/1');await page.waitForSelector('.hadith-card');await check('hadith');
   await page.locator('.main-nav a[href="quran.html"]').click();await page.waitForSelector('.surah-card');assert.equal(new URL(page.url()).pathname,'/DAWAH-X/quran.html');
   assert.deepEqual(errors,[]);await context.close();
  }
  // A direct reader visit registers the existing site worker. Previously read
  // chapters may be available offline; this is not a full offline download.
  const offlineContext=await browser.newContext(); const offlinePage=await offlineContext.newPage();
  await offlinePage.goto(base+'hadith.html#/hadith/bukhari/section/1');
  await offlinePage.waitForSelector('.hadith-card');
  await offlinePage.evaluate(()=>navigator.serviceWorker.ready);
  await offlinePage.reload(); await offlinePage.waitForSelector('.hadith-card');
  await offlinePage.waitForFunction(async()=>!!(await caches.match('scripture-hadith-bukhari-1.json.gz')));
  await offlineContext.setOffline(true); await offlinePage.reload(); await offlinePage.waitForSelector('.hadith-card');
  await offlineContext.close();
  console.log('scripture reader: Chromium responsive layouts, themes, navigation and previously read offline chapter pass');
 } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
