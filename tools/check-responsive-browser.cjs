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
   const checkAssistant=async()=>{
    const trigger=page.locator('.dxa-trigger'),panel=page.locator('#dxa-panel');
    await trigger.waitFor();assert.equal(await panel.isVisible(),false);
    await trigger.click();assert.equal(await panel.isVisible(),true,'assistant panel should open');
    assert.equal(await trigger.getAttribute('aria-expanded'),'true');
    assert.equal(await panel.evaluate(e=>getComputedStyle(e).position),'fixed');
    assert.equal(await page.locator('#dxa-input').evaluate(e=>document.activeElement===e),true);
    await page.keyboard.press('Escape');assert.equal(await panel.isVisible(),false);
    assert.equal(await trigger.getAttribute('aria-expanded'),'false');
   };
   await visit('index.html');await checkAssistant();
   const expectedMenu=['index.html','questions.html','topics.html','fatwa.html','videos.html','ask.html','about.html','services.html','contact.html'];
   assert.deepEqual(await page.locator('#menu a').evaluateAll(links=>links.map(a=>a.getAttribute('href'))),expectedMenu);
   await page.click('#theme-toggle');assert.notEqual(await page.getAttribute('html','data-theme'),theme);await page.reload();assert.notEqual(await page.getAttribute('html','data-theme'),theme);await page.click('#theme-toggle');
   if(width<1100){await page.click('#burger');assert.equal(await page.getAttribute('#burger','aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.getAttribute('#burger','aria-expanded'),'false')}
   await page.evaluate(()=>scrollTo(0,1200));await page.waitForFunction(()=>document.querySelector('#back-to-top')?.classList.contains('is-visible'));await page.click('#back-to-top');await page.waitForFunction(()=>scrollY===0);
   for(const name of ['questions.html','fatwa.html']){await visit(name);await checkAssistant()}
   await visit('videos.html');await page.waitForSelector('.video-card');await page.waitForFunction(()=>document.querySelectorAll('.video-chips[data-kind="topic"] .chip').length>3);
   await checkOverflow(page,`${theme} ${width} videos loaded`);
   const dateLabel=await page.locator('.video-card time').first().textContent();
   assert(/[০-৯]/.test(dateLabel)===false&&/[0-9]/.test(dateLabel)&&/[\u0980-\u09ff]/.test(dateLabel),`video date should use Bengali month and Latin digits: ${dateLabel}`);
   if(width<=560){const box=page.locator('.video-chips[data-kind="topic"]');assert(await box.evaluate(e=>e.scrollWidth>e.clientWidth));for(const button of await box.locator('.chip').all())assert((await button.boundingBox()).height>=44)}
   const topic=page.locator('.video-chips[data-kind="topic"] .chip').nth(1);await topic.click();assert.equal(await topic.getAttribute('aria-pressed'),'true');
   await page.fill('#video-search','zzzznotavideo123');await page.waitForFunction(()=>document.querySelector('#video-grid').dataset.count==='0');await page.fill('#video-search','');await page.locator('.video-chips[data-kind="topic"] .chip').first().click();await page.waitForSelector('.video-card');
   // Let the search input's 140ms debounce finish before opening the player;
   // otherwise its pending render replaces the button while the dialog is open.
   await page.waitForTimeout(200);
   const videoButton=page.locator('.video-preview').first();await videoButton.click();
   const dialog=page.locator('.video-lightbox'),frame=dialog.locator('iframe');assert.equal(await dialog.getAttribute('open'),'');assert.equal(await frame.count(),1);
   const frameSrc=await frame.getAttribute('src');
   // Click both the backdrop and unused space inside the dialog: neither closes it.
   await page.mouse.click(1,1);assert.equal(await dialog.getAttribute('open'),'');assert.equal(await frame.getAttribute('src'),frameSrc);
   const box=await dialog.boundingBox();await page.mouse.click(box.x+5,box.y+5);assert.equal(await dialog.getAttribute('open'),'');assert.equal(await frame.getAttribute('src'),frameSrc);
   await page.keyboard.press('Escape');assert.equal(await dialog.getAttribute('open'),'');assert.equal(await frame.getAttribute('src'),frameSrc);
   await dialog.locator('.video-lightbox-close').focus();await page.keyboard.press('Enter');
   assert.equal(await dialog.getAttribute('open'),null);await page.waitForFunction(()=>!document.querySelector('.video-lightbox iframe'));assert(await videoButton.evaluate(el=>document.activeElement===el));
   await visit('read.html?k=1505f35ad3d6f0');await page.waitForFunction(()=>document.querySelector('#read-body')?.textContent.trim().length>30);
   await checkOverflow(page,`${theme} ${width} article loaded`);
   const size=await page.locator('#read-body').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));await page.click('#read-font-up');await page.waitForFunction(before=>parseFloat(getComputedStyle(document.querySelector('#read-body')).fontSize)>before,size);
   if(width<=560)assert((await page.locator('#read-font-up').boundingBox()).height>=44);
   await page.click('#read-save');assert.equal(await page.getAttribute('#read-save','aria-pressed'),'true');await page.reload();assert.equal(await page.getAttribute('#read-save','aria-pressed'),'true');
   await visit('read.html?k=0007877b4d24f5');await page.waitForFunction(()=>document.querySelector('#read-body')?.textContent.includes('লুক্বমান'));
   const articleText=await page.locator('#read-body').textContent();assert(!articleText.includes('প্রসঙ্গসমূহ')&&!articleText.includes('-->'));assert(articleText.includes('রাশেদুল ইসলাম'));
   const preserved=await page.evaluate(()=>{const html='<p>মূল লেখা</p><div class="subjects"><span>প্রসঙ্গসমূহ »: </span><a href="https://ikhlasbd.com/subject_archive/100">বিষয়</a></div><p>আরও লেখা</p>';return safeArticle(html,'','ik').textContent});
   assert(preserved.includes('প্রসঙ্গসমূহ')&&preserved.includes('আরও লেখা'));
   await visit('ask.html');await checkAssistant();
   if(width===390&&theme==='light'){
    let sent,requests=[];await context.route('https://dawahx-assistant.www-mdrazu55555.workers.dev/**',async route=>{
     if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
     sent=route.request().postDataJSON();requests.push(sent);
     if(sent.message==='ব্যর্থ পরীক্ষা')return route.fulfill({status:500,headers:{'Access-Control-Allow-Origin':'*'}});
     let data;if(!sent.lookupComplete&&sent.message==='হ্যালো')data={answer:'হ্যালো! কেমন আছেন?',grounded:false,mode:'chat',sources:[]};
     else if(!sent.lookupComplete&&['কুরআন ২:২৫৫','বুখারী ৮','quran er 2 number surah ki'].includes(sent.message))data={needs_sources:true,direct_lookup:true};
     else if(!sent.lookupComplete)data={needs_sources:true};
     else if(sent.message==='quran er 2 number surah ki')data={answer:'কুরআনের 2 নম্বর সূরা হলো আল-বাকারা। [1]',grounded:true,sources:[{number:1,type:'quran-surah',surah:2,title:'সূরা আল-বাকারা · সূরা নম্বর 2'}]};
     else if(sent.message==='কুরআন ২:২৫৫')data={answer:'আয়াত 2:255 [1]',grounded:true,sources:[{number:1,type:'quran',surah:2,verse:255,title:'সূরা আল-বাকারা · 2:255'}]};
     else if(sent.message==='বুখারী ৮')data={answer:'বুখারী 8 [1]',grounded:true,sources:[{number:1,type:'hadith',book:'bukhari',chapter:2,hadith:8,title:'সহীহ বুখারী · হাদিস 8'}]};
     else if(sent.message==='নামাজের গুরুত্ব কী?')data={answer:'কুরআন ও হাদিস [1] [2]',grounded:true,partial:true,sources:[{number:1,type:'quran',surah:2,verse:43,title:'সূরা আল-বাকারা · 2:43'},{number:2,type:'hadith',book:'bukhari',chapter:8,hadith:350,title:'সহীহ বুখারী · হাদিস 350'}]};
     else {const sources=sent.pages.includes('about.html')?[{number:1,path:'about.html',title:'আমাদের সম্পর্কে'}]:[{number:1,key:'034d218703d000',title:'উৎস লেখা'}];data={answer:'পরীক্ষিত উত্তর [1]',grounded:true,sources}}
     await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
    });
    await page.evaluate(()=>{window.assistantSearchCalls=0;window.assistantQueries=[];window.dawahxAssistantSearch=async q=>{window.assistantSearchCalls++;window.assistantQueries.push(q);return {texts:[],videos:new Promise(()=>{})}}});
    await page.locator('.dxa-trigger').click();await page.locator('#dxa-input').fill('হ্যালো');await page.locator('.dxa-form button').click();
    await page.waitForFunction(()=>document.querySelector('.dxa-message.assistant')?.textContent==='হ্যালো! কেমন আছেন?');
    assert.equal(requests.length,1);assert.equal(requests[0].lookupComplete,false);assert.equal(await page.evaluate(()=>window.assistantSearchCalls),0);assert((await page.locator('.dxa-mode').first().textContent()).includes('সাধারণ আলাপ'));
    await page.locator('#dxa-input').fill('একটি প্রশ্ন');await page.locator('.dxa-form button').click();
    await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===2);
    assert.equal(sent.message,'একটি প্রশ্ন');assert.equal(sent.lookupComplete,true);assert.deepEqual(sent.ids,[]);assert.deepEqual(sent.pages,[]);assert.equal(sent.scriptureSearch,true);assert.equal(sent.history.length,2);assert.equal(await page.locator('.dxa-sources a').first().getAttribute('href'),base+'read.html?k=034d218703d000');
    await page.locator('#dxa-input').fill('DAWAH X কে পরিচালনা করেন?');await page.locator('.dxa-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===3);assert(sent.pages.includes('about.html'));assert.equal(await page.locator('.dxa-sources a').last().getAttribute('href'),base+'about.html');
    await page.locator('#dxa-input').fill('এর দলিল কী?');await page.locator('.dxa-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===4);assert(await page.evaluate(()=>window.assistantQueries.some(q=>q.includes('DAWAH X কে পরিচালনা করেন?')&&q.includes('এর দলিল কী?'))));assert.equal(await page.locator('.dxa-video-pending').count()>0,true,'answer must not wait for slow videos');
    await page.locator('#dxa-input').fill('আরও বলুন');await page.locator('.dxa-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===5);assert(await page.evaluate(()=>window.assistantQueries.some(q=>q.includes('DAWAH X কে পরিচালনা করেন?')&&q.includes('এর দলিল কী?')&&q.includes('আরও বলুন'))));assert(sent.pages.includes('about.html'),'follow-up chain keeps site context');
    await page.locator('#dxa-input').fill('আজ রান্নার উপায় কী?');await page.locator('.dxa-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===6);assert.equal(await page.evaluate(()=>window.assistantQueries.at(-1)),'আজ রান্নার উপায় কী?');assert.deepEqual(sent.pages,[],'a new subject does not keep old site context');
    const searchCount=await page.evaluate(()=>window.assistantSearchCalls);
    await page.locator('#dxa-input').fill('কুরআন ২:২৫৫');await page.locator('.dxa-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===7);
    assert.equal(await page.evaluate(()=>window.assistantSearchCalls),searchCount,'direct lookup should not depend on the site search index');
    assert.equal(await page.locator('.dxa-sources a').nth(-2).getAttribute('href'),'https://ebrahim-ead.github.io/ead/quran.html#2:255');assert.equal(await page.locator('.dxa-sources a').last().getAttribute('href'),'https://quran.com/2/255');
    await page.locator('#dxa-input').fill('বুখারী ৮');await page.locator('.dxa-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===8);
    assert.equal(await page.locator('.dxa-sources a').nth(-2).getAttribute('href'),'https://ebrahim-ead.github.io/ead/hadith.html#bukhari:2:8');assert((await page.locator('.dxa-sources a').last().getAttribute('href')).startsWith('https://www.hadithbd.com/search/?q='));
    await page.locator('#dxa-input').fill('quran er 2 number surah ki');await page.locator('.dxa-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===9);
    assert((await page.locator('.dxa-message.assistant').last().textContent()).includes('আল-বাকারা'));assert.equal(await page.locator('.dxa-sources a').nth(-2).getAttribute('href'),'https://ebrahim-ead.github.io/ead/quran.html#2');assert.equal(await page.locator('.dxa-sources a').last().getAttribute('href'),'https://quran.com/2');
    await page.locator('#dxa-input').fill('ব্যর্থ পরীক্ষা');await page.locator('.dxa-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===10);assert.equal(await page.locator('#dxa-input').inputValue(),'ব্যর্থ পরীক্ষা','failed question should remain available for retry');
    await page.evaluate(()=>{window.dawahxAssistantSearch=async()=>{throw Error('offline')}});
    await page.locator('#dxa-input').fill('নামাজের গুরুত্ব কী?');await page.locator('.dxa-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.dxa-message.assistant').length===11);
    assert.equal(sent.scriptureSearch,true);assert.equal(sent.siteSearchFailed,true,'site search failure should not prevent scripture search');
    assert.equal(await page.locator('.dxa-sources a').nth(-4).getAttribute('href'),'https://ebrahim-ead.github.io/ead/quran.html#2:43');
    assert.equal(await page.locator('.dxa-sources a').nth(-2).getAttribute('href'),'https://ebrahim-ead.github.io/ead/hadith.html#bukhari:8:350');
    assert((await page.locator('.dxa-message.status').last().textContent()).includes('অসম্পূর্ণ'));
    await page.locator('.dxa-close').click();assert.equal(await page.locator('#dxa-panel').isVisible(),false);
   }
   if(width===390){
    const q=page.locator('#source-answer-question'),submit=page.locator('#source-answer-submit'),status=page.locator('#source-answer-status');
    await q.fill('লুক্বমান (আলাইহিস সালাম) কি নবী ছিলেন, না-কি ছালিহ ব্যক্তিদের অন্তর্ভুক্ত ছিলেন?');await submit.click();
    await page.waitForFunction(()=>document.querySelector('#source-answer-status').textContent.includes('একই শিরোনামের'));
    assert((await page.locator('#source-answer-results').textContent()).includes('রাশেদুল ইসলাম'));
    assert(await page.locator('#source-answer-results a[href^="read.html?k=0007877b4d24f5"]').count());
    await q.fill('মঙ্গলে নামাজ পড়া যাবে কি?');await submit.click();await page.waitForFunction(()=>document.querySelector('#source-answer-status').textContent.includes('পাওয়া যায়নি'));
    assert.equal(await page.locator('#source-answer-results .source-answer-body').count(),0);
    await q.fill('রোজা রেখে ইনজেকশন নিলে কি রোজা ভেঙে যায়?');await submit.click();await page.waitForFunction(()=>document.querySelector('#source-answer-status').textContent.includes('নিশ্চিত উত্তর শনাক্ত করা যায়নি'));
    assert((await page.locator('#source-answer-results .source-answer-links a').count())>0);assert.equal(await page.locator('#source-answer-results .source-answer-body').count(),0);
   }
   await page.click('#askbtn');assert.equal(await page.getAttribute('#an','aria-invalid'),'true');assert.equal(submissions.length,0);
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
  // Desktop breakpoints near the navigation's tightest layouts.
  for(const width of [1100,1180,1280]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
   page=await context.newPage();await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
   const bounds=await page.locator('#menu a').evaluateAll(links=>links.map(link=>{const b=link.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}}));
   assert.equal(bounds.length,9);for(let i=1;i<bounds.length;i++){assert(bounds[i].left>=bounds[i-1].right-1,`${width}px: overlapping navigation links`);assert(Math.abs(bounds[i].top-bounds[0].top)<2,`${width}px: wrapped navigation`)}
   const acts=await page.locator('.acts').boundingBox();assert(bounds.at(-1).right<=acts.x+1,`${width}px: navigation overlaps actions`);
   await checkOverflow(page,`${width}px desktop navigation`);await context.close();page=null;
  }
 }catch(error){
  if(page&&process.env.TEST_ARTIFACT_DIR){try{fs.mkdirSync(process.env.TEST_ARTIFACT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.TEST_ARTIFACT_DIR,'responsive-failure.png'),fullPage:true})}catch{}}
  throw error;
 }finally{await browser?.close();server.close()}
})().catch(error=>{console.error(error);if(process.env.GITHUB_ACTIONS)console.log('::error::'+String(error.stack||error).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1});
