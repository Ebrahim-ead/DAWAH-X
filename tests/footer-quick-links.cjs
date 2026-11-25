'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('style.css','utf8');
// The two-column rule must not be restricted to a phone-only media query.
assert.match(css,/\.fg ul\.qlinks\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
for(const page of ['index.html','questions.html','topics.html','series.html']){
 const html=fs.readFileSync(page,'utf8');
 const list=html.match(/<ul class="qlinks">([\s\S]*?)<\/ul>/);
 assert.ok(list,`${page} must use the shared quick links layout`);
 assert.equal((list[1].match(/<li>/g)||[]).length,13,`${page} must retain every quick link`);
}
console.log('Footer quick links: two-column shared layout and links verified.');
