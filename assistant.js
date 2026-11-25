/* DAWAH X assistant. Set the deployed HTTPS Worker URL here; leave blank until deployment. */
(()=>{
 'use strict';
 const API_URL='https://dawahx-assistant.www-mdrazu55555.workers.dev';
 const assetBase=new URL('.',document.currentScript.src);
 const url=path=>new URL(path,assetBase).href;
 const css=document.createElement('link');css.rel='stylesheet';css.href=url('assistant.css');document.head.appendChild(css);
 const trigger=document.createElement('button');trigger.type='button';trigger.className='dxa-trigger';trigger.setAttribute('aria-label','এআই সহকারী চ্যাট খুলুন');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','dxa-panel');
 const logo=document.createElement('img');logo.src=url('assistant-logo.webp');logo.alt='';logo.width=72;logo.height=72;trigger.appendChild(logo);
 const panel=document.createElement('aside');panel.id='dxa-panel';panel.className='dxa-panel';panel.hidden=true;panel.setAttribute('aria-label','DAWAH X এআই সহকারী');
 panel.innerHTML='<header class="dxa-head"><div><span class="dxa-mark" aria-hidden="true">✦</span><div><strong>DAWAH X সহকারী</strong><small>জানুন, বুঝুন, উৎস খুঁজুন</small></div></div><button class="dxa-close" type="button" aria-label="চ্যাট বন্ধ করুন">×</button></header><div class="dxa-chat" role="log" aria-live="polite" aria-relevant="additions"><div class="dxa-welcome"><span>আসসালামু আলাইকুম</span><h2>কী জানতে চান?</h2><p>দৈনন্দিন বিষয়ে গল্প করুন। ইসলাম নিয়ে প্রশ্ন করলে কুরআন, হাদিস ও সাইটের লেখা থেকে প্রাসঙ্গিক তথ্য খুঁজব। নির্দিষ্ট আয়াত বা হাদিস জানতে সূরা ও আয়াত নম্বর, অথবা কিতাব ও হাদিস নম্বর লিখুন। অনুসন্ধান সীমিত: বাছাই করা উৎসের অংশ ব্যবহার হয়; ভিডিওর শুধু শিরোনাম খোঁজা হয়, বক্তব্য নয়। এআই ভুল করতে পারে—মূল উৎস যাচাই করুন; ব্যক্তিগত ফতোয়ার জন্য যোগ্য আলেমের পরামর্শ নিন।</p><div class="dxa-prompts"><button type="button">সালাতের গুরুত্ব কী?</button><button type="button">রোজা সম্পর্কে জানতে চাই</button></div></div></div><div class="dxa-bottom"><p class="dxa-privacy">প্রশ্ন ও সাম্প্রতিক কথোপকথন Cloudflare-এর এআই সেবায় পাঠানো হয়। সংবেদনশীল তথ্য দেবেন না।</p><form class="dxa-form"><label class="dxa-sr" for="dxa-input">আপনার প্রশ্ন</label><textarea id="dxa-input" rows="1" maxlength="2000" placeholder="আপনার প্রশ্ন লিখুন…" required></textarea><button type="submit" aria-label="প্রশ্ন পাঠান">➜</button></form><div class="dxa-footer"><button type="button" class="dxa-reset">নতুন কথোপকথন</button><span>এআই-এর উত্তর যাচাই করুন</span><a href="'+url('ask.html')+'">টিমকে প্রশ্ন করুন ↗</a></div></div>';
 document.body.append(trigger,panel);
 const chat=panel.querySelector('.dxa-chat'),form=panel.querySelector('form'),input=panel.querySelector('textarea'),send=form.querySelector('button'),close=panel.querySelector('.dxa-close');
 let history=[],busy=false;
 const reset=panel.querySelector('.dxa-reset');
 if(reset)reset.addEventListener('click',()=>{if(busy)return;history=[];chat.replaceChildren();input.value='';bubble('নতুন কথোপকথন শুরু হয়েছে। কী জানতে চান?','status');input.focus()});
 function open(){panel.hidden=false;trigger.setAttribute('aria-expanded','true');input.focus()}
 function shut(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()}
 trigger.addEventListener('click',()=>panel.hidden?open():shut());close.addEventListener('click',shut);panel.addEventListener('keydown',e=>{if(e.key==='Escape')shut()});
 function bubble(text,kind){const el=document.createElement('div');el.className='dxa-message '+kind;el.textContent=text;chat.append(el);chat.scrollTop=chat.scrollHeight;return el}
 function sources(found,videoTask){
  if(!found.length&&!videoTask)return;
  const box=document.createElement('div');box.className='dxa-sources';const title=document.createElement('strong');title.textContent='খুঁজে পাওয়া সংশ্লিষ্ট লেখা ও ভিডিও (উৎস হিসেবে যাচাইকৃত নয়)';box.append(title);
  function add(item){const a=document.createElement('a');a.textContent=(item.id?'ভিডিও · ':item.side==='f'?'ইসলামিক প্রশ্নোত্তর · ':'নাস্তিকতা বিষয়ক প্রশ্নোত্তর · ')+item.title;a.href=item.id?url('read.html?v='+encodeURIComponent(item.id)):url('read.html?k='+encodeURIComponent(item.k));a.target='_blank';a.rel='noopener noreferrer';box.append(a)}
  found.forEach(add);chat.append(box);
  if(videoTask){const pending=document.createElement('span');pending.className='dxa-video-pending';pending.textContent='ভিডিও খোঁজা হচ্ছে…';box.append(pending);
   Promise.resolve(videoTask).then(items=>{const nearBottom=chat.scrollHeight-chat.scrollTop-chat.clientHeight<100;pending.remove();const videos=Array.isArray(items)?items.slice(0,2):[];videos.forEach(add);if(!found.length&&!videos.length)box.remove();if(nearBottom)chat.scrollTop=chat.scrollHeight}).catch(()=>{pending.remove();if(!found.length)box.remove()})}
  chat.scrollTop=chat.scrollHeight;
 }
 const sitePages=new Set(['about.html','services.html','contact.html','policy.html']);
 function isFollowUp(q){const t=q.trim();return /^(?:এটা|এটি|এগুলো|ওটা|সেটা|সেটি|সেগুলো|এর|এদের|তার|তাদের|তাহলে|আর|আরও|আরো|তারপর|এ বিষয়ে|এ বিষয়ে|ওই বিষয়ে|ওই বিষয়ে|এই আয়াতের|এই আয়াতের|এই হাদিসের|এই হাদীসের|এ আয়াতের|এ আয়াতের|এ হাদিসের|এ হাদীসের)(?:\s|[?？।!,:ঃ]|$)/u.test(t)||/^(?:কেন|কীভাবে|কিভাবে|কখন|কোথায়|কোথায়|বিস্তারিত|ব্যাখ্যা)(?:\s*(?:বলুন|বলেন|বলবেন|জানান|করুন|চাই|দিন))?\s*[?？।!]*$/u.test(t)||/^(?:why|how|what about (?:it|that|this)|explain|tell me more)[?.!\s]*$/i.test(t)}
 function searchContext(q){if(!isFollowUp(q))return q;const parts=[q],users=history.filter(m=>m.role==='user');for(let i=users.length-1;i>=0;i--){parts.push(users[i].content);if(!isFollowUp(users[i].content))break}return parts.join(' ')}
 function pageMatches(q){const site=/(?:dawah\s*x|দা[ওউ]য়?া?হ|দাওয়াহ|দাওয়াহ|ওয়েবসাইট|ওয়েবসাইট|ওয়েবসাইট|সাইট|আপনাদের|তোমাদের)/i.test(q);if(!site)return [];const pages=['about.html'];if(/সেবা|কার্যক্রম|কাজ|উদ্দেশ্য|service/i.test(q))pages.push('services.html');if(/যোগাযোগ|ফোন|নম্বর|whatsapp|হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ/i.test(q))pages.push('contact.html');if(/নীতি|তথ্যসূত্র|উৎস|রেফারেন্স|সংশোধন/i.test(q))pages.push('policy.html');return pages}
 function citations(items,candidates=false){if(!items.length)return;const box=document.createElement('div');box.className='dxa-sources';const title=document.createElement('strong');title.textContent=candidates?'সম্ভাব্য উৎস — প্রশ্নের উত্তর হিসেবে যাচাই করা হয়নি':'উত্তরে উল্লেখিত উৎস — মূল লেখা যাচাই করুন';box.append(title);
  function link(label,href){const a=document.createElement('a');a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener noreferrer';box.append(a)}
  function snapshot(item,repo,path){if(/^[a-f0-9]{40}$/.test(item.snapshot||''))link('ব্যবহৃত বিকল্প উৎসের নির্দিষ্ট সংস্করণ (সাইটের বর্তমান পাঠ ভিন্ন হতে পারে)'+(item.key?' · লেখার ID: '+item.key:''),'https://github.com/Ebrahim-ead/'+repo+'/blob/'+item.snapshot+'/'+path)}
  const books={bukhari:'বুখারী',muslim:'মুসলিম','abu-dawud':'আবু দাউদ',tirmidhi:'তিরমিজি',nasai:'নাসাঈ','ibn-majah':'ইবনে মাজাহ',mishkat:'মিশকাত'};
  for(const item of items){if(!item||!Number.isInteger(item.number)||item.number<1||typeof item.title!=='string')continue;
   if(item.type==='quran-surah'&&Number.isInteger(item.surah)&&item.surah>=1&&item.surah<=114){
    link('['+item.number+'] '+item.title+' · Ebrahim Ead','https://ebrahim-ead.github.io/ead/quran.html#'+item.surah);
    snapshot(item,'ead','assets/quran/data/index.json');link('একই সূরা Quran.com-এ দেখুন','https://quran.com/'+item.surah);continue;
   }
   if(item.type==='quran'&&Number.isInteger(item.surah)&&item.surah>=1&&item.surah<=114&&Number.isInteger(item.verse)&&item.verse>=1&&item.verse<=286){
    link('['+item.number+'] '+item.title+' · Ebrahim Ead', 'https://ebrahim-ead.github.io/ead/quran.html#'+item.surah+':'+item.verse);
    snapshot(item,'ead','assets/quran/data/suras/'+item.surah+'.json');link('একই আয়াত Quran.com-এ দেখুন (ভিন্ন অনুবাদ হতে পারে)','https://quran.com/'+item.surah+'/'+item.verse);continue;
   }
   if(item.type==='hadith'&&Object.prototype.hasOwnProperty.call(books,item.book)&&Number.isInteger(item.chapter)&&item.chapter>=0&&item.chapter<=200&&Number.isInteger(item.hadith)&&item.hadith>=1&&item.hadith<=20000){
    link('['+item.number+'] '+item.title+' · Ebrahim Ead','https://ebrahim-ead.github.io/ead/hadith.html#'+item.book+':'+item.chapter+':'+item.hadith);
    snapshot(item,'ead','assets/hadith/data/'+item.book+'/'+item.chapter+'.json');link('HadithBD-তে খুঁজুন (সংস্করণ ও নম্বর মিলিয়ে দেখুন)','https://www.hadithbd.com/search/?q='+encodeURIComponent(books[item.book]+' '+item.hadith));continue;
   }
   if(!/^[a-f0-9]{14}$/.test(item.key||'')&&!sitePages.has(item.path))continue;
   link('['+item.number+'] '+item.title,item.path&&sitePages.has(item.path)?url(item.path):url('read.html?k='+encodeURIComponent(item.key)));snapshot(item,'DAWAH-X',item.path&&sitePages.has(item.path)?item.path:'texts/'+item.key.slice(-3)+'.json');
  }chat.append(box);chat.scrollTop=chat.scrollHeight}
 async function requestAnswer(payload){
  // Keep the most recent complete turns while respecting the Worker's byte limit.
  payload={...payload,history:payload.history.slice()};let encoded=JSON.stringify(payload);
  while(payload.history.length&&new TextEncoder().encode(encoded).length>15000){payload.history.splice(0,2);encoded=JSON.stringify(payload)}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);let res;
  try{res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:encoded,signal:controller.signal})}finally{clearTimeout(timer)}
  if(!res.ok){
   if(res.status===502){try{const data=await res.json();if(data.error_code==='model_unavailable'&&Array.isArray(data.candidates)){const error=Error('model_unavailable');error.candidates=data.candidates.slice(0,6);error.partial=data.partial===true;error.quota=data.model_reason==='quota';throw error}}catch(error){if(error.message==='model_unavailable')throw error}}
   throw Error(String(res.status));
  }return res.json();
 }
 function modeLabel(mode){const el=document.createElement('div');el.className='dxa-mode';el.textContent=mode==='chat'?'সাধারণ আলাপ · সাইটের উৎসভিত্তিক নয়':mode==='source_quote'?'কাছাকাছি প্রশ্নের মূল লেখা · প্রযোজ্যতা যাচাই করা হয়নি':mode==='failed'?'উৎস অনুসন্ধান সম্পূর্ণ হয়নি':mode==='verification'?'উত্তর যাচাই করা যায়নি':mode==='no-source'?'খুঁজে পাওয়া উৎসে পর্যাপ্ত তথ্য নেই':'প্রাপ্ত উৎসভিত্তিক উত্তর';chat.append(el)}
 async function submit(q){q=q.trim();if(!q||busy)return;busy=true;send.disabled=true;if(reset)reset.disabled=true;input.value='';bubble(q,'user');const status=bubble('উত্তর তৈরি হচ্ছে…','status');
  try{
   if(!API_URL)throw Error('unsupported');
   // Ask the Worker whether local search is needed; direct numbered lookups bypass it.
   let data=await requestAnswer({message:q,ids:[],pages:[],history,lookupComplete:false,allSources:true});
   if(data.needs_sources!==true||data.all_sources!==true)throw Error('unsupported');
   let spelling=null;
   if(data.needs_sources===true){
    status.textContent='প্রাসঙ্গিক উৎস খোঁজা হচ্ছে…';let texts=[],videos=null,siteSearchFailed=false,siteSearchLimited=false;
    const searchQ=searchContext(q),pages=pageMatches(searchQ);
    if(data.direct_lookup!==true)try{let result;try{result=await window.dawahxAssistantSearch(searchQ)}catch(_){}if(!result)result=await window.dawahxAssistantSearch(searchQ);if(!result)throw Error('search unavailable');texts=result.texts.slice(0,6);videos=result.videos;siteSearchLimited=result.limited===true;spelling=result.correction||null}catch(_){siteSearchFailed=true}
    status.textContent='প্রাপ্ত উৎস থেকে উত্তর তৈরি হচ্ছে…';
    data=await requestAnswer({message:q,ids:texts.map(x=>x.k),pages,history,lookupComplete:true,scriptureSearch:true,siteSearchFailed,siteSearchLimited,...(spelling?{searchCorrection:spelling}:{}),allSources:true});
    if(data.grounded===true)sources(texts,videos);
   }
   if(typeof data.answer!=='string'||!data.answer.trim()||!Array.isArray(data.sources)||typeof data.grounded!=='boolean'||(data.grounded&&!data.sources.length))throw Error('unsupported');
   status.remove();if(spelling&&typeof spelling.from==='string'&&typeof spelling.to==='string')bubble('উৎস খোঁজায় সম্ভাব্য বানান ব্যবহার করা হয়েছে: '+spelling.from+' → '+spelling.to+'। অর্থ ভিন্ন হলে প্রশ্নটি সংশোধন করুন।','status');modeLabel(data.mode==='chat'?'chat':data.mode==='source_quote'?'source_quote':data.grounded?'grounded':data.verification_failed?'verification':data.partial?'failed':'no-source');const answerBubble=bubble(data.answer,'assistant');citations(data.sources,data.mode==='source_quote');if(data.grounded===false&&data.mode!=='source_quote'&&Array.isArray(data.candidates))citations(data.candidates.slice(0,6),true);if(data.partial===true){const labels={quran:'কুরআন',hadith:'হাদিস',site_search:'সাইটের লেখা খোঁজা',site_pages:'সাইটের তথ্য',articles:'বাছাই করা লেখা',direct_lookup:'নির্দিষ্ট আয়াত বা হাদিস'};
    const failed=Array.isArray(data.search_failures)?[...new Set(data.search_failures.filter(x=>Object.prototype.hasOwnProperty.call(labels,x)).map(x=>labels[x]))]:[];
    bubble(failed.length?'এই অংশগুলোতে সমস্যা হয়েছে: '+failed.join(', ')+'। অনুসন্ধান সম্পূর্ণ হয়নি।':'কিছু উৎস এই মুহূর্তে পাওয়া যায়নি; অনুসন্ধান সম্পূর্ণ হয়নি।','status')}if(data.search_limited===true)bubble(data.mode==='chat'?'এই সাধারণ কথায় বিষয়ভিত্তিক উৎস অনুসন্ধান সীমিত ছিল।':'উৎসগুলোতে বিষয়ভিত্তিক অনুসন্ধান সীমিত ছিল; প্রয়োজন হলে বিষয় ও প্রাসঙ্গিক শর্ত স্পষ্ট করে আবার চেষ্টা করুন।','status');if(data.grounded===true&&data.source_coverage){const c=data.source_coverage,names={quran:'কুরআন',hadith:'হাদিস'};
    const missing=Object.keys(names).filter(k=>c[k]==='no_match').map(k=>names[k]),skipped=Object.keys(names).filter(k=>c[k]==='skipped').map(k=>names[k]);
    if(missing.length)bubble('সীমিত অনুসন্ধানে সরাসরি '+missing.join(' ও ')+'ের পাঠ মেলেনি; এর মানে এই নয় যে সেখানে কোনো দলিল নেই।','status');
    if(skipped.length)bubble(skipped.join(' ও ')+'-এ বিষয়ভিত্তিক অনুসন্ধান করা যায়নি।','status')}
   if(data.snapshot_search===true)bubble('কিছু অনুসন্ধান বা উৎসে বিকল্প স্থির সংস্করণ ব্যবহার হয়েছে; বর্তমান সাইটের পাঠ ভিন্ন হতে পারে। বিকল্প পাঠ ব্যবহার হলে উৎসের পাশে সংস্করণের লিংক দেওয়া আছে।','status');
   if(data.incomplete===true)bubble('উত্তর সম্পূর্ণ করা যায়নি। প্রশ্নটি ছোট অংশে ভাগ করে আবার করুন।','status');
   // Start a long answer at its beginning instead of jumping past it to citations.
   if(answerBubble.offsetHeight>chat.clientHeight*0.7)chat.scrollTop+=answerBubble.getBoundingClientRect().top-chat.getBoundingClientRect().top-8;
   history.push({role:'user',content:q},{role:'assistant',content:data.answer.slice(0,2000)});history=history.slice(-6);
  }catch(e){status.remove();if(!input.value)input.value=q;
   if(e.message==='model_unavailable'){
    bubble((e.quota?'এআই সেবা দৈনিক ব্যবহারের সীমা শেষ হয়েছে বলে জানিয়েছে।':'এআই দিয়ে ব্যাখ্যা তৈরির সেবা এখন কাজ করছে না।')+' নিচে সম্ভাব্য উৎস দেওয়া হলো; এগুলো আপনার প্রশ্নের সঠিক উত্তর কি না যাচাই করা হয়নি। মূল লেখা দেখুন বা পরে আবার চেষ্টা করুন।','assistant');
    citations(e.candidates||[],true);if(e.partial)bubble('কিছু উৎসে অনুসন্ধান সম্পূর্ণ হয়নি।','status');
   }else bubble(e.message==='429'?'অনেকগুলো অনুরোধ এসেছে। একটু পরে আবার চেষ্টা করুন।':e.message==='search'?'সাইটের লেখা এখন খোঁজা যাচ্ছে না। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।':e.message==='unsupported'?'এআই সেবা এখনো হালনাগাদ হয়নি। পরে আবার চেষ্টা করুন, অথবা টিমকে প্রশ্ন পাঠান।':'এখন উত্তর পাওয়া যাচ্ছে না। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন, অথবা টিমকে প্রশ্ন পাঠান।','assistant')}

  finally{busy=false;send.disabled=false;if(reset)reset.disabled=false;if(!panel.hidden)input.focus()}
 }
 form.addEventListener('submit',e=>{e.preventDefault();submit(input.value)});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}});
 panel.querySelectorAll('.dxa-prompts button').forEach(b=>b.addEventListener('click',()=>submit(b.textContent)));
})();
