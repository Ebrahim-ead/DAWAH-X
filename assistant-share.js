/* Untrusted share fragments are displayed as text, never HTML or authority. */
(()=>{
 'use strict';
 const status=document.getElementById('status'),content=document.getElementById('content');
 try{
  const hash=location.hash.slice(1);if(!/^[A-Za-z0-9_-]{1,16000}$/.test(hash))throw Error('invalid');
  const raw=atob(hash.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-hash.length%4)%4));
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!data||data.v!==1||typeof data.q!=='string'||data.q.length>1000||typeof data.a!=='string'||data.a.length>3000||!Array.isArray(data.sources)||data.sources.length>3)throw Error('invalid');
  document.getElementById('question').textContent=data.q;document.getElementById('answer').textContent=data.a;
  const list=document.getElementById('sources');
  for(const item of data.sources){if(!item||typeof item.title!=='string'||item.title.length>300||typeof item.href!=='string'||item.href.length>1000)throw Error('invalid');
   const u=new URL(item.href,location.href);if(!['https:','http:'].includes(u.protocol)||!(u.origin===location.origin||u.origin==='https://ebrahim-ead.github.io'))throw Error('invalid');
   const li=document.createElement('li'),a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.title;li.append(a);list.append(li);
  }
  status.textContent='';content.hidden=false;
 }catch(_){status.textContent='শেয়ার লিংকটি অসম্পূর্ণ বা সঠিক নয়।';content.hidden=true}
})();
