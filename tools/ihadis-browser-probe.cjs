'use strict';
// Temporary investigation: collect only text cards rendered by ordinary page navigation.
const {chromium}=require('playwright-core');const fs=require('fs');
(async()=>{const result=[];const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const path of ['/100-hadith/2','/riyadus-salihin/1']){const page=await browser.newPage({viewport:{width:1100,height:900},serviceWorkers:'block'});let problems=[];
 page.on('response',r=>{if(r.url().startsWith('https://ihadis.com/')&&[403,429,500,503].includes(r.status()))problems.push({status:r.status(),path:new URL(r.url()).pathname})});
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='ihadis.com'||['image','media','font'].includes(route.request().resourceType()))return route.abort();return route.continue()});
 try {let r=await page.goto('https://ihadis.com'+path,{waitUntil:'domcontentloaded',timeout:45000});if(!r||r.status()!==200)throw Error('HTTP '+(r&&r.status()));await page.waitForTimeout(3000);
 let seen={},headers={},traces=[];for(let i=0;i<110;i++){
  let x=await page.evaluate(()=>({position:window.scrollY,height:document.documentElement.scrollHeight,viewport:innerHeight,cards:Array.from(document.querySelectorAll('[id^="hadith-"]')).map(el=>({id:el.id,full:!!el.querySelector('h4'),html:el.querySelector('h4')?el.outerHTML:''}))}));
  for(let c of x.cards){headers[c.id]=true;if(c.full)seen[c.id]=c.html}if(i%10===0)traces.push({position:x.position,height:x.height,cards:x.cards.length,complete:Object.keys(seen).length});
  if(problems.length||x.position+x.viewport>=x.height-3)break;
  await page.evaluate(()=>window.scrollBy(0,600));await page.waitForTimeout(900);
 }
 result.push({path,complete:Object.keys(seen),headers:Object.keys(headers),examples:Object.values(seen).slice(-2),traces,problems});
 }catch(e){result.push({path,error:String(e),problems})}await page.close();if(problems.length)break;
 }await browser.close();fs.writeFileSync('tools/ihadis-browser-probe-result.json',JSON.stringify(result,null,2));
})().catch(e=>{fs.writeFileSync('tools/ihadis-browser-probe-result.json',JSON.stringify({error:String(e)}))});
