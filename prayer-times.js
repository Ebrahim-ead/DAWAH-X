/* ঢাকার আনুমানিক সময়: adhan-js, করাচি 18°/18° এবং শাফেয়ী আসর। */
(()=>{
 const dateNode=document.getElementById('prayer-date'),nextNode=document.getElementById('prayer-next');
 if(!dateNode||!nextNode)return;
 const details=document.getElementById('prayer-reference'),frame=document.getElementById('prayer-frame');
 const keys=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
 const names={fajr:'ফজর',sunrise:'সূর্যোদয়',dhuhr:'যোহর',asr:'আসর',maghrib:'মাগরিব',isha:'এশা'};
 const cards=keys.map(key=>document.querySelector('.prayer-card[data-prayer="'+key+'"]'));
 let widgetDay='', midnightTimer;
 // Dhaka stays at UTC+06:00; schedule an update for its next calendar day.
 // A suspended tab is refreshed again on visibilitychange/pageshow/focus.
 const scheduleMidnight=now=>{
  window.clearTimeout(midnightTimer);
  const dhakaOffset=6*60*60*1000,dayMs=24*60*60*1000;
  const remaining=dayMs-((now.getTime()+dhakaOffset)%dayMs+dayMs)%dayMs;
  midnightTimer=window.setTimeout(render,remaining+50);
 };
 const dayParts=now=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return {year:Number(values.year),month:Number(values.month),day:Number(values.day),key:values.year+'-'+values.month+'-'+values.day};
 };
 const widgetRefresh=day=>{
  if(!details?.open||!frame?.dataset.src||widgetDay===day)return;
  const url=new URL(frame.dataset.src);url.searchParams.set('dawahx_day',day);
  frame.src=url.href;widgetDay=day;
 };
 const render=()=>{
  try{
   if(typeof DawahAdhan==='undefined'||cards.some(card=>!card))throw new Error('calculator unavailable');
   const now=new Date(),day=dayParts(now),date=new Date(day.year,day.month-1,day.day,12);
   const params=DawahAdhan.CalculationMethod.Karachi();
   const coords=new DawahAdhan.Coordinates(23.7104,90.40744);
   const times=new DawahAdhan.PrayerTimes(coords,date,params);
   if(keys.some(key=>!(times[key] instanceof Date)||!Number.isFinite(times[key].getTime())))throw new Error('invalid prayer time');
   const formatted=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit',hour12:true});
   const dateFormat=new Intl.DateTimeFormat('bn-BD-u-nu-latn',{timeZone:'Asia/Dhaka',weekday:'long',day:'numeric',month:'long',year:'numeric'});
   dateNode.textContent=dateFormat.format(now);
   let current=-1;for(let i=0;i<keys.length;i++)if(now>=times[keys[i]])current=i;
   const next=current+1;
   cards.forEach((card,i)=>{
    const time=card.querySelector('time');time.textContent=formatted.format(times[keys[i]]);time.dateTime=times[keys[i]].toISOString();
    card.classList.toggle('is-current',i===current);card.classList.toggle('is-next',i===next);
    card.querySelector('.prayer-state').textContent=i===current?'সর্বশেষ সময়':i===next?'পরবর্তী':'';
   });
   if(next<keys.length){nextNode.textContent='পরবর্তী: '+names[keys[next]]+' · '+formatted.format(times[keys[next]])}
   else{
    const tomorrow=new Date(day.year,day.month-1,day.day+1,12);
    const fajr=new DawahAdhan.PrayerTimes(coords,tomorrow,params).fajr;
    if(!Number.isFinite(fajr.getTime()))throw new Error('invalid next day');
    nextNode.textContent='পরবর্তী: ফজর · আগামীকাল '+formatted.format(fajr);
   }
   widgetRefresh(day.key);
  }catch(_){
   cards.forEach(card=>{if(!card)return;card.classList.remove('is-current','is-next');card.querySelector('time').textContent='—';card.querySelector('time').removeAttribute('datetime');card.querySelector('.prayer-state').textContent=''});
   dateNode.textContent='ঢাকা · বাংলাদেশ সময়';nextNode.textContent='সময় গণনা করা যাচ্ছে না। IslamicFinder-এর লিংক বা স্থানীয় সময়সূচি দেখুন।';
  }finally{scheduleMidnight(new Date())}
 };
 render();window.setInterval(render,60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 window.addEventListener('pageshow',render);
 window.addEventListener('focus',render);
 details?.addEventListener('toggle',render);
})();
