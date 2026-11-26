#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{TextDecoder}=require('node:util'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
async function wait(fn){for(let i=0;i<500;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('search timeout');}
function setup(fail=''){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'search-all.html'),'utf8'),{url:'https://example.test/DAWAH-X/search-all.html',runScripts:'outside-only'}),w=dom.window,requests=[];w.TextDecoder=TextDecoder;
 w.fetch=async(url)=>{requests.push(url);if(url.includes(fail)&&fail)throw Error('simulated failure');let bytes=fs.readFileSync(path.join(root,url));return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}};
 w.dawahxAssistantSearch=async()=>({texts:[{k:'example',title:'প্রশ্ন ও উত্তর',side:'q'}]});
 for(const f of ['scripture-fflate.js','islamic-books-catalog.js','unified-search.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 async function search(q){w.document.querySelector('#unified-query').value=q;w.document.querySelector('#unified-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>!w.document.querySelector('#unified-status').textContent.includes('চলছে'));}
 return {dom,w,requests,search};
}
(async()=>{
 let {dom,w,requests,search}=setup();await search('আল্লাহ');let d=w.document;
 assert(d.querySelector('#unified-quran a[href*="quran.html#/s/"]'),'Quran result link');assert(d.querySelector('#unified-hadith a[href*="hadith.html#/hadith2/"]'),'Hadith result link');assert(d.querySelector('#unified-articles a[href*="read.html?k=example"]'));assert(requests.filter(x=>x.startsWith('scripture-hadith-')).length<=24);assert.match(d.querySelector('#unified-hadith').textContent,/সংস্করণ|অনুলিপি|আল-হাদিস|ইসলাম/);
 await search('উসমানী');assert.equal(d.querySelectorAll('#unified-books a').length,3);assert.match(d.querySelector('#unified-books a').href,/islamic-book-read.html\?book=tafsir-usmani/);
 await search('zzzxxyy');assert.match(d.querySelector('#unified-hadith').textContent,/কোনো মিল পাওয়া যায়নি/);dom.window.close();
 ({dom,w,search}=setup('unified-search/quran.json'));await search('আল্লাহ');assert.match(w.document.querySelector('#unified-quran').textContent,/সম্পূর্ণ হয়নি/);assert.match(w.document.querySelector('#unified-status').textContent,/অসম্পূর্ণ/);dom.window.close();
 ({dom,w,search}=setup('scripture-hadith-'));await search('আল্লাহ');assert.match(w.document.querySelector('#unified-hadith').textContent,/ফাইল পাওয়া যায়নি/);assert.match(w.document.querySelector('#unified-status').textContent,/অসম্পূর্ণ/);dom.window.close();
 console.log('Unified search: source-verified hadith, Quran, article, book metadata, bounded requests and partial failures pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
