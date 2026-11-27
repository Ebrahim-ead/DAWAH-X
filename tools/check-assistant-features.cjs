'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r))};
(async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://example.test/DAWAH-X/index.html',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w.document,'currentScript',{value:{src:'https://example.test/DAWAH-X/assistant.js'}});w.TextEncoder=TextEncoder;w.AbortController=AbortController;let recognition,spoken=[],cancelled=0,payloads=[],searches=[];
 w.SpeechRecognition=class{constructor(){recognition=this}start(){}abort(){this.onend?.()}};
 w.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 w.speechSynthesis={getVoices:()=>[{lang:'bn-BD',name:'Bangla'}],speak:u=>spoken.push(u),cancel:()=>cancelled++};
 w.dawahxAssistantSearch=async q=>{searches.push(q);return {texts:[],videos:null}};
 w.fetch=async(_u,opts)=>{payloads.push(JSON.parse(opts.body));return new Response(JSON.stringify({answer:'উৎসের আলোকে উত্তর [1]।',sources:[{number:1,title:'মূল লেখা',key:'034d218703d000'}],grounded:true}),{headers:{'Content-Type':'application/json'}})};
 w.eval(fs.readFileSync('assistant.js','utf8'));const doc=w.document;doc.querySelector('.dxa-trigger').click();
 const input=doc.querySelector('#dxa-input'),form=doc.querySelector('.dxa-form');
 for(const text of ['রোজা কী?', 'আর বিস্তারিত বলুন', 'আরও বলুন', 'আর জানতে চাই', 'আমি সফরে থাকলে কী করব?']){input.value=text;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush()}
 assert.equal(payloads.length,5);assert.equal(payloads[4].history.length,8,'four preceding exchanges are sent, bounded');assert(searches.at(-1).includes('রোজা কী?'),'follow-up retains initial topic');
 assert.equal(spoken.length,0,'typed questions do not autoplay');
 doc.querySelector('.dxa-mic').click();assert(recognition);recognition.onresult({results:[Object.assign([{transcript:'রোজা কী?'}],{isFinal:true})]});await flush();
 assert.equal(spoken.length,1,'voice question automatically reads the answer');const stop=doc.querySelector('.dxa-voice-stop');assert.equal(stop.hidden,false);stop.click();assert.equal(stop.hidden,true);assert(cancelled>0);
 const shares=[...doc.querySelectorAll('.dxa-share a')];assert(shares.length);const message=new URL(shares.at(-1).href).searchParams.get('text'),match=message.match(/https:\/\/example\.test\/DAWAH-X\/assistant-share\.html#[A-Za-z0-9_-]+/);assert(match,'share link includes snapshot');
 const view=new JSDOM(fs.readFileSync('assistant-share.html','utf8'),{url:match[0],runScripts:'outside-only'});view.window.TextDecoder=TextDecoder;view.window.eval(fs.readFileSync('assistant-share.js','utf8'));
 assert.equal(view.window.document.querySelector('#question').textContent,'রোজা কী?');assert.equal(view.window.document.querySelector('#answer').textContent,'উৎসের আলোকে উত্তর [1]।');assert.equal(view.window.document.querySelector('#content').hidden,false);assert.equal(view.window.document.querySelector('#sources a').href,'https://example.test/DAWAH-X/read.html?k=034d218703d000');
 const malicious={v:1,q:'<img src=x onerror=alert(1)>',a:'untrusted',sources:[{title:'bad',href:'javascript:alert(1)'}]},badHash=Buffer.from(JSON.stringify(malicious)).toString('base64url');
 const bad=new JSDOM(fs.readFileSync('assistant-share.html','utf8'),{url:'https://example.test/DAWAH-X/assistant-share.html#'+badHash,runScripts:'outside-only'});bad.window.TextDecoder=TextDecoder;bad.window.eval(fs.readFileSync('assistant-share.js','utf8'));assert(bad.window.document.querySelector('#content').hidden,'forged external script URL rejected');assert.equal(bad.window.document.querySelector('#question').querySelector('img'),null,'shared text cannot become HTML');bad.window.close();
 const select=doc.querySelector('.dxa-filter select');select.value='quran';const before=searches.length;input.value='অন্য প্রশ্ন';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush();assert.equal(payloads.at(-1).sourceFilter,'quran');assert.equal(searches.length,before,'unselected article search does not run');
 doc.querySelector('.dxa-reset').click();input.value='নতুন বিষয়';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush();assert.equal(payloads.at(-1).history.length,0,'reset discards past conversation');
 view.window.close();dom.window.close();console.log('Assistant features: bounded context, voice/stop, share snapshot, filters and reset pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
