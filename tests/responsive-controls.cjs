'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('read.html','utf8');
for(const [id,visible] of [['read-font-down','A−'],['read-font-up','A+']]){
 const tag=html.match(new RegExp(`<button\\b[^>]*id="${id}"[^>]*>[^<]*</button>`))?.[0];
 assert(tag,`${id} button exists`);
 assert(tag.includes(`aria-label="${visible} `),`${id} accessible name contains its visible text`);
 assert(tag.includes(`>${visible}</button>`));
}
const gallery=fs.readFileSync('youtube-gallery.js','utf8');
assert.match(gallery,/image\.alt=''/);
assert.match(gallery,/button\.setAttribute\('aria-label','নতুন — '\+video\.title/);
assert.match(gallery,/play\.setAttribute\('aria-hidden','true'\)/);
assert.match(gallery,/image\.hidden=true;button\.classList\.add\('thumb-unavailable'\)/);
const css=fs.readFileSync('style.css','utf8');
assert.match(css,/\.video-chips\{[^}]*flex-wrap:nowrap;overflow-x:auto/);
assert.match(css,/\.video-chips \.chip\{[^}]*min-height:44px/);
assert.match(css,/\.read-tools \.tool-btn\{min-height:44px/);
console.log('responsive controls: accessible names, touch targets and thumbnail fallback pass');
