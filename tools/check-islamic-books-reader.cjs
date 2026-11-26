#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
async function wait(fn,label){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out: '+label);}
function setup(file,query='',options={}){
 const dom=new JSDOM(fs.readFileSync(file,'utf8'),{url:'https://example.test/project/'+file+query,runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>({});if(options.storage)w.localStorage.setItem('dawahx-books-progress-v1',options.storage);
 let requested=[];w.pdfjsLib={GlobalWorkerOptions:{},getDocument({url,isEvalSupported}){assert.equal(isEvalSupported,false);requested.push(url);return {promise:options.fail?Promise.reject(Error('network')):Promise.resolve({numPages:10,getPage:async()=>({getViewport:({scale})=>({width:600*scale,height:800*scale}),render:()=>({promise:Promise.resolve(),cancel(){}})}),destroy(){}}),destroy(){}}}};
 w.eval(fs.readFileSync('islamic-books-catalog.js','utf8'));w.eval(fs.readFileSync('islamic-books.js','utf8'));
 return {dom,w,requested,$:s=>w.document.querySelector(s)};
}
(async()=>{
 let {dom,w,$}=setup('islamic-books.html');assert.equal(w.document.querySelectorAll('.books-card').length,10);assert.match($('#books-count').textContent,/102/);
 $('#books-search').value='উসমানী';$('#books-search').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelectorAll('.books-card:not([hidden])').length,1);assert.match($('#books-count').textContent,/3টি/);
 $('#books-search').value='';$('#books-search').dispatchEvent(new w.Event('input'));w.document.querySelector('[data-filter="হাদিস"]').click();assert.equal(w.document.querySelectorAll('.books-card:not([hidden])').length,1);assert.match($('#books-count').textContent,/2টি/);dom.window.close();
 ({dom,w,$}=setup('islamic-book-collection.html','?collection=usmani'));assert.equal(w.document.querySelectorAll('.books-volume').length,3);assert.match($('#collection-title').textContent,/উসমানী/);
 $('#volume-search').value='৭';$('#volume-search').dispatchEvent(new w.Event('input'));assert.equal(w.document.querySelectorAll('.books-volume:not([hidden])').length,1);assert.match(w.document.querySelector('.books-volume:not([hidden])').href,/tafsir-usmani-7-pdf/);dom.window.close();
 ({dom,$}=setup('islamic-book-collection.html','?collection=invalid'));assert.equal($('#collection-error').hidden,false);dom.window.close();
 let requested;({dom,w,requested,$}=setup('islamic-book-read.html','?book=tafsir-usmani-1-pdf&page=4'));await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 4 / 10'),'shared page');
 assert.equal(requested[0],w.ISLAMIC_BOOKS.find(x=>x.id==='usmani').items[0].pdf);assert.equal(w.pdfjsLib.GlobalWorkerOptions.workerSrc,'books-pdf.worker.min.mjs');assert.match($('#books-back').href,/collection=usmani/);assert.equal($('#books-previous-volume').hidden,true);assert.equal($('#books-next-volume').hidden,false);
 $('#books-next').click();await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 5 / 10'),'next page');assert.match(w.location.search,/page=5/);
 $('#books-page').value='৭';$('#books-jump').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 7 / 10'),'Bengali digits jump');
 $('#books-scale').value='1.5';$('#books-scale').dispatchEvent(new w.Event('change',{bubbles:true}));await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 7 / 10'),'zoom');
 const storage=w.localStorage.getItem('dawahx-books-progress-v1');assert.equal(JSON.parse(storage).pages['tafsir-usmani-1-pdf'],7);dom.window.close();
 ({dom,w,$}=setup('islamic-books.html','',{storage}));assert.equal($('#books-resume').hidden,false);assert.match($('#books-resume-link').href,/page=7/);dom.window.close();
 ({dom,w,$}=setup('islamic-book-read.html','?book=tafsir-usmani-1-pdf',{storage}));await wait(()=>$('#books-status').textContent.includes('পৃষ্ঠা 7 / 10'),'resume');dom.window.close();
 ({dom,$}=setup('islamic-book-read.html','?book=invalid'));assert.equal($('#books-error').hidden,false);dom.window.close();
 ({dom,$}=setup('islamic-book-read.html','?book=tafsir-usmani-1-pdf',{fail:true}));await wait(()=>$('#books-status').textContent.includes('লোড করা যায়নি'),'network failure');assert($('#books-prev').disabled);assert.equal($('#books-retry').hidden,false);assert($('#books-original').href.includes('.pdf'));dom.window.close();
 console.log('Islamic books: separate pages, search, filters, source loading, pagination, resume, zoom, invalid IDs and failure pass (mocked jsdom)');
})().catch(e=>{console.error(e);process.exitCode=1;});
