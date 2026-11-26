'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('style.css','utf8');
// The two-column rule must not be restricted to a phone-only media query.
assert.match(css,/\.fg ul\.qlinks\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
const expected=['index.html','quran.html','hadith.html','islamic-books.html','about.html','services.html','questions.html','topics.html','fatwa.html','videos.html','ask.html','contact.html','saved.html','policy.html'];
let count=0;
for(const page of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){
 const html=fs.readFileSync(page,'utf8');
 if(!/<nav\b[^>]*\bid="menu"/.test(html))continue;
 const list=html.match(/<ul class="qlinks">([\s\S]*?)<\/ul>/);
 assert.ok(list,`${page} must use the shared quick links layout`);
 const links=[...list[1].matchAll(/<li><a href="([^"]+)">([^<]+)<\/a><\/li>/g)];
 assert.deepEqual(links.map(x=>x[1]),page==='saved.html'?expected.slice(0,12):expected,`${page} must retain all quick links in order`);
 assert.equal(links.find(x=>x[1]==='islamic-books.html')[2],'ইসলামিক বই',`${page} must label the books link`);
 count++;
}
assert(count>200,'all generated shared-shell pages included');
const footer=html=>html.match(/<footer id="footer">[\s\S]*?<\/footer>/)?.[0];
const shared=footer(fs.readFileSync('index.html','utf8'));
assert.ok(shared);
for(const page of ['quran.html','hadith.html']) assert.equal(footer(fs.readFileSync(page,'utf8')),shared,`${page} must use the main site's footer`);
console.log(`Footer quick links: Islamic books and all other links verified on ${count} shared-shell pages.`);
