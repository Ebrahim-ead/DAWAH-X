/* Optional reader and home features; no external data requests. */
(()=>{
 'use strict';
 const daily=document.getElementById('daily-reading-card');
 if(daily){
  const cards=[...document.querySelectorAll('#daily-guidance .guidance-card')];
  if(cards.length){
   // Dhaka calendar day, independent of the device's time zone.
   const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
   const n=Math.floor(Date.UTC(+parts.year,+parts.month-1,+parts.day)/86400000);
   daily.append(cards[((n%cards.length)+cards.length)%cards.length].cloneNode(true));
   document.getElementById('daily-reading').hidden=false;
  }
 }
 const body=document.getElementById('read-body');if(!body)return;
 const key=new URLSearchParams(location.search).get('k')||'';
 if(!/^[0-9a-f]{14}$/.test(key))return;
 const seriesEl=document.getElementById('read-series');
 fetch('series.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  const at=data.m?.[key];if(!at)return;const s=data.s?.[at[0]],i=at[1];if(!s||!Array.isArray(s.p))return;
  function link(text,href){const a=document.createElement('a');a.textContent=text.replace(/[০-৯]/g,d=>String('০১২৩৪৫৬৭৮৯'.indexOf(d)));a.href=href;seriesEl.append(a)}
  link(s.t+' — '+s.p.length+'টি পর্বের সূচি →','series-'+s.id+'.html');
  if(s.p[i-1])link('← আগের: '+s.p[i-1][1],'s/'+s.p[i-1][0]+'.html');
  if(s.p[i+1])link('পরের: '+s.p[i+1][1]+' →','s/'+s.p[i+1][0]+'.html');
  seriesEl.hidden=false;
 }).catch(()=>{});
 fetch('cross-links.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  const matches=data.links.filter(x=>x.texts.some(t=>t.k===key));if(!matches.length)return;
  const box=document.getElementById('read-video-links');for(const x of matches){const a=document.createElement('a');a.className='share-btn';a.href='videos.html?v='+encodeURIComponent(x.id);a.textContent=x.title.replace(/[০-৯]/g,d=>String('০১২৩৪৫৬৭৮৯'.indexOf(d)));box.append(a)}
  document.getElementById('read-videos').hidden=false;
 }).catch(()=>{});
 const findVideos=document.getElementById('read-find-videos'),suggested=document.getElementById('read-suggested-videos');
 findVideos?.addEventListener('click',async()=>{
  const title=(document.getElementById('read-title')?.textContent||'').trim();if(!title||title.includes('লোড হচ্ছে'))return;
  findVideos.disabled=true;suggested.textContent='খোঁজা হচ্ছে…';
  try{const result=await SUGGEST.find(title.slice(0,200));if(!result)throw Error();const videos=await result.videos;suggested.replaceChildren();
   if(!videos.length)suggested.textContent='শিরোনামের শব্দে কোনো ভিডিও পাওয়া যায়নি।';
   for(const v of videos){const a=document.createElement('a');a.className='share-btn';a.href='videos.html?v='+encodeURIComponent(v.id);a.textContent=v.title;suggested.append(a)}
  }catch(_){suggested.textContent='খোঁজা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'}finally{findVideos.disabled=false}
 });
 const report=document.getElementById('read-report');
 if(report){const url=new URL('s/'+key+'.html',location.href).href;report.href='https://wa.me/8801783543026?text='+encodeURIComponent('আসসালামু আলাইকুম। এই লেখায় একটি সংশোধন জানাতে চাই:\n'+url+'\nসংশোধনের বিবরণ: ');report.target='_blank';report.rel='noopener noreferrer'}
 const KEY='dawahx-progress',button=document.getElementById('read-complete'),display=document.getElementById('reading-progress');
 const load=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');return d&&typeof d==='object'?d:{}}catch(_){return {}}};
 const store=d=>{try{localStorage.setItem(KEY,JSON.stringify(d));return true}catch(_){return false}};
 const paint=()=>{const x=load()[key]||{},done=!!x.done;button.setAttribute('aria-pressed',String(done));button.textContent=done?'পড়া হয়েছে ✓ — চিহ্ন সরান':'পড়া হয়েছে চিহ্নিত করুন';display.textContent=done?'পড়া হয়েছে':(x.p?'পড়ার অগ্রগতি: '+Math.round(x.p)+'%':'পড়ার অগ্রগতি এই ব্রাউজারে সংরক্ষিত থাকবে।')};
 button.addEventListener('click',()=>{const d=load(),x=d[key]||{};x.done=!x.done;x.t=Date.now();if(x.done)x.p=100;else if(x.p===100)x.p=0;d[key]=x;if(store(d))paint();else display.textContent='ব্রাউজারে সংরক্ষণ করা যায়নি।'});
 let scheduled=false;
 const update=()=>{scheduled=false;if(!body.textContent.trim()||body.textContent.includes('লোড হচ্ছে'))return;
  const rect=body.getBoundingClientRect(),height=rect.height;if(height<20)return;
  const p=Math.max(0,Math.min(100,Math.round((innerHeight-rect.top)/height*100)));
  if(p<2)return;const d=load(),x=d[key]||{};if(x.done||p<=(x.p||0))return;x.p=p;x.t=Date.now();d[key]=x;
  const keys=Object.keys(d);if(keys.length>500)keys.sort((a,b)=>(d[a].t||0)-(d[b].t||0)).slice(0,keys.length-500).forEach(k=>delete d[k]);
  if(store(d))paint();
 };
 window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}},{passive:true});
 window.addEventListener('storage',e=>{if(e.key===KEY)paint()});paint();
})();
