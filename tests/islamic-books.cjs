'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=JSON.parse(fs.readFileSync('tools/islamic-books-source.json','utf8'));assert.deepEqual(source.errors,[]);
const context={window:{}};vm.runInNewContext(fs.readFileSync('islamic-books-catalog.js','utf8'),context);
const groups=JSON.parse(JSON.stringify(context.window.ISLAMIC_BOOKS));assert.equal(groups.length,10);const ids=new Set();
for(let i=0;i<groups.length;i++){
 const [g,s]=[groups[i],source.categories[i]];assert.equal(g.id,s.id);assert.equal(g.items.length,s.expected);
 g.items.forEach((item,j)=>{assert.deepEqual({name:item.name,page:item.page,pdf:item.pdf},s.items[j]);assert(!ids.has(item.id));ids.add(item.id);const p=new URL(item.pdf),link=new URL(item.page);assert.equal(p.origin,'https://book.tauhiderdak.com');assert.equal(link.origin,p.origin);assert.match(p.pathname,/^\/wp-content\/uploads\/.+\.pdf$/i);assert.match(link.pathname,/^\/flipbook\//);});
}
assert.equal(ids.size,102);assert.deepEqual(groups.map(x=>x.items.length),[14,21,22,3,7,8,3,10,12,2]);
assert.deepEqual(groups.find(x=>x.id==='usmani').items.map(x=>x.id),['tafsir-usmani-1-pdf','tafsir-usmani-2-pdf','tafsir-usmani-7-pdf']);
const html=fs.readFileSync('islamic-books.html','utf8'),js=fs.readFileSync('islamic-books.js','utf8');
assert.match(html,/ফাইল এই সাইটে সংরক্ষিত নয়/);assert.match(html,/aria-live="polite"/);assert.match(js,/lib\.getDocument\(\{url:item\.pdf,isEvalSupported:false\}\)/);assert.match(js,/বইটি লোড করা যায়নি/);assert.match(html,/islamic-books-credits\.md/);
console.log('Islamic books: 10 series and 102 source-matched volume links, editions, gaps and disclosure verified');
