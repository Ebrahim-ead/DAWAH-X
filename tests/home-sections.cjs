'use strict';
/* The requested home sections stay removed; the separate daily reading keeps rotating. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),script=fs.readFileSync(path.join(root,'features.js'),'utf8');
assert(!html.includes('id="latest-videos"'));assert(!html.includes('id="daily-guidance"'));
assert(!html.includes('id="guidance-title"'));assert(html.includes('href="videos.html"'));
const template=(html.match(/<template id="daily-reading-templates">([\s\S]*?)<\/template>/)||[])[1];assert(template,'daily reading template missing');
const articles=[...template.matchAll(/<article class="guidance-card">([\s\S]*?)<\/article>/g)];assert.equal(articles.length,4);
const cards=articles.map(([,body])=>{const title=(body.match(/<h3>([^<]+)<\/h3>/)||[])[1],source=(body.match(/<a class="guidance-source" href="(https:\/\/[^\"]+)"/)||[])[1];assert(title&&source,'daily card needs title and source');return {cloneNode:()=>({title,source})}});
const seen=new Set();for(let day=1;day<=4;day++){
 const daily={children:[],append(card){this.children.push(card)}},section={hidden:true};
 const document={getElementById(id){return id==='daily-reading-card'?daily:id==='daily-reading'?section:id==='daily-reading-templates'?{content:{querySelectorAll:()=>cards}}:null}};
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[`2026-01-0${day}T18:00:00Z`]))}}
 vm.runInNewContext(script,{document,Date:FakeDate,Intl});assert.equal(section.hidden,false);assert.equal(daily.children.length,1);seen.add(daily.children[0].title);
}
assert.equal(seen.size,4);console.log('home: requested sections absent; daily reading rotates through four sourced cards');
