'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {excerptSource}=require('../tools/article-excerpt.cjs');
const nav='<div class="subjects"> <span>প্রসঙ্গসমূহ »: </span> <a href="https://ikhlasbd.com/subject_archive/100">প্রশ্নোত্তর</a> </div>';
const original='<p>মূল লেখা</p><!-- <script>bad()</script> --><!--</ul>--> '+nav;
assert.equal(excerptSource(original,'ik').trim(),'<p>মূল লেখা</p>');
assert(excerptSource(original,'ai').includes(nav),'other sources retain their subject block');
assert(excerptSource(original+'<p>পরবর্তী লেখা</p>','ik').includes(nav),'nonterminal content is retained');
assert(excerptSource('<p>প্রসঙ্গসমূহ একটি আলোচনার অংশ</p>','ik').includes('প্রসঙ্গসমূহ'));
let scanned=0;
for(const f of fs.readdirSync(path.join(root,'s'))){
 if(!/^[0-9a-f]{14}\.html$/.test(f))continue;
 const html=read('s/'+f),body=html.match(/<div class="article-body">([\s\S]*?)<\/div>/);
 assert(body,`${f}: missing body`);assert(!/(?:--&gt;\s*){2}|প্রসঙ্গসমূহ »:/.test(body[1]),`${f}: source navigation or comment leaked`);scanned++;
}
assert(scanned>24000);
const faq=read('faq.html'),items=[...faq.matchAll(/<article class="faq-item">([\s\S]*?)<\/article>/g)];
assert.equal(items.length,30);for(const [,item] of items)assert(!/(?:--&gt;\s*){2}|প্রসঙ্গসমূহ »:/.test(item));
const faqSchema=JSON.parse(faq.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(faqSchema.mainEntity.length,30);for(const q of faqSchema.mainEntity)assert(!/(?:-->\s*){2}|প্রসঙ্গসমূহ »:/.test(q.acceptedAnswer.text));
const videos=read('videos.html'),channels=JSON.parse(read('tools/video-channels.json')).channels;
for(const c of channels){const id=c.handle||'channel/'+c.channelId;assert(videos.includes('youtube.com/'+id),`missing fallback channel ${id}`)}
assert(!videos.includes('চারটি YouTube চ্যানেলের'));
const gallery=read('youtube-gallery.js');const formatter=gallery.match(/const dateFormat=(new Intl\.DateTimeFormat\([^;]+\));/);assert(formatter);
const dateFormat=vm.runInNewContext(formatter[1],{Intl});assert.match(dateFormat.format(new Date('2026-11-19T20:00:00Z')),/20 নভেম্বর, 2026/);
const app=read('app.js');const step=app.match(/const step=now=>\{const t=(.+?),eased=1-Math\.pow\(1-t,3\);/);assert(step);
const progress=vm.runInNewContext(`(now,t0,dur)=>${step[1]}`);assert.equal(progress(90,100,1000),0);assert.equal(progress(600,100,1000),0.5);assert.equal(progress(1200,100,1000),1);
assert(read('.github/workflows/build-data.yml').includes("'tools/article-excerpt.cjs'"));
console.log(`audit fixes: ${scanned} article pages, FAQ, source navigation, channel links, dates and counter bounds passed`);
