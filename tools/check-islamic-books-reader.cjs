#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('islamic-books.html','utf8');
async function wait(fn,label){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out: '+label);}
function setup(hash=''){
 const dom=new JSDOM(html,{url:'https://example.test/project/islamic-books.html'+hash,runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>({});
 let requested=[];w.pdfjsLib={GlobalWorkerOptions:{},getDocument({url}){requested.push(url);return {promise:url.includes('fail.pdf')?Promise.reject(Error('network')):Promise.resolve({numPages:10,getPage:async()=>({getViewport:({scale})=>({width:600*scale,height:800*scale}),render:()=>({promise:Promise.resolve(),cancel(){}})}),destroy(){}}),destroy(){}}}};
 w.eval(fs.readFileSync('islamic-books-catalog.js','utf8'));w.eval(fs.readFileSync('islamic-books.js','utf8'));
 return {dom,w,requested,$:s=>w.document.querySelector(s)};
}
(async()=>{
 let {dom,w,requested,$}=setup();assert.equal(w.document.querySelectorAll('.books-group').length,10);assert.equal(w.document.querySelectorAll('.books-volume').length,102);assert.match($('#books-count').textContent,/১০২|102/);
 $('#books-search').value='উসমানী';$('#books-search').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelectorAll('.books-group:not([hidden])').length,1);assert.equal(w.document.querySelectorAll('.books-group:not([hidden]) li:not([hidden])').length,3);
 w.document.querySelector('.books-group:not([hidden]) .books-volume').click();await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 1 / 10'),'render first PDF page');
 assert.equal(requested[0],w.ISLAMIC_BOOKS.find(x=>x.id==='usmani').items[0].pdf);assert.equal(w.pdfjsLib.GlobalWorkerOptions.workerSrc,'books-pdf.worker.min.mjs');assert(!$('#books-reader').hidden);assert($('#books-prev').disabled);assert(!$('#books-next').disabled);
 $('#books-next').click();await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 2 / 10'),'next page');assert.match(w.location.hash,/page=2/);
 $('#books-page').value='৭';$('#books-jump').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 7 / 10'),'Bengali digits jump');
 $('#books-scale').value='1.5';$('#books-scale').dispatchEvent(new w.Event('change',{bubbles:true}));await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 7 / 10'),'zoom');
 const hash=w.location.hash;$('#books-close').click();assert($('#books-reader').hidden);assert.equal(w.location.hash,'');dom.window.close();
 ({dom,w,requested,$}=setup(hash));await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 7 / 10'),'restore shared page');assert.equal(requested.length,1);dom.window.close();
 ({dom,w,requested,$}=setup());w.ISLAMIC_BOOKS[0].items[0].pdf='https://book.tauhiderdak.com/fail.pdf';w.document.querySelector('.books-volume').click();await wait(()=>$('#books-status').textContent.includes('লোড করা যায়নি'),'network failure');assert($('#books-prev').disabled);assert($('#books-original').href.includes('fail.pdf'));dom.window.close();
 console.log('Islamic books reader: search, source PDF loading, pagination, Bengali jump, zoom, share hash and failure pass (mocked jsdom)');
})().catch(e=>{console.error(e);process.exitCode=1;});
