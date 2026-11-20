'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('fatwa.html','utf8');
const panel=html.split('<div class="library-links">')[1].split('<div class="library-summary">')[0];
const tags=panel.match(/<\/?a(?:\s[^>]*)?>/g)||[];
assert.equal(tags.length,12,'ফতোয়ার ছয়টি বিভাগে ছয়টি পূর্ণ লিংক থাকতে হবে');
for(let i=0;i<tags.length;i+=2){assert.match(tags[i],/^<a\s/);assert.equal(tags[i+1],'</a>')}
const cats=[...panel.matchAll(/data-cat="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(cats).size,6,'বিভাগগুলোর লিংক আলাদা হতে হবে');
assert.equal((panel.match(/href="#fchips"/g)||[]).length,6);
console.log('fatwa panel: six separate category links pass');
