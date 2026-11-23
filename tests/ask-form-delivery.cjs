'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const src=fs.readFileSync('app.js','utf8'),start=src.indexOf('/* ===== প্রশ্ন পাঠানো ====='),end=src.indexOf('/* ---- পড়ার জায়গা মনে রাখা',start);assert(start>=0&&end>start);
 function element(id,value=''){return {id,value,style:{},dataset:{},children:[],events:{},textContent:'',disabled:false,addEventListener(type,fn){this.events[type]=fn},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items;this.textContent=''},setAttribute(){},removeAttribute(){},focus(){},select(){},setSelectionRange(){},remove(){}}}
 const nodes=Object.fromEntries(['askbtn','aq','askm','an','ac','ar','at','ab','abot'].map(id=>[id,element(id)]));
 Object.assign(nodes.an,{value:'পরীক্ষা'});Object.assign(nodes.ac,{value:'test@example.com'});Object.assign(nodes.ar,{value:'ইসলাম'});Object.assign(nodes.at,{value:'পরীক্ষা'});Object.assign(nodes.aq,{value:'পরীক্ষামূলক প্রশ্ন?'});
 let requests=0,clipboard=0,failSend=false,failCopy=true;
 const context={$:id=>nodes[id]||null,ASK_ACTION:'https://formsubmit.co/ajax/test',LINKS:{whatsapp:'https://wa.me/1'},MESSENGER:'https://m.me/test',location:{hostname:'example.test'},
 navigator:{clipboard:{writeText:async()=>{clipboard++;if(failCopy)throw Error('denied')}}},document:{body:{appendChild(){}},createElement:()=>element('created'),execCommand:()=>false},
 sessionStorage:{getItem:()=>null,setItem(){}},window:{open(){}},fetch:async()=>{requests++;if(failSend)throw Error('offline');return {ok:true,json:async()=>({success:'true'})}},AbortController,URLSearchParams,Promise,setTimeout,clearTimeout,Date};
 vm.runInNewContext(src.slice(start,end),context);
 await nodes.askbtn.events.click();assert.equal(requests,1,'a quick valid submission must be sent');assert.match(nodes.askm.textContent,/পৌঁছেছে/);assert.equal(nodes.aq.value,'');
 nodes.aq.value='আবার একটি প্রশ্ন?';failSend=true;await nodes.askbtn.events.click();assert.equal(requests,2);assert.equal(clipboard,0,'do not copy personal data without a click');assert.match(nodes.askm.children[0].textContent,/দুবার/);
 const copy=nodes.askm.children[1].children.find(e=>e.className==='ask-copy');assert(copy);await copy.events.click();assert.equal(copy.textContent,'কপি করা যায়নি');failCopy=false;await copy.events.click();assert.equal(copy.textContent,'কপি হয়েছে ✓');
 nodes.ab.value='spam';await nodes.askbtn.events.click();assert.equal(requests,2,'honeypot should still block automated messages');
 console.log('question form: quick delivery, uncertain failure, explicit copy and honeypot pass');
})().catch(e=>{console.error(e);process.exitCode=1});
