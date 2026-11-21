/* IslamicFinder-এর ঢাকার উইজেট: বাংলাদেশে দিন বদলালে নতুন দিনের তথ্য আনতে রিফ্রেশ। */
(()=>{
 const frame=document.getElementById('prayer-frame');
 if(!frame)return;
 const source=frame.dataset.src;
 if(!source)return;
 let loadedDay='';
 const dayInDhaka=()=>{
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  catch(_){return ''}
 };
 const refresh=()=>{
  const day=dayInDhaka();
  if(frame.getAttribute('src')&&(!day||day===loadedDay))return;
  loadedDay=day;
  const url=new URL(source);
  if(day)url.searchParams.set('dawahx_day',day);
  frame.src=url.href;
 };
 refresh();
 window.setInterval(refresh,60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.addEventListener('pageshow',refresh);
})();
