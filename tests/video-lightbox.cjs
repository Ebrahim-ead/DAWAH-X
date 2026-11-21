'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync('effects.js','utf8');
const start=script.indexOf(" const videoDialog=document.createElement('dialog')"),end=script.indexOf(" if(root.dataset.page==='about')",start);
assert(start>=0&&end>start,'video lightbox implementation exists');
for(const modal of [true,false]){
 const events={},closeEvents={},classes=new Set(),slot={children:[],replaceChildren(...nodes){this.children=nodes}};
 const button={isConnected:true,dataset:{videoId:'abcdefghijk',videoTitle:'পরীক্ষা'},focus(){this.focused=true}};
 const closeButton={addEventListener(type,fn){closeEvents[type]=fn}};
 const dialog={open:false,addEventListener(type,fn){events[type]=fn},querySelector(s){return s==='.video-lightbox-player'?slot:closeButton},setAttribute(name){if(name==='open')this.open=true},removeAttribute(name){if(name==='open')this.open=false},close(){this.open=false;events.close()}};
 if(modal)dialog.showModal=function(){this.open=true};
 const docEvents={},document={body:{appendChild(){},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},createElement:t=>t==='dialog'?dialog:{},addEventListener:(t,fn)=>docEvents[t]=fn};
 vm.runInNewContext(script.slice(start,end),{document,encodeURIComponent});
 docEvents.click({target:{closest:()=>button}});
 assert(dialog.open);assert.equal(slot.children.length,1);const player=slot.children[0];
 assert.match(player.src,/youtube\.com\/embed\/abcdefghijk/);assert(classes.has('video-modal-open'));
 events.click?.({target:dialog});assert(dialog.open,'backdrop click must not close the player');assert.equal(slot.children[0],player);
 let prevented=false;events.cancel({preventDefault(){prevented=true}});assert(prevented,'Escape must not dismiss the player');assert(dialog.open);
 closeEvents.click();assert(!dialog.open);assert.equal(slot.children.length,0);assert(!classes.has('video-modal-open'));assert(button.focused,'focus returns to the opening button');
}
console.log('video lightbox: backdrop and Escape keep playback open; close button clears player and restores focus (modal and fallback)');
