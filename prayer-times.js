/* আলআযান: ঢাকা, করাচি পদ্ধতি (18°/18°), স্ট্যান্ডার্ড আসর। */
(()=>{
 const dateNode=document.getElementById('prayer-date'),nextNode=document.getElementById('prayer-next');
 if(!dateNode||!nextNode)return;
 const keys=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
 const apiKeys={fajr:'Fajr',sunrise:'Sunrise',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'};
 const names={fajr:'ফজর',sunrise:'সূর্যোদয়',dhuhr:'যোহর',asr:'আসর',maghrib:'মাগরিব',isha:'এশা'};
 const cards=keys.map(key=>document.querySelector('.prayer-card[data-prayer="'+key+'"]'));
 const months=new Map(),inflight=new Map(),failures=new Map(),ttl=6*60*60*1000,retryAfter=5*60*1000;
 let shownDay='',sequence=0,midnightTimer;
 const dayParts=now=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return {year:Number(p.year),month:Number(p.month),day:Number(p.day),key:p.year+'-'+p.month+'-'+p.day};
 };
 const tomorrow=day=>{const d=new Date(Date.UTC(day.year,day.month-1,day.day+1));return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()}};
 const clear=()=>cards.forEach(card=>{if(!card)return;card.classList.remove('is-current','is-next');const time=card.querySelector('time');time.textContent='—';time.removeAttribute('datetime');card.querySelector('.prayer-state').textContent=''});
 const scheduleMidnight=now=>{
  window.clearTimeout(midnightTimer);
  const offset=6*60*60*1000,dayMs=24*60*60*1000;
  const remaining=dayMs-((now.getTime()+offset)%dayMs+dayMs)%dayMs;
  midnightTimer=window.setTimeout(render,remaining+50);
 };
 // Validate the complete month, including date, method, school and timezone.
 // Do not silently present stale, malformed or differently configured times.
 function parseCalendar(data,year,month){
  const days=new Date(Date.UTC(year,month,0)).getUTCDate();
  if(data?.code!==200||!Array.isArray(data.data)||data.data.length!==days)throw Error('invalid calendar');
  const output=new Map();
  for(const row of data.data){
   const match=/^(\d{2})-(\d{2})-(\d{4})$/.exec(row?.date?.gregorian?.date||'');
   if(!match||Number(match[2])!==month||Number(match[3])!==year)throw Error('invalid date');
   const day=Number(match[1]);if(day<1||day>days||output.has(day))throw Error('duplicate date');
   if(row.meta?.timezone!=='Asia/Dhaka'||row.meta?.latitude!==23.7104||row.meta?.longitude!==90.40744||row.meta?.method?.id!==1||row.meta?.method?.params?.Fajr!==18||row.meta?.method?.params?.Isha!==18||row.meta?.school!=='STANDARD')throw Error('invalid location or method');
   const times={};
   for(const key of keys){
    const name=apiKeys[key],value=row.timings?.[name];
    const m=typeof value==='string'&&/^([01]\d|2[0-3]):([0-5]\d)(?:\s+\(\+06(?::?00)?\))?$/.exec(value);
    if(!m||row.meta.offset?.[name]!==0)throw Error('invalid timing');
    times[key]=new Date(Date.UTC(year,month-1,day,Number(m[1])-6,Number(m[2])));
   }
   for(let i=1;i<keys.length;i++)if(times[keys[i]]<=times[keys[i-1]])throw Error('invalid order');
   output.set(day,times);
  }
  return output;
 }
 async function calendar(day){
  const id=day.year+'-'+String(day.month).padStart(2,'0'),now=Date.now(),cached=months.get(id);
  if(cached&&cached.until>now)return cached.data;
  if(inflight.has(id))return inflight.get(id);
  if((failures.get(id)||0)>now)throw Error('temporarily unavailable');
  const request=Promise.resolve().then(async()=>{
   const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),12000);
   try{
    const url='https://api.aladhan.com/v1/calendar/'+day.year+'/'+day.month+'?latitude=23.7104&longitude=90.40744&method=1&school=0';
    const response=await fetch(url,{signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw Error('calendar unavailable');
    const data=parseCalendar(await response.json(),day.year,day.month);
    months.set(id,{data,until:Date.now()+ttl});failures.delete(id);return data;
   }catch(error){months.delete(id);failures.set(id,Date.now()+retryAfter);throw error}
   finally{window.clearTimeout(timer);inflight.delete(id)}
  });
  inflight.set(id,request);return request;
 }
 const formatted=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit',hour12:true});
 const dateFormat=new Intl.DateTimeFormat('bn-BD-u-nu-latn',{timeZone:'Asia/Dhaka',weekday:'long',day:'numeric',month:'long',year:'numeric'});
 async function render(){
  const id=++sequence;let now=new Date();const day=dayParts(now);
  dateNode.textContent=dateFormat.format(now);
  const monthId=day.year+'-'+String(day.month).padStart(2,'0'),cached=months.get(monthId);
  if(shownDay!==day.key||!cached||cached.until<=Date.now()){
   shownDay=day.key;clear();nextNode.textContent='আলআযান থেকে সময়সূচি আনা হচ্ছে…';
  }
  try{
   if(cards.some(card=>!card))throw Error('missing card');
   const times=(await calendar(day)).get(day.day);
   if(id!==sequence)return;
   now=new Date();if(dayParts(now).key!==day.key){render();return}
   if(!times)throw Error('missing day');
   let current=-1;for(let i=0;i<keys.length;i++)if(now>=times[keys[i]])current=i;
   const next=current+1;
   cards.forEach((card,i)=>{
    const time=card.querySelector('time');time.textContent=formatted.format(times[keys[i]]);time.dateTime=times[keys[i]].toISOString();
    card.classList.toggle('is-current',i===current);card.classList.toggle('is-next',i===next);
    card.querySelector('.prayer-state').textContent=i===current?'সর্বশেষ সময়':i===next?'পরবর্তী':'';
   });
   if(next<keys.length)nextNode.textContent='পরবর্তী: '+names[keys[next]]+' · '+formatted.format(times[keys[next]]);
   else{
    nextNode.textContent='আগামীকালের ফজরের সময় আনা হচ্ছে…';
    try{const nextDay=tomorrow(day),nextTimes=(await calendar(nextDay)).get(nextDay.day);
     if(id!==sequence)return;if(dayParts(new Date()).key!==day.key){render();return}
     if(!nextTimes)throw Error('missing next day');nextNode.textContent='পরবর্তী: ফজর · আগামীকাল '+formatted.format(nextTimes.fajr);
    }catch(_){if(id===sequence)nextNode.textContent='আগামীকালের ফজরের সময় পাওয়া যাচ্ছে না। আলআযানের লিংক বা স্থানীয় সময়সূচি দেখুন।'}
   }
  }catch(_){if(id===sequence){clear();nextNode.textContent='আলআযানের সময়সূচি এখন পাওয়া যাচ্ছে না। লিংক বা স্থানীয় সময়সূচি দেখুন।'}}
  finally{if(id===sequence)scheduleMidnight(new Date())}
 }
 render();window.setInterval(render,60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 window.addEventListener('pageshow',render);window.addEventListener('focus',render);
})();
