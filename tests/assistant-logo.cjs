'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};this.hidden=false;this.focused=false}
 append(...items){this.children.push(...items)} appendChild(item){this.append(item)}
 setAttribute(k,v){this.attrs[k]=v} addEventListener(k,fn){this.listeners[k]=fn} focus(){this.focused=true} querySelectorAll(){return []}
}
const body=new Element('body'),head=new Element('head'),panel=new Element('aside'),chat=new Element('div'),form=new Element('form'),input=new Element('textarea'),send=new Element('button'),close=new Element('button');
panel.querySelector=s=>({'.dxa-chat':chat,form,textarea:input,'.dxa-close':close})[s];form.querySelector=()=>send;
const document={currentScript:{src:'https://example.test/DAWAH-X/assistant.js'},head,body,createElement:tag=>tag==='aside'?panel:new Element(tag)};
vm.runInNewContext(fs.readFileSync('assistant.js','utf8'),{document,URL});
const trigger=body.children[0],img=trigger.children[0];
assert.equal(trigger.tag,'button');assert.equal(trigger.attrs['aria-label'],'এআই সহকারী চ্যাট খুলুন');assert.equal(trigger.attrs['aria-expanded'],'false');
assert.equal(img.tag,'img');assert.equal(img.src,'https://example.test/DAWAH-X/assistant-logo.webp');assert.equal(img.alt,'');assert.equal(img.width,72);assert.equal(img.height,72);assert(fs.existsSync('assistant-logo.webp'));
assert(!panel.innerHTML.includes('দৈনন্দিন বিষয়ে গল্প করুন।'),'long welcome paragraph is not shown');
assert(panel.innerHTML.includes('কী জানতে চান?'),'short welcome heading remains');
assert.equal(panel.hidden,true);trigger.listeners.click();assert.equal(panel.hidden,false);assert.equal(trigger.attrs['aria-expanded'],'true');assert(input.focused);
close.listeners.click();assert.equal(panel.hidden,true);assert.equal(trigger.attrs['aria-expanded'],'false');assert(trigger.focused);
assert(fs.readFileSync('sw.js','utf8').includes("'assistant-logo.webp'"),'logo is available in offline shell');
const css=fs.readFileSync('assistant.css','utf8');assert.match(css,/\.dxa-trigger\{[^}]*border-radius:50%/,'launcher is circular');assert.match(css,/\.dxa-trigger img\{[^}]*object-fit:contain/,'keep the supplied image visible without stretching');
console.log('assistant logo: relative asset, accessible button and open/close behavior pass');
