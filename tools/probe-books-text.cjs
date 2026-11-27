#!/usr/bin/env node
'use strict';
// Opt-in feasibility probe: reads a few pages from three public PDFs, does not
// save or index PDF text, and reports character counts rather than excerpts.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'islamic-books-catalog.js'),'utf8'),ctx);
const picks=['bidaya','ibnkathir','ahmad'].map(id=>ctx.window.ISLAMIC_BOOKS.find(x=>x.id===id).items[0]);
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/project\//,'');if(!/^[a-z0-9.-]+$/.test(name)){res.writeHead(404).end();return;}fs.readFile(path.join(root,name),(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':/\.(js|mjs)$/.test(name)?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/project/islamic-books.html`,{waitUntil:'domcontentloaded'});
 let results=[];for(const [i,item] of picks.entries()){if(i)await new Promise(r=>setTimeout(r,11000));try{
  const stats=await page.evaluate(async url=>{const pdf=await import('./books-pdf.min.mjs');pdf.GlobalWorkerOptions.workerSrc='books-pdf.worker.min.mjs';let task=pdf.getDocument({url,isEvalSupported:false}),doc=await task.promise;try{let pages=[1,Math.min(10,doc.numPages),Math.min(60,doc.numPages)];let out=[];for(const n of [...new Set(pages)]){const p=await doc.getPage(n),t=await p.getTextContent(),text=t.items.map(x=>x.str||'').join(' ');out.push({page:n,characters:text.length,bengali:(text.match(/[\u0980-\u09ff]/g)||[]).length,replacement:(text.match(/\ufffd/g)||[]).length});}return {pages:doc.numPages,samples:out};}finally{await doc.destroy();}},item.pdf);
  results.push({id:item.id,...stats});
 }catch(e){results.push({id:item.id,error:String(e.message||e).slice(0,200)});}}
 const summary=JSON.stringify(results);console.log('PDF_TEXT_PROBE '+summary);if(process.env.GITHUB_ACTIONS)console.log('::notice title=PDF text feasibility::'+summary);if(results.some(x=>x.error))process.exitCode=1;
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
