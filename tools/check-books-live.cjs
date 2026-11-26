#!/usr/bin/env node
'use strict';
// Opt-in live test: one public PDF from the source host, served in our reader.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright-core');const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const name=decodeURIComponent(url.pathname).replace(/^\/project\//,'');if(!/^[a-z0-9.-]+$/.test(name)){res.writeHead(404).end();return;}fs.readFile(path.join(root,name),(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':(name.endsWith('.js')||name.endsWith('.mjs'))?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/project/islamic-books.html`,{waitUntil:'domcontentloaded'});
 await page.locator('.books-group summary').first().click();await page.locator('.books-volume').first().click();
 await page.waitForFunction(()=>/পৃষ্ঠা 1 \/ \d+/.test(document.querySelector('#books-status').textContent),null,{timeout:120000});
 assert.equal(await page.locator('#books-page-total').innerText(),'/ 740');assert((await page.locator('#books-canvas').evaluate(e=>e.width))>1);
 await page.locator('#books-next').click();await page.waitForFunction(()=>/পৃষ্ঠা 2 \/ \d+/.test(document.querySelector('#books-status').textContent),null,{timeout:60000});
 assert.deepEqual(errors,[]);console.log('Live source PDF: first and second pages rendered successfully in the site reader.');
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
