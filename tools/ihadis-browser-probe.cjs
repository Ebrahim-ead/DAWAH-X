'use strict';
const {chromium}=require('playwright-core'),fs=require('fs'),zlib=require('zlib'),x=require('./ihadis-extract.cjs');
(async()=>{const out={};let browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:1200,height:9000},serviceWorkers:'block'});let problems=[];
 p.on('response',r=>{if(r.url().startsWith('https://ihadis.com/')&&[403,429,500,503].includes(r.status()))problems.push({status:r.status(),path:new URL(r.url()).pathname})});
 await p.route('**/*',route=>{let u=new URL(route.request().url());return u.hostname!=='ihadis.com'||['image','media','font'].includes(route.request().resourceType())?route.abort():route.continue()});
 try {let r=await p.goto('https://ihadis.com/100-hadith/2',{waitUntil:'domcontentloaded',timeout:45000});if(!r||r.status()!==200)throw Error('HTTP '+r?.status());await p.waitForTimeout(4000);let seen={},steps=0;
 for(;steps<50;steps++){let d=await p.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight,h:innerHeight,cards:Array.from(document.querySelectorAll('[id^="hadith-"]')).filter(e=>e.querySelector('h4')).map(e=>e.outerHTML)}));
 for(const c of d.cards){let v=x.chapter(c,'100-hadith',2).rows[0];if(v)seen[v.id]=v}if(problems.length)break;
 if(d.y+d.h>=d.height-10){await p.waitForTimeout(3000);let end=await p.evaluate(()=>scrollY+innerHeight>=document.documentElement.scrollHeight-10);if(end)break}
 await p.evaluate(()=>window.scrollBy(0,5000));await p.waitForTimeout(1200);
 }
 let snapshot=JSON.parse(zlib.gunzipSync(fs.readFileSync('tools/ihadis-100-hadith-snapshot.json.gz'))).sections.find(s=>s.id===2).rows;
 let missing=snapshot.filter(r=>!seen[r.id]).map(r=>r.id),different=snapshot.filter(r=>seen[r.id]&&JSON.stringify(r)!==JSON.stringify(seen[r.id])).map(r=>({id:r.id,old:r,new:seen[r.id]}));
 Object.assign(out,{steps,observed:Object.keys(seen).length,expected:snapshot.length,missing,different,problems});
 }catch(e){out.error=String(e);out.problems=problems}await browser.close();fs.writeFileSync('tools/ihadis-browser-probe-result.json',JSON.stringify(out,null,2));
})().catch(e=>fs.writeFileSync('tools/ihadis-browser-probe-result.json',JSON.stringify({error:String(e)})));
