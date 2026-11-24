'use strict';
// Browser-controller regression with a minimal DOM and real Response objects.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.value='';this.hidden=false;this.offsetHeight=0;this.clientHeight=200;this.scrollTop=0;this.scrollHeight=0}
  append(...xs){for(const x of xs){x.parent=this;this.children.push(x)}} appendChild(x){this.append(x);return x}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
  setAttribute(){} focus(){} addEventListener(name,fn){this.listeners[name]=fn} querySelectorAll(){return []}
 }
 const body=new Element('body'),head=new Element('head'),panel=new Element('aside'),chat=new Element('div'),form=new Element('form'),input=new Element('textarea'),send=new Element('button'),close=new Element('button');
 panel.querySelector=s=>({'.dxa-chat':chat,'form':form,'textarea':input,'.dxa-close':close})[s];form.querySelector=()=>send;
 const document={currentScript:{src:'https://example.test/DAWAH-X/assistant.js'},head,body,createElement:tag=>tag==='aside'?panel:new Element(tag)};
 let calls=0,quota=false,quote=false;const fetch=async(_url,options)=>{calls++;const payload=JSON.parse(options.body);if(!payload.lookupComplete)return Response.json({needs_sources:true,all_sources:true});
  if(quote)return Response.json({answer:'মূল লেখা থেকে উদ্ধৃতি',grounded:false,mode:'source_quote',sources:[{number:1,title:'সাইটের লেখা',key:'1289166d87d0da'}]});
  return Response.json({error:'Assistant unavailable',error_code:'model_unavailable',...(quota?{model_reason:'quota'}:{}),partial:true,candidates:[{number:1,title:'সহীহ বুখারী · হাদিস 233',type:'hadith',book:'bukhari',chapter:4,hadith:233},{number:2,title:'সাইটের লেখা',key:'1289166d87d0da'},{number:3,title:'bad link',key:'../../malicious'}]}, {status:502})};
 const context={document,window:{dawahxAssistantSearch:async()=>({texts:[],videos:null,limited:true})},URL,fetch,Response,AbortController,TextEncoder,setTimeout,clearTimeout,console};
 vm.runInNewContext(fs.readFileSync('assistant.js','utf8'),context);input.value='উটের মূত্র পানের হাদিসটি বুঝিয়ে বলুন';form.listeners.submit({preventDefault(){}});
 for(let i=0;i<20&&send.disabled;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls,2);assert.equal(send.disabled,false);assert.equal(input.value,'উটের মূত্র পানের হাদিসটি বুঝিয়ে বলুন','question remains available for retry');
 const texts=chat.children.map(x=>x.textContent||'');assert(texts.some(x=>x.includes('এআই দিয়ে ব্যাখ্যা তৈরির সেবা এখন কাজ করছে না')));assert(texts.some(x=>x.includes('কিছু উৎসে অনুসন্ধান সম্পূর্ণ হয়নি')));
 const box=chat.children.find(x=>x.className==='dxa-sources');assert(box);assert.match(box.children[0].textContent,/প্রশ্নের উত্তর হিসেবে যাচাই করা হয়নি/);
 const links=box.children.filter(x=>x.tagName==='a').map(x=>x.href);assert(links.some(x=>x.includes('hadith.html#bukhari:4:233')));assert(links.some(x=>x.includes('read.html?k=1289166d87d0da')));assert(!links.some(x=>x.includes('malicious')));
 quota=true;form.listeners.submit({preventDefault(){}});for(let i=0;i<20&&send.disabled;i++)await new Promise(resolve=>setImmediate(resolve));assert(chat.children.some(x=>(x.textContent||'').includes('দৈনিক ব্যবহারের সীমা শেষ হয়েছে বলে জানিয়েছে')));
 quote=true;input.value='কোর্ট বিবাহ কি জায়েজ';form.listeners.submit({preventDefault(){}});for(let i=0;i<20&&send.disabled;i++)await new Promise(resolve=>setImmediate(resolve));
 assert(chat.children.some(x=>x.className==='dxa-mode'&&(x.textContent||'').includes('প্রযোজ্যতা যাচাই করা হয়নি')));
 assert(chat.children.some(x=>x.className==='dxa-sources'&&(x.children[0]?.textContent||'').includes('প্রশ্নের উত্তর হিসেবে যাচাই করা হয়নি')));
 assert(chat.children.some(x=>x.className==='dxa-message assistant'&&x.textContent==='মূল লেখা থেকে উদ্ধৃতি'));
 console.log('assistant outage UI: candidate links and source quotations are explicitly unverified and retry is available');
})().catch(e=>{console.error(e);process.exitCode=1});
