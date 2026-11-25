#!/usr/bin/env node
'use strict';
// Collect the site's rendered public chapter cards; never fill placeholders or
// guess missing numbers. Stop on blocking, network or consistency failures.
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {chromium}=require('playwright-core'),x=require('./ihadis-extract.cjs');
const slug=process.argv[2];if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug||''))throw Error('Supply one book slug');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const reportFile='tools/ihadis-collection-report.json',report=JSON.parse(fs.readFileSync(reportFile)).filter(r=>r.slug!==slug);let browser, page,block=[];
 try {
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  page=await browser.newPage({viewport:{width:1200,height:9000},serviceWorkers:'block'});
  page.on('response',r=>{if(r.url().startsWith('https://ihadis.com/')&&[403,429,500,502,503].includes(r.status()))block.push({status:r.status(),path:new URL(r.url()).pathname})});
  await page.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname!=='ihadis.com'||['image','media','font'].includes(route.request().resourceType())?route.abort():route.continue()});
  async function open(path){await sleep(1200);const r=await page.goto('https://ihadis.com'+path,{waitUntil:'domcontentloaded',timeout:60000});if(!r||r.status()!==200||block.length)throw Error('HTTP or site failure '+path+' '+JSON.stringify(block));return r.text()}
  let meta=x.index(await open('/'+slug),slug),sections=[],all=new Set();console.log('Book',slug,meta.expected,'chapters',meta.chapters.length);
  for(const ch of meta.chapters){
   let raw=await open('/'+slug+'/'+ch.id),base=x.chapter(raw,slug,ch.id),expected=new Set([...base.rows.map(r=>r.id),...base.missing]),rows=new Map(base.rows.map(r=>[r.id,r]));
   if(expected.size!==base.rows.length+base.missing.length)throw Error('Duplicate chapter ids '+ch.id);
   await page.waitForTimeout(3500);let sweeps=0,steps=0;
   while(rows.size<expected.size){
    if(block.length)throw Error('HTTP or site failure '+JSON.stringify(block));
    const state=await page.evaluate(()=>({y:scrollY,h:innerHeight,height:document.documentElement.scrollHeight,cards:Array.from(document.querySelectorAll('[id^="hadith-"]')).filter(e=>e.querySelector('h4')).map(e=>e.outerHTML)}));
    for(const html of state.cards){let row=x.chapter(html,slug,ch.id).rows[0];if(!row||!expected.has(row.id))throw Error('Unexpected rendered card '+ch.id+':'+row?.id);if(rows.has(row.id)&&JSON.stringify(rows.get(row.id))!==JSON.stringify(row))throw Error('Rendered/source mismatch '+ch.id+':'+row.id);rows.set(row.id,row)}
    if(rows.size===expected.size)break;
    if(++steps>1200)throw Error('Chapter scroll limit '+ch.id);
    if(state.y+state.h>=state.height-5){if(++sweeps>2)throw Error('Missing rendered cards '+ch.id+': '+[...expected].filter(id=>!rows.has(id)).join(','));await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(4000)}
    else {await page.evaluate(()=>window.scrollBy(0,4500));await page.waitForTimeout(1500)}
   }
   let ordered=[...rows.values()].sort((a,b)=>a.id-b.id);for(const row of ordered){if(all.has(row.id))throw Error('Repeated identity '+row.id);all.add(row.id)}
   sections.push({id:ch.id,name:ch.name,chapterSha256:base.sha256,rows:ordered});console.log('Chapter',slug,ch.id,'complete',ordered.length,'scrolls',steps);
  }
  if(all.size!==meta.expected)throw Error('Book count mismatch '+all.size+'/'+meta.expected);
  const snapshot={source:'https://ihadis.com/'+slug,extractedAt:new Date().toISOString(),meta,sections};const data=Buffer.from(JSON.stringify(snapshot));
  fs.writeFileSync(`tools/ihadis-${slug}-snapshot.json.gz`,zlib.gzipSync(data,{level:9,mtime:0}));report.push({slug,status:'complete',count:all.size,chapters:sections.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});console.log('Complete',slug,all.size);
 }catch(e){report.push({slug,status:'failed',error:String(e)});console.error('Stopped',slug,String(e));process.exitCode=1}
 finally{if(browser)await browser.close();fs.writeFileSync(reportFile,JSON.stringify(report,null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
