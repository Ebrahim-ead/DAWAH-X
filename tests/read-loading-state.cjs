'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('read.html','utf8'),app=fs.readFileSync('app.js','utf8');
for(const id of ['read-save','quote-open','read-complete','read-find-videos'])assert(new RegExp('<button\\b[^>]*id="'+id+'"[^>]*\\bdisabled\\b').test(html),id+' must start disabled');
assert.match(app,/body\.dataset\.loaded="true"/);assert.match(fs.readFileSync('features.js','utf8'),/body\.dataset\.loaded!==['"]true['"]/);assert.match(fs.readFileSync('quote-card.js','utf8'),/body\.dataset\.loaded!==['"]true['"]/);
const start=app.indexOf('const readTools=$("read-tools")'),end=app.indexOf('/* ===== সাইট জুড়ে সার্চ',start);assert(start>=0&&end>start);
function el(id){return {id,style:{setProperty(){},getPropertyValue(){return '1'}},dataset:{},textContent:'',events:{},attrs:{},addEventListener(t,f){this.events[t]=f},setAttribute(n,v){this.attrs[n]=v}}}
const nodes=Object.fromEntries(['read-tools','read','read-body','read-title','read-cat','read-save','read-save-label','read-saved-count'].map(id=>[id,el(id)]));nodes['read-title'].textContent='একটি লেখা';
let storage={},blocked=false;const localStorage={getItem:k=>storage[k]||null,setItem(k,v){if(blocked)throw Error('storage disabled');storage[k]=v}};
const context={$:id=>nodes[id]||null,URLSearchParams,location:{search:'?k=0007877b4d24f5'},localStorage,formatCount:x=>String(x),window:{}};
vm.runInNewContext(app.slice(start,end),context);
assert(nodes['read-save'].disabled);nodes['read-save'].events.click();assert.equal(storage['dawahx-saved'],undefined,'missing/failed article cannot be saved');
nodes['read-body'].dataset.loaded='true';blocked=true;nodes['read-save'].events.click();assert.equal(nodes['read-save-label'].textContent,'সংরক্ষণ করা যায়নি');assert.equal(storage['dawahx-saved'],undefined);
blocked=false;nodes['read-save'].events.click();assert.equal(JSON.parse(storage['dawahx-saved'])[0].k,'0007877b4d24f5');assert.equal(nodes['read-save'].attrs['aria-pressed'],'true');
console.log('reader: missing article controls and storage failure feedback pass');
