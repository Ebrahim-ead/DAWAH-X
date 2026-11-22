/* DAWAH X assistant. Set the deployed HTTPS Worker URL here; leave blank until deployment. */
(()=>{
 'use strict';
 const API_URL='https://dawahx-assistant.www-mdrazu55555.workers.dev';
 const assetBase=new URL('.',document.currentScript.src);
 const url=path=>new URL(path,assetBase).href;
 const css=document.createElement('link');css.rel='stylesheet';css.href=url('assistant.css');document.head.appendChild(css);
 const trigger=document.createElement('button');trigger.type='button';trigger.className='dxa-trigger';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','dxa-panel');trigger.innerHTML='<span aria-hidden="true">✦</span> এআই সহকারী';
 const panel=document.createElement('aside');panel.id='dxa-panel';panel.className='dxa-panel';panel.hidden=true;panel.setAttribute('aria-label','DAWAH X এআই সহকারী');
 panel.innerHTML='<header class="dxa-head"><div><span class="dxa-mark" aria-hidden="true">✦</span><div><strong>DAWAH X সহকারী</strong><small>জানুন, বুঝুন, উৎস খুঁজুন</small></div></div><button class="dxa-close" type="button" aria-label="চ্যাট বন্ধ করুন">×</button></header><div class="dxa-chat" role="log" aria-live="polite" aria-relevant="additions"><div class="dxa-welcome"><span>আসসালামু আলাইকুম</span><h2>কী জানতে চান?</h2><p>প্রশ্ন করুন, প্রাসঙ্গিক লেখা ও ভিডিও খুঁজুন। এআই ভুল করতে পারে—উৎস যাচাই করুন; ব্যক্তিগত ফতোয়ার জন্য যোগ্য আলেমের পরামর্শ নিন।</p><div class="dxa-prompts"><button type="button">সালাতের গুরুত্ব কী?</button><button type="button">রোজা সম্পর্কে জানতে চাই</button></div></div></div><div class="dxa-bottom"><p class="dxa-privacy">প্রশ্ন ও সাম্প্রতিক কথোপকথন Cloudflare-এর এআই সেবায় পাঠানো হয়। সংবেদনশীল তথ্য দেবেন না।</p><form class="dxa-form"><label class="dxa-sr" for="dxa-input">আপনার প্রশ্ন</label><textarea id="dxa-input" rows="1" maxlength="2000" placeholder="আপনার প্রশ্ন লিখুন…" required></textarea><button type="submit" aria-label="প্রশ্ন পাঠান">➜</button></form><div class="dxa-footer"><span>এআই-এর উত্তর যাচাই করুন</span><a href="'+url('ask.html')+'">টিমকে প্রশ্ন করুন ↗</a></div></div>';
 document.body.append(trigger,panel);
 const chat=panel.querySelector('.dxa-chat'),form=panel.querySelector('form'),input=panel.querySelector('textarea'),send=form.querySelector('button'),close=panel.querySelector('.dxa-close');
 let history=[],busy=false;
 function open(){panel.hidden=false;trigger.setAttribute('aria-expanded','true');input.focus()}
 function shut(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()}
 trigger.addEventListener('click',()=>panel.hidden?open():shut());close.addEventListener('click',shut);panel.addEventListener('keydown',e=>{if(e.key==='Escape')shut()});
 function bubble(text,kind){const el=document.createElement('div');el.className='dxa-message '+kind;el.textContent=text;chat.append(el);chat.scrollTop=chat.scrollHeight;return el}
 function sources(found,videos){if(!found.length&&!videos.length)return;const box=document.createElement('div');box.className='dxa-sources';const title=document.createElement('strong');title.textContent='সংশ্লিষ্ট লেখা ও ভিডিও';box.append(title);for(const item of [...found,...videos]){const a=document.createElement('a');a.textContent=(item.id?'ভিডিও · ':item.side==='f'?'ফতোয়া · ':'প্রশ্নোত্তর · ')+item.title;a.href=item.id?url('read.html?v='+encodeURIComponent(item.id)):url('read.html?k='+encodeURIComponent(item.k));a.target='_blank';a.rel='noopener noreferrer';box.append(a)}chat.append(box);chat.scrollTop=chat.scrollHeight}
 async function submit(q){q=q.trim();if(!q||busy)return;busy=true;send.disabled=true;input.value='';bubble(q,'user');const status=bubble('প্রাসঙ্গিক তথ্য খোঁজা হচ্ছে…','status');
  let texts=[],videos=[];
  try{const result=await window.dawahxAssistantSearch(q);if(result){texts=[...result.texts.filter(x=>x.side==='q').slice(0,2),...result.texts.filter(x=>x.side==='f').slice(0,2)];videos=(await result.videos).slice(0,2)}}catch(_){}
  status.remove();sources(texts,videos);
  if(!API_URL){bubble('এআই সেবা এখনো চালু করা হয়নি। উপরের সংশ্লিষ্ট লেখা ও ভিডিও দেখতে পারেন, অথবা টিমকে প্রশ্ন পাঠান।','assistant');busy=false;send.disabled=false;return}
  const pending=bubble('উত্তর তৈরি হচ্ছে…','status');
  try {const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);let res;try{res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,ids:texts.map(x=>x.k),history}),signal:controller.signal})}finally{clearTimeout(timer)}
   if(!res.ok)throw new Error(String(res.status));const data=await res.json();if(typeof data.answer!=='string'||!data.answer.trim())throw Error('empty');pending.remove();bubble(data.answer,'assistant');history.push({role:'user',content:q},{role:'assistant',content:data.answer.slice(0,2000)});history=history.slice(-6);
  }catch(e){pending.remove();bubble(e.message==='429'?'অনেকগুলো অনুরোধ এসেছে। একটু পরে আবার চেষ্টা করুন।':'এখন উত্তর পাওয়া যাচ্ছে না। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন, অথবা টিমকে প্রশ্ন পাঠান।','assistant')}
  busy=false;send.disabled=false;input.focus();
 }
 form.addEventListener('submit',e=>{e.preventDefault();submit(input.value)});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}});
 panel.querySelectorAll('.dxa-prompts button').forEach(b=>b.addEventListener('click',()=>submit(b.textContent)));
})();
