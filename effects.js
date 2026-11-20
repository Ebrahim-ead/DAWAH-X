
(()=>{
 const root=document.body;
 const menuNode=document.getElementById('menu'),menuToggle=document.getElementById('burger');
 if(menuNode&&menuToggle){const mobileMenu=window.matchMedia('(max-width:1099px)');menuToggle.setAttribute('aria-controls','menu');menuToggle.setAttribute('aria-label','মেনু খুলুন');menuToggle.setAttribute('aria-expanded','false');const syncMenu=()=>{const open=menuNode.classList.contains('open')&&mobileMenu.matches;document.body.classList.toggle('menu-open',open);menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'মেনু বন্ধ করুন':'মেনু খুলুন')};menuToggle.addEventListener('click',syncMenu);menuNode.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>menuNode.classList.remove('open')));new MutationObserver(syncMenu).observe(menuNode,{attributes:true,attributeFilter:['class']});mobileMenu.addEventListener?.('change',()=>{if(!mobileMenu.matches)menuNode.classList.remove('open');syncMenu()});document.addEventListener('pointerdown',event=>{if(!mobileMenu.matches||!menuNode.classList.contains('open'))return;if(event.target.closest?.('#menu,#burger'))return;menuNode.classList.remove('open')});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuNode.classList.contains('open')){menuNode.classList.remove('open');syncMenu();menuToggle.focus()}});syncMenu()}
 const dateNode=document.getElementById('site-date'),timeNode=document.getElementById('site-time');
 if(dateNode&&timeNode){
  /* বাংলাদেশ সময়, বাংলায়: বার ও মাসের নাম বাংলা, সংখ্যা সাইটের বাকি অংশের মতো ইংরেজি অঙ্কে */
  const zone='Asia/Dhaka';let dateFormat,partFormat;
  try{dateFormat=new Intl.DateTimeFormat('bn-BD-u-nu-latn',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:zone});partFormat=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:zone})}catch(_){}
  const dayPart=h=>h<4?'রাত':h<6?'ভোর':h<12?'সকাল':h<15?'দুপুর':h<18?'বিকাল':h<20?'সন্ধ্যা':'রাত';
  const updateClock=()=>{if(!dateFormat||!partFormat)return;const now=new Date(),iso=now.toISOString(),p={};
   for(const x of partFormat.formatToParts(now))p[x.type]=x.value;
   const h=Number(p.hour)%24,text=dateFormat.format(now);
   if(dateNode.textContent!==text){dateNode.textContent=text;dateNode.dateTime=iso}
   timeNode.textContent=dayPart(h)+' '+(h%12||12)+':'+p.minute+':'+p.second;timeNode.dateTime=iso};
  updateClock();window.setInterval(updateClock,1000)
  /* হিজরি তারিখ (উম্মুল কুরা হিসাব): চাঁদ দেখার সাথে এক দিন কম-বেশি হতে পারে, তাই ইঙ্গিতে স্পষ্ট রাখা */
  const clockBar=dateNode.closest('.site-clock-inner');
  if(clockBar){
   const hj=document.createElement('span');hj.className='site-clock-hijri';hj.id='site-hijri';
   hj.title='হিজরি তারিখ হিসাব করে দেখানো হয় (উম্মুল কুরা) — স্থানীয় চাঁদ দেখার সাথে এক দিন কম-বেশি হতে পারে';
   clockBar.appendChild(hj);
   const paintHijri=()=>{try{
    const parts={};for(const x of new Intl.DateTimeFormat('bn-BD-u-nu-latn',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Dhaka',calendar:'islamic-umalqura'}).formatToParts(new Date()))parts[x.type]=x.value;
    const text=parts.day+' '+parts.month+' '+parts.year+' হিজরি';
    if(hj.textContent!==text)hj.textContent=text}catch(_){hj.remove()}};
   paintHijri();window.setInterval(paintHijri,60000)
  }}
 const progress=document.getElementById('scroll-progress');
 const backToTop=document.createElement('button');backToTop.type='button';backToTop.id='back-to-top';backToTop.className='back-to-top';backToTop.setAttribute('aria-label','পাতার শুরুতে যান');backToTop.setAttribute('title','উপরে যান');backToTop.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';document.body.appendChild(backToTop);
 backToTop.addEventListener('click',()=>{const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';try{window.scrollTo({top:0,behavior})}catch(_){window.scrollTo(0,0)}});
 const updateProgress=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;const ratio=max>0?window.scrollY/max:0;if(progress)progress.style.transform='scaleX('+ ratio +')';backToTop.style.setProperty('--pct',String(Math.round(ratio*100)));backToTop.classList.toggle('is-visible',window.scrollY>480)};
 window.addEventListener('scroll',updateProgress,{passive:true});window.addEventListener('resize',updateProgress);updateProgress();
 const visible=root.querySelector('section#'+root.dataset.page);
 const videoDialog=document.createElement('dialog');videoDialog.className='video-lightbox';videoDialog.setAttribute('aria-label','ভিডিও প্লেয়ার');
 videoDialog.innerHTML='<button type="button" class="video-lightbox-close" aria-label="ভিডিও বন্ধ করুন" autofocus>×</button><div class="video-lightbox-player"></div>';
 document.body.appendChild(videoDialog);
 const videoSlot=videoDialog.querySelector('.video-lightbox-player');let returnToVideo=null;
 const clearVideo=()=>{videoSlot.replaceChildren();document.body.classList.remove('video-modal-open');if(returnToVideo?.isConnected)returnToVideo.focus();returnToVideo=null};
 videoDialog.addEventListener('close',clearVideo);
 videoDialog.querySelector('.video-lightbox-close').addEventListener('click',()=>{if(videoDialog.open)videoDialog.close();else{videoDialog.removeAttribute('open');clearVideo()}});
 videoDialog.addEventListener('click',event=>{if(event.target===videoDialog){if(videoDialog.open)videoDialog.close();else{videoDialog.removeAttribute('open');clearVideo()}}});
 document.addEventListener('click',event=>{const button=event.target.closest?.('.video-preview[data-video-id],.ask-vid[data-video-id],.live-watch[data-video-id]');if(!button)return;const id=button.dataset.videoId;if(!id)return;const player=document.createElement('iframe');player.src='https://www.youtube.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0&playsinline=1';player.title=button.dataset.videoTitle||'DAWAH X video';player.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';player.allowFullscreen=true;player.referrerPolicy='strict-origin-when-cross-origin';player.loading='eager';returnToVideo=button;videoSlot.replaceChildren(player);document.body.classList.add('video-modal-open');if(typeof videoDialog.showModal==='function')videoDialog.showModal();else videoDialog.setAttribute('open','')});
 if(root.dataset.page==='about'){const mobileAbout=window.matchMedia('(max-width:560px)');const syncAbout=()=>document.querySelectorAll('#about details.about-section').forEach(d=>{if(mobileAbout.matches)d.removeAttribute('open');else d.setAttribute('open','')});syncAbout();mobileAbout.addEventListener?.('change',syncAbout)}
 const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 /* ---- স্মার্ট হেডার: নিচে পড়ার সময় হেডার সরে যায়, উপরে টানলে বা কিবোর্ড ফোকাসে ফিরে আসে ---- */
 const topBar=document.querySelector('header.top');
 if(topBar){
  let lastY=window.scrollY,away=0,queued=false;
  const settle=()=>{
   queued=false;
   const y=window.scrollY,dy=y-lastY;
   if(y<140||document.body.classList.contains('menu-open')||topBar.contains(document.activeElement)){topBar.classList.remove('is-away');away=0}
   else if(dy>0){away+=dy;if(away>70)topBar.classList.add('is-away')}
   else if(dy<0){away=0;topBar.classList.remove('is-away')}
   lastY=y;
  };
  window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(settle)}},{passive:true});
  topBar.addEventListener('focusin',()=>{topBar.classList.remove('is-away');away=0});
 }

 const revealSelector='.title,.card,.qcard,.askbox,.ccard,.about,.library-panel,.lrow,.fbrow,.quote,.badge,.joinbtn,.qtools,.livebox,.field,.field-row,.field-group,.social,.contact-card,.channel-bar,.video-card';
 let io=null;
 if(!reduceMotion&&'IntersectionObserver' in window){io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){const el=e.target;el.classList.add('is-visible');io.unobserve(el);window.setTimeout(()=>{el.style.transitionDelay=''},1000)}}),{threshold:.08})}
 const revealOne=(el,index=0)=>{if(!el.matches||!el.matches(revealSelector))return;if(!el.hasAttribute('data-reveal'))el.setAttribute('data-reveal','');if(reduceMotion||!io){el.classList.add('is-visible');return}el.style.transitionDelay=Math.min(index%7,6)*48+'ms';io.observe(el)};
 const revealTree=scope=>{if(scope.matches&&scope.matches(revealSelector))revealOne(scope);scope.querySelectorAll?.(revealSelector).forEach((el,i)=>revealOne(el,i))};
 const tiltSelector='.card,.qcard,.ccard,.library-link,.video-card';
 const bindTilt=el=>{if(reduceMotion||el.dataset.tiltBound)return;el.dataset.tiltBound='1';el.addEventListener('pointermove',ev=>{if(ev.pointerType==='touch')return;const r=el.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;el.style.setProperty('--tilt-x',(-y*5).toFixed(2)+'deg');el.style.setProperty('--tilt-y',(x*5).toFixed(2)+'deg');el.style.setProperty('--shine-x',(x*100+50).toFixed(1)+'%');el.style.setProperty('--shine-y',(y*100+50).toFixed(1)+'%')});el.addEventListener('pointerleave',()=>{el.style.removeProperty('--tilt-x');el.style.removeProperty('--tilt-y');el.style.removeProperty('--shine-x');el.style.removeProperty('--shine-y')})};
 const tiltTree=scope=>{if(scope.matches&&scope.matches(tiltSelector))bindTilt(scope);scope.querySelectorAll?.(tiltSelector).forEach(bindTilt)};
 const cursorLight=document.querySelector('.cursor-light');
 if(!reduceMotion&&window.matchMedia('(hover:hover) and (pointer:fine)').matches){let raf=0;window.addEventListener('pointermove',ev=>{if(ev.pointerType==='touch'||raf)return;raf=requestAnimationFrame(()=>{raf=0;cursorLight?.style.setProperty('--light-x',ev.clientX+'px');cursorLight?.style.setProperty('--light-y',ev.clientY+'px');const hero=ev.target.closest?.('.hero');if(hero){const r=hero.getBoundingClientRect();hero.style.setProperty('--hero-shift-x',(((ev.clientX-r.left)/r.width-.5)*-14).toFixed(1)+'px');hero.style.setProperty('--hero-shift-y',(((ev.clientY-r.top)/r.height-.5)*-8).toFixed(1)+'px')}else{const h=document.querySelector('.hero');h?.style.setProperty('--hero-shift-x','0px');h?.style.setProperty('--hero-shift-y','0px')}})},{passive:true})}
 if(visible){revealTree(visible);tiltTree(visible);const watcher=new MutationObserver(changes=>changes.forEach(change=>change.addedNodes.forEach(node=>{if(node.nodeType===1){revealTree(node);tiltTree(node)}})));watcher.observe(visible,{childList:true,subtree:true})}
 document.querySelectorAll('#menu a').forEach(a=>a.addEventListener('click',()=>document.querySelector('#menu')?.classList.remove('open')));
})();

/* ===== দিন/রাত মোড (theme toggle) — সব পাতায় ===== */
(()=>{
 const KEY='dawahx-theme', root=document.documentElement, btn=document.getElementById('theme-toggle');
 const meta=document.querySelector('meta[name="theme-color"]');
 const DARK_BG='#08151a', LIGHT_BG='#f6f5ef';
 const isLight=()=>root.getAttribute('data-theme')==='light';
 const swapLogos=light=>{
  document.querySelectorAll('img.word').forEach(img=>{
   if(!img.dataset.themeSrc){img.dataset.themeSrc=img.getAttribute('src')||'logo.webp'}
   const want=light?'logo-dark.webp':img.dataset.themeSrc;
   if(img.getAttribute('src')!==want)img.setAttribute('src',want);
  });
 };
 const paint=light=>{
  root.setAttribute('data-theme',light?'light':'dark');
  if(meta)meta.setAttribute('content',light?LIGHT_BG:DARK_BG);
  if(btn){btn.setAttribute('aria-pressed',light?'true':'false');btn.setAttribute('aria-label',light?'রাতের মোডে ফিরে যান':'দিনের আলোয় দেখুন')}
  swapLogos(light);
 };
 paint(isLight());                       /* pre-paint স্ক্রিপ্ট যা সেট করেছে, সেটাই বহাল */
 btn?.addEventListener('click',()=>{
  const next=!isLight();
  paint(next);
  try{localStorage.setItem(KEY,next?'light':'dark')}catch(e){}
 });
 /* অন্য ট্যাবে থিম বদলালে এখানেও বদলাক */
 addEventListener('storage',e=>{if(e.key===KEY)paint(e.newValue==='light')});
})();

/* ===== আরবি ফন্ট দেরিতে: বাংলা ফন্টের সাথে ব্যান্ডউইথের লড়াই বন্ধ ===== */
(()=>{
 const load=()=>{
  if(document.getElementById('fonts-arabic'))return;
  const l=document.createElement('link');l.id='fonts-arabic';l.rel='stylesheet';l.href='fonts-arabic.css';
  document.head.appendChild(l);
 };
 const queue=()=>{if('requestIdleCallback' in window)requestIdleCallback(load,{timeout:2000});else setTimeout(load,120)};
 addEventListener('load',()=>setTimeout(queue,120));
})();
