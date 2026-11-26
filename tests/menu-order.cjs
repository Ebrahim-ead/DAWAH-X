'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const expected=['index.html','quran.html','hadith.html','islamic-books.html','questions.html','topics.html','fatwa.html','videos.html','ask.html','about.html','contact.html'];
let pages=0;
for(const name of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
 const html=fs.readFileSync(path.join(root,name),'utf8'),nav=html.match(/<nav\b[^>]*\bid="menu"[^>]*>([\s\S]*?)<\/nav>/);
 if(!nav){assert(['404.html','__forms.html','googleb9626bdb2e3f9082.html'].includes(name),`${name}: expected shared navigation`);continue}
 const links=[...nav[1].matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/g)];
 assert.deepEqual(links.map(m=>m[1]),expected,`${name}: menu order`);
 const footer=html.match(/<footer\b[\s\S]*?<\/footer>/);assert(footer&&/<a\b[^>]*href="services\.html"[^>]*>সেবা সমূহ<\/a>/.test(footer[0]),`${name}: services remains in footer`);
 if(expected.includes(name)){
  const active=links.filter(([tag])=>tag.includes('aria-current="page"'));assert.equal(active.length,1,`${name}: active link`);assert.equal(active[0][1],name,`${name}: active page`);
 }
 pages++;
}
assert(pages>200,'generated pages included');console.log(`menu order: ${pages} shared headers match; current-page markers preserved`);
