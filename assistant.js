/* DAWAH X assistant. Set the deployed HTTPS Worker URL here; leave blank until deployment. */
(()=>{
 'use strict';
 const API_URL='https://dawahx-assistant.www-mdrazu55555.workers.dev';
 const assetBase=new URL('.',document.currentScript.src);
 const url=path=>new URL(path,assetBase).href;
 const css=document.createElement('link');css.rel='stylesheet';css.href=url('assistant.css');document.head.appendChild(css);
 const trigger=document.createElement('button');trigger.type='button';trigger.className='dxa-trigger';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','dxa-panel');trigger.innerHTML='<span aria-hidden="true">✦</span> এআই সহকারী';
 const panel=document.createElement('aside');panel.id='dxa-panel';panel.className='dxa-panel';panel.hidden=true;panel.setAttribute('aria-label','DAWAH X এআই সহকারী');
 panel.innerHTML='<header class="dxa-head"><div><span class="dxa-mark" aria-hidden="true">✦</span><div><strong>DAWAH X সহকারী</strong><small>জানুন, বুঝুন, উৎস খুঁজুন</small></div></div><button class="dxa-close" type="button" aria-label="চ্যাট বন্ধ করুন">×</button></header><div class="dxa-chat" role="log" aria-live="polite" aria-relevant="additions"><div class="dxa-welcome"><span>আসসালামু আলাইকুম</span><h2>কী জানতে চান?</h2><p>দৈনন্দিন বিষয়ে গল্প করুন। ইসলাম ও DAWAH X নিয়ে প্রশ্ন করলে সাইটের লেখা থেকে উত্তর খুঁজব। এআই ভুল করতে পারে—মূল উৎস যাচাই করুন; ব্যক্তিগত ফতোয়ার জন্য যোগ্য আলেমের পরামর্শ নিন।</p><div class="dxa-prompts"><button type="button">সালাতের গুরুত্ব কী?</button><button type="button">রোজা সম্পর্কে জানতে চাই</button></div></div></div><div class="dxa-bottom"><p class="dxa-privacy">প্রশ্ন ও সাম্প্রতিক কথোপকথন Cloudflare-এর এআই সেবায় পাঠানো হয়। সংবেদনশীল তথ্য দেবেন না।</p><form class="dxa-form"><label class="dxa-sr" for="dxa-input">আপনার প্রশ্ন</label><textarea id="dxa-input" rows="1" maxlength="2000" placeholder="আপনার প্রশ্ন লিখুন…" required></textarea><button type="submit" aria-label="প্রশ্ন পাঠান">➜</button></form><div class="dxa-footer"><span>এআই-এর উত্তর যাচাই করুন</span><a href="'+url('ask.html')+'">টিমকে প্রশ্ন করুন ↗</a></div></div>';
 document.body.append(trigger,panel);
 const chat=panel.querySelector('.dxa-chat'),form=panel.querySelector('form'),input=panel.querySelector('textarea'),send=form.querySelector('button'),close=panel.querySelector('.dxa-close');
 let history=[],busy=false;
 function open(){panel.hidden=false;trigger.setAttribute('aria-expanded','true');input.focus()}
 function shut(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()}
 trigger.addEventListener('click',()=>panel.hidden?open():shut());close.addEventListener('click',shut);panel.addEventListener('keydown',e=>{if(e.key==='Escape')shut()});
 function bubble(text,kind){const el=document.createElement('div');el.className='dxa-message '+kind;el.textContent=text;chat.append(el);chat.scrollTop=chat.scrollHeight;return el}
 function sources(found,videoTask){
  if(!found.length&&!videoTask)return;
  const box=document.createElement('div');box.className='dxa-sources';const title=document.createElement('strong');title.textContent='খুঁজে পাওয়া সংশ্লিষ্ট লেখা ও ভিডিও (উৎস হিসেবে যাচাইকৃত নয়)';box.append(title);
  function add(item){const a=document.createElement('a');a.textContent=(item.id?'ভিডিও · ':item.side==='f'?'ফতোয়া · ':'প্রশ্নোত্তর · ')+item.title;a.href=item.id?url('read.html?v='+encodeURIComponent(item.id)):url('read.html?k='+encodeURIComponent(item.k));a.target='_blank';a.rel='noopener noreferrer';box.append(a)}
  found.forEach(add);chat.append(box);
  if(videoTask){const pending=document.createElement('span');pending.className='dxa-video-pending';pending.textContent='ভিডিও খোঁজা হচ্ছে…';box.append(pending);
   Promise.resolve(videoTask).then(items=>{const nearBottom=chat.scrollHeight-chat.scrollTop-chat.clientHeight<100;pending.remove();const videos=Array.isArray(items)?items.slice(0,2):[];videos.forEach(add);if(!found.length&&!videos.length)box.remove();if(nearBottom)chat.scrollTop=chat.scrollHeight}).catch(()=>{pending.remove();if(!found.length)box.remove()})}
  chat.scrollTop=chat.scrollHeight;
 }
 const sitePages=new Set(['about.html','services.html','contact.html','policy.html']);
 function isFollowUp(q){const t=q.trim();return /^(?:এটা|এটি|এগুলো|ওটা|সেটা|সেটি|সেগুলো|এর|এদের|তার|তাদের|এ বিষয়ে|এ বিষয়ে|ওই বিষয়ে|ওই বিষয়ে)(?:\s|[?？।!,:ঃ]|$)/u.test(t)||/^(?:কেন|কীভাবে|কিভাবে|কখন|কোথায়|কোথায়|আরও|আরো|বিস্তারিত|ব্যাখ্যা)(?:\s*(?:বলুন|বলেন|বলবেন|জানান|করুন|চাই|দিন))?\s*[?？।!]*$/u.test(t)||/^(?:why|how|what about (?:it|that|this)|explain|tell me more)[?.!\s]*$/i.test(t)}
 function pageMatches(q){const site=/(?:dawah\s*x|দা[ওউ]য়?া?হ|দাওয়াহ|দাওয়াহ|ওয়েবসাইট|ওয়েবসাইট|ওয়েবসাইট|সাইট|আপনাদের|তোমাদের)/i.test(q);if(!site)return [];const pages=['about.html'];if(/সেবা|কার্যক্রম|কাজ|উদ্দেশ্য|service/i.test(q))pages.push('services.html');if(/যোগাযোগ|ফোন|নম্বর|whatsapp|হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ/i.test(q))pages.push('contact.html');if(/নীতি|তথ্যসূত্র|উৎস|রেফারেন্স|সংশোধন/i.test(q))pages.push('policy.html');return pages}
 function citations(items){if(!items.length)return;const box=document.createElement('div');box.className='dxa-sources';const title=document.createElement('strong');title.textContent='উত্তরে উল্লেখিত সাইটের উৎস — মূল লেখা যাচাই করুন';box.append(title);for(const item of items){if(!item||!Number.isInteger(item.number)||item.number<1||typeof item.title!=='string'||(!/^[a-f0-9]{14}$/.test(item.key||'')&&!sitePages.has(item.path)))continue;const a=document.createElement('a');a.textContent='['+item.number+'] '+item.title;a.href=item.path&&sitePages.has(item.path)?url(item.path):url('read.html?k='+encodeURIComponent(item.key));a.target='_blank';a.rel='noopener noreferrer';box.append(a)}chat.append(box);chat.scrollTop=chat.scrollHeight}
 async function requestAnswer(payload){
  // Keep the most recent complete turns while respecting the Worker's byte limit.
  payload={...payload,history:payload.history.slice()};let encoded=JSON.stringify(payload);
  while(payload.history.length&&new TextEncoder().encode(encoded).length>15000){payload.history.splice(0,2);encoded=JSON.stringify(payload)}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);let res;
  try{res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:encoded,signal:controller.signal})}finally{clearTimeout(timer)}
  if(!res.ok)throw Error(String(res.status));return res.json();
 }
 function modeLabel(mode){const el=document.createElement('div');el.className='dxa-mode';el.textContent=mode==='chat'?'সাধারণ আলাপ · সাইটের উৎসভিত্তিক নয়':mode==='no-source'?'সাইটে পর্যাপ্ত তথ্য পাওয়া যায়নি':'সাইটের উৎসভিত্তিক উত্তর';chat.append(el)}
 async function submit(q){q=q.trim();if(!q||busy)return;busy=true;send.disabled=true;input.value='';bubble(q,'user');const status=bubble('উত্তর তৈরি হচ্ছে…','status');
  try{
   if(!API_URL)throw Error('unsupported');
   // The Worker makes the routing decision. Search only if it asks for sources.
   let data=await requestAnswer({message:q,ids:[],pages:[],history,lookupComplete:false});
   if(data.needs_sources===true){
    status.textContent='সাইটে প্রাসঙ্গিক তথ্য খোঁজা হচ্ছে…';let texts=[],videos=null;
    const previous=history.filter(m=>m.role==='user').at(-1),searchQ=previous&&isFollowUp(q)?previous.content+' '+q:q,pages=pageMatches(searchQ);
    try{let result=await window.dawahxAssistantSearch(searchQ);if(!result)throw Error('search unavailable');if(!result.texts.length&&searchQ!==q){result=await window.dawahxAssistantSearch(q);if(!result)throw Error('search unavailable')}texts=result.texts.slice(0,4);videos=result.videos}catch(_){if(!pages.length)throw Error('search')}
    sources(texts,videos);status.textContent='সাইটের উৎস থেকে উত্তর তৈরি হচ্ছে…';
    data=await requestAnswer({message:q,ids:texts.map(x=>x.k),pages,history,lookupComplete:true});
   }
   if(typeof data.answer!=='string'||!data.answer.trim()||!Array.isArray(data.sources)||typeof data.grounded!=='boolean'||(data.grounded&&!data.sources.length))throw Error('unsupported');
   status.remove();modeLabel(data.mode==='chat'?'chat':data.grounded?'grounded':'no-source');bubble(data.answer,'assistant');citations(data.sources);if(data.partial===true)bubble('কিছু উৎস এই মুহূর্তে পাওয়া যায়নি; উত্তরটি অসম্পূর্ণ হতে পারে।','status');
   history.push({role:'user',content:q},{role:'assistant',content:data.answer.slice(0,2000)});history=history.slice(-6);
  }catch(e){status.remove();if(!input.value)input.value=q;bubble(e.message==='429'?'অনেকগুলো অনুরোধ এসেছে। একটু পরে আবার চেষ্টা করুন।':e.message==='search'?'সাইটের লেখা এখন খোঁজা যাচ্ছে না। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।':e.message==='unsupported'?'এআই সেবা এখনো হালনাগাদ হয়নি। পরে আবার চেষ্টা করুন, অথবা টিমকে প্রশ্ন পাঠান।':'এখন উত্তর পাওয়া যাচ্ছে না। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন, অথবা টিমকে প্রশ্ন পাঠান।','assistant')}
  finally{busy=false;send.disabled=false;if(!panel.hidden)input.focus()}
 }
 form.addEventListener('submit',e=>{e.preventDefault();submit(input.value)});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}});
 panel.querySelectorAll('.dxa-prompts button').forEach(b=>b.addEventListener('click',()=>submit(b.textContent)));
})();
