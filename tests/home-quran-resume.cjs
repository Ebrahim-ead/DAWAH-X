'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),script=fs.readFileSync('features.js','utf8');
assert.match(html,/<a class="scripture-resume" id="scripture-resume" href="quran.html" hidden><\/a>/);
function start(value,throws=false){
 let stored=value;const handlers={},resume={hidden:true,textContent:'',href:''};
 const document={getElementById(id){return id==='scripture-resume'?resume:null}};
 const localStorage={getItem(key){assert.equal(key,'dawahx-quran:last');if(throws)throw Error('disabled');return stored}};
 const window={addEventListener(name,fn){handlers[name]=fn}};
 vm.runInNewContext(script,{document,window,localStorage});
 return {resume,handlers,set(value){stored=value}};
}
let h=start(JSON.stringify('2:255'));
assert.equal(h.resume.hidden,false);assert.equal(h.resume.href,'quran.html#/s/2/a/255');assert.match(h.resume.textContent,/2:255/);
h.set(JSON.stringify('3:4'));h.handlers.storage({key:'dawahx-quran:last'});assert.equal(h.resume.href,'quran.html#/s/3/a/4');
for(const value of [null,'bad json',JSON.stringify('115:1'),JSON.stringify('2:0'),JSON.stringify('2:999'),JSON.stringify('<svg>'),JSON.stringify({s:1})])assert.equal(start(value).resume.hidden,true);
assert.equal(start(null,true).resume.hidden,true);
console.log('home Quran resume: valid local reference, live updates, invalid data and blocked storage pass');
