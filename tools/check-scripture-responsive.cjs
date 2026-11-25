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
   await context.addInitScript(t=>localStorage.setItem('dawahx-theme',t),theme);
   const check=async(label)=>{await page.evaluate(()=>document.fonts.ready);const s=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));if(s.scroll>s.client+1)console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('*')).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right,e.scrollWidth,e.clientWidth]).filter(r=>r[2]>document.documentElement.clientWidth+1).slice(0,20)));assert(s.scroll<=s.client+1,`${width} ${theme} ${label}: overflow ${s.scroll-s.client}px`)};
   await page.goto(base+'quran.html');await page.waitForSelector('.surah-card');assert.equal(await page.locator('.surah-card').count(),114);await check('surahs');
   assert.equal(await page.locator('footer .qlinks li').count(),13);
   assert.equal(await page.locator('footer .soc a').count(),3);
   assert.equal(await page.locator('footer .follow-btn').count(),2);
   assert.equal(await page.locator('footer .word').getAttribute('src'),theme==='light'?'logo-dark.webp':'logo.webp');
   const columns=await page.locator('footer .qlinks li').evaluateAll(items=>items.slice(0,2).map(x=>x.getBoundingClientRect().x));
   assert(columns[1]>columns[0],`${width}: quick links should have two columns`);
   await page.goto(base+'quran.html#/s/1/a/1');await page.waitForFunction(()=>document.querySelector('#v1 .verse-translation')?.textContent.includes('রহমান, রহীম'));
   await page.waitForFunction(()=>document.querySelector('#v1 .english-translation .tr-text')?.textContent==='(1) In the name of Allāh,[2] the Entirely Merciful, the Especially Merciful.[3]');await check('verse');
   await page.goto(base+'hadith.html');await page.waitForSelector('.hadith-book');assert.equal(await page.locator('.hadith-book').count(),9);assert.equal(await page.locator('footer .qlinks li').count(),13);await check('books');
   await page.goto(base+'hadith.html#/hadith/bukhari/section/1');await page.waitForSelector('.hadith-card');await check('hadith');
   if(width<1100) await page.click('#burger');
   await page.locator('#menu a[href="quran.html"]').click();await page.waitForSelector('.surah-card');assert.equal(new URL(page.url()).pathname,'/DAWAH-X/quran.html');
   assert.equal(await page.getAttribute('html','data-theme'),theme);
   await page.click('#theme-toggle'); assert.notEqual(await page.getAttribute('html','data-theme'),theme);
   assert.equal(await page.evaluate(()=>localStorage.getItem('dawahx-theme')), theme==='dark'?'light':'dark');
   assert.deepEqual(errors,[]);await context.close();
  }
  // Real Chromium interaction with a deterministic media mock: streaming is
  // independently checked by the optional source workflow, not downloaded here.
  const interaction=await browser.newContext({serviceWorkers:'block'}), ip=await interaction.newPage();
  await interaction.addInitScript(()=>{
    window.__players=[];
    window.Audio=class extends EventTarget { constructor(){super();this._src='';this.ended=false;this.paused=true;window.__players.push(this)}
      get src(){return this._src} set src(v){this._src=v;this.ended=false}
      play(){this.paused=false;return Promise.resolve()} pause(){this.paused=true}
      removeAttribute(name){if(name==='src')this.src=''} load(){}
      finish(){this.ended=true;this.paused=true;this.dispatchEvent(new Event('ended'))} };
  });
  await ip.goto(base+'quran.html#/s/1/a/1');await ip.waitForSelector('#v1 [data-action="audio"]');
  await ip.click('#v1 [data-action="audio"]');assert.equal(await ip.getAttribute('#v1 [data-action="audio"]','aria-pressed'),'true');
  assert.equal(await ip.evaluate(()=>window.__players[0].src),'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001001.mp3');
  await ip.click('#v2 [data-action="audio"]');assert.equal(await ip.getAttribute('#v1 [data-action="audio"]','aria-pressed'),'false');
  assert.equal(await ip.evaluate(()=>window.__players.length),1);assert.equal(await ip.evaluate(()=>window.__players[0].src),'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001002.mp3');
  await ip.click('[data-action="surah-audio"]');assert.equal(await ip.getAttribute('[data-action="surah-audio"]','aria-pressed'),'true');
  assert.equal(await ip.evaluate(()=>window.__players[0].src),'https://download.quranicaudio.com/quran/yasser_ad-dussary/001.mp3');
  assert((await ip.locator('#surahAudioStatus').innerText()).includes('সম্পূর্ণ সূরা চলছে'));
  await ip.click('[data-action="surah-audio"]');assert(await ip.evaluate(()=>window.__players[0].paused));
  await ip.click('[data-action="surah-audio"]');assert(!(await ip.evaluate(()=>window.__players[0].paused)));
  await ip.evaluate(()=>location.hash='#/s/1/a/2');await ip.waitForFunction(()=>document.querySelector('#v2')?.classList.contains('is-target'));assert(!(await ip.evaluate(()=>window.__players[0].paused)));
  await ip.evaluate(()=>window.__players[0].finish());assert((await ip.locator('#surahAudioStatus').innerText()).includes('শেষ হয়েছে'));


  await ip.goto(base+'hadith.html#/hadith/bukhari/section/64');await ip.waitForSelector('.hadith-autoload');
  const first=ip.locator('#hadithList .hadith-card').first();await first.evaluate(e=>e.dataset.testIdentity='retained');
  await ip.locator('.hadith-autoload').scrollIntoViewIfNeeded();await ip.waitForFunction(()=>document.querySelectorAll('#hadithList .hadith-card').length>20);
  assert.equal(await first.getAttribute('data-test-identity'),'retained');assert.equal(await ip.locator('#hadithList button.more-btn').count(),0);
  await ip.goto(base+'hadith.html#/hadith/abudawud/594');await ip.waitForSelector('.hadith-card .hadith-grade');
  assert((await ip.locator('.hadith-grade').innerText()).includes('যঈফ'));assert.equal(await ip.locator('.hadith-grade-reason').count(),0);await interaction.close();
  // Theme and navigation remain consistent when moving from the existing site
  // into both readers and back, including the shared mobile menu.
  const shared=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  const sharedPage=await shared.newPage(); await sharedPage.goto(base+'index.html');
  await sharedPage.evaluate(()=>localStorage.setItem('dawahx-theme','light')); await sharedPage.reload();
  const lightBg=await sharedPage.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  await sharedPage.click('#burger'); await sharedPage.click('#menu a[href="quran.html"]');
  await sharedPage.waitForSelector('.surah-card'); assert.equal(await sharedPage.getAttribute('html','data-theme'),'light');
  assert.equal(await sharedPage.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()),lightBg);
  assert.equal(await sharedPage.locator('#menu a[aria-current="page"]').getAttribute('href'),'quran.html');
  await sharedPage.click('#theme-toggle'); assert.equal(await sharedPage.getAttribute('html','data-theme'),'dark');
  await sharedPage.click('#burger'); assert.equal(await sharedPage.getAttribute('#burger','aria-expanded'),'true');
  await sharedPage.keyboard.press('Escape'); assert.equal(await sharedPage.getAttribute('#burger','aria-expanded'),'false');
  await sharedPage.click('#burger'); await sharedPage.click('#menu a[href="hadith.html"]');
  await sharedPage.waitForSelector('.hadith-book'); assert.equal(await sharedPage.getAttribute('html','data-theme'),'dark');
  assert.equal(await sharedPage.locator('#menu a[aria-current="page"]').getAttribute('href'),'hadith.html');
  await sharedPage.click('#burger'); await sharedPage.click('#menu a[href="index.html"]');
  await sharedPage.waitForFunction(()=>document.documentElement.getAttribute('data-theme')==='dark');
  assert.equal(await sharedPage.evaluate(()=>localStorage.getItem('dawahx-theme')),'dark');
  await sharedPage.goto(base+'quran.html#/s/2/a/255'); await sharedPage.waitForSelector('#v255');
  await sharedPage.goto(base+'index.html');
  await sharedPage.waitForFunction(()=>document.querySelector('#scripture-resume')?.getAttribute('href')==='quran.html#/s/2/a/255');
  await sharedPage.click('#scripture-resume'); await sharedPage.waitForSelector('#v255');
  assert.equal(new URL(sharedPage.url()).hash,'#/s/2/a/255'); await shared.close();
  // A failed lazy translation is reported and can be retried without a reload.
  const retry=await browser.newContext({serviceWorkers:'block'}), retryPage=await retry.newPage();
  let rejectEnglish=true;
  await retryPage.route('**/scripture-en-2.js',route=>rejectEnglish ? route.abort() : route.continue());
  await retryPage.goto(base+'quran.html#/s/2/a/1');
  await retryPage.waitForFunction(()=>document.querySelector('#v1 .english-translation')?.textContent.includes('লোড করা যায়নি'));
  rejectEnglish=false; await retryPage.uncheck('#showEnglish'); await retryPage.check('#showEnglish');
  await retryPage.waitForFunction(()=>document.querySelector('#v1 .english-translation .tr-text')?.textContent==='(1) Alif, Lām, Meem.[7]');
  await retry.close();
  // Failed search indexes must not be presented as a complete search. Retry
  // should recover both English and Bengali without reloading the reader.
  const searchContext=await browser.newContext({serviceWorkers:'block'}), searchPage=await searchContext.newPage();
  let failIndexes=true;
  await searchPage.route(/scripture-(en|bn)-translation\.js$/,route=>failIndexes ? route.abort() : route.continue());
  await searchPage.goto(base+'quran.html#/search?q=MERCIFUL');
  await searchPage.waitForFunction(()=>document.querySelector('#searchResults')?.textContent.includes('ইংরেজি অনুবাদের ইনডেক্স লোড করা যায়নি'));
  assert((await searchPage.locator('#searchResults').innerText()).includes('বাংলা অনুবাদের ইনডেক্স'));
  assert(!(await searchPage.locator('#searchResults').innerText()).includes('কিছু পাওয়া যায়নি'));
  failIndexes=false;await searchPage.click('[data-action="retry-search"]');
  await searchPage.waitForFunction(()=>document.querySelector('#searchResults')?.textContent.includes('ইংরেজি অনুবাদে মিল'));
  await searchPage.waitForFunction(()=>!document.querySelector('#searchResults')?.textContent.includes('লোড হচ্ছে'));
  assert.equal(await searchPage.locator('#searchResults [data-s="1"][data-a="1"]').count(),1);
  let failTafsir=true;
  await searchPage.route('**/scripture-tafsir-7.js',route=>failTafsir ? route.abort() : route.continue());
  await searchPage.check('#searchTafsir');
  await searchPage.waitForFunction(()=>document.querySelector('#searchResults')?.textContent.includes('তাফসীরের ইনডেক্স লোড করা যায়নি'));
  failTafsir=false; await searchPage.click('[data-action="retry-search"]');
  await searchPage.waitForFunction(()=>!document.querySelector('#searchResults')?.textContent.includes('লোড হচ্ছে'));
  assert(!(await searchPage.locator('#searchResults').innerText()).includes('লোড করা যায়নি'));
  await searchContext.close();
  // A direct reader visit registers the existing site worker. Previously read
  // chapters may be available offline; this is not a full offline download.
  const offlineContext=await browser.newContext(); const offlinePage=await offlineContext.newPage();
  await offlinePage.goto(base+'hadith.html#/hadith/bukhari/section/1');
  await offlinePage.waitForSelector('.hadith-card');
  await offlinePage.evaluate(()=>navigator.serviceWorker.ready);
  await offlinePage.reload(); await offlinePage.waitForSelector('.hadith-card');
  await offlinePage.waitForFunction(async()=>!!(await caches.match('scripture-hadith-bukhari-1.json.gz')));
  await offlineContext.setOffline(true); await offlinePage.reload(); await offlinePage.waitForSelector('.hadith-card');
  await offlineContext.setOffline(false);
  await offlinePage.goto(base+'quran.html#/s/2/a/1');
  await offlinePage.waitForFunction(()=>document.querySelector('#v1 .english-translation .tr-text')?.textContent==='(1) Alif, Lām, Meem.[7]');
  await offlinePage.waitForFunction(async()=>!!(await caches.match('scripture-en-2.js')));
  await offlineContext.setOffline(true); await offlinePage.reload();
  await offlinePage.waitForFunction(()=>document.querySelector('#v1 .english-translation .tr-text')?.textContent==='(1) Alif, Lām, Meem.[7]');
  await offlineContext.setOffline(false); await offlinePage.goto(base+'quran.html#/search?q=MERCIFUL');
  await offlinePage.waitForFunction(()=>document.querySelector('#searchResults')?.textContent.includes('ইংরেজি অনুবাদে মিল'));
  await offlinePage.waitForFunction(async()=>!!(await caches.match('scripture-en-translation.js')));
  await offlineContext.setOffline(true); await offlinePage.reload();
  await offlinePage.waitForFunction(()=>document.querySelector('#searchResults')?.textContent.includes('ইংরেজি অনুবাদে মিল'));
  await offlineContext.close();
  console.log('scripture reader: Chromium responsive layouts, themes, navigation and previously read offline chapter pass');
 } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
