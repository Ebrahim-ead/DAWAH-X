(()=>{
 'use strict';
 const source=document.getElementById('source-browser'),recent=document.getElementById('recent-browser');
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e};
 const link=(title,href)=>{const a=el('a',title);a.href=href;return a};
 if(source)fetch('source-index.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  const select=el('select');select.setAttribute('aria-label','প্রকাশনা বেছে নিন');
  Object.keys(data.sources).forEach(code=>{const info=data.sources[code],o=el('option',info.name+' · '+info.count+'টি লেখা');o.value=code;select.append(o)});
  const search=el('input');search.type='search';search.placeholder='শিরোনাম খুঁজুন';search.setAttribute('aria-label','শিরোনাম খুঁজুন');
  const count=el('p','','qnote'),list=el('ol','','topic-list'),more=el('button','আরও দেখুন','qmore');more.type='button';count.setAttribute('aria-live','polite');
  const chunks=new Map();let limit=50,sequence=0,timer,filteredCache=null;
  const load=file=>{if(!chunks.has(file)){const task=fetch(file).then(r=>{if(!r.ok)throw Error();return r.json()}).then(rows=>{if(!Array.isArray(rows))throw Error();return rows}).catch(e=>{chunks.delete(file);throw e});chunks.set(file,task)}return chunks.get(file)};
  const show=(items,total,loading)=>{const fragment=document.createDocumentFragment();for(const row of items.slice(0,limit)){const li=el('li');li.append(link(row[1],'s/'+row[0]+'.html'));fragment.append(li)}list.replaceChildren(fragment);
   count.textContent=loading?'খোঁজা হচ্ছে… এখন পর্যন্ত '+items.length+'টি লেখা পাওয়া গেছে':total+'টি লেখা · '+Math.min(items.length,limit)+'টি দেখানো হচ্ছে';more.hidden=loading||limit>=total;more.disabled=loading};
  async function draw(){const token=++sequence,info=data.sources[select.value],term=search.value.trim().toLocaleLowerCase();more.disabled=true;
   try{if(!term){count.textContent='তালিকা লোড হচ্ছে…';list.replaceChildren();more.hidden=true;const n=Math.min(info.files.length,Math.ceil(limit/data.chunkSize)),all=(await Promise.all(info.files.slice(0,n).map(load))).flat();if(token!==sequence)return;show(all,info.count,false);return}
    if(filteredCache&&filteredCache.code===select.value&&filteredCache.term===term){show(filteredCache.rows,filteredCache.rows.length,false);return}
    const found=[];show(found,0,true);for(let i=0;i<info.files.length;i+=3){const parts=await Promise.all(info.files.slice(i,i+3).map(load));if(token!==sequence)return;for(const row of parts.flat())if(row[1].toLocaleLowerCase().includes(term))found.push(row);show(found,found.length,i+3<info.files.length);await new Promise(resolve=>setTimeout(resolve,0))}
    if(token===sequence){filteredCache={code:select.value,term,rows:found};if(info.files.length===0)show(found,0,false)}
   }catch(_){if(token!==sequence)return;count.textContent='তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।';more.hidden=false;more.disabled=false;more.textContent='আবার চেষ্টা করুন'}
  }
  select.addEventListener('change',()=>{clearTimeout(timer);limit=50;more.textContent='আরও দেখুন';draw()});search.addEventListener('input',()=>{clearTimeout(timer);sequence++;limit=50;more.textContent='আরও দেখুন';timer=setTimeout(draw,180)});more.addEventListener('click',()=>{if(more.textContent==='আবার চেষ্টা করুন')more.textContent='আরও দেখুন';else limit+=50;draw()});source.replaceChildren(select,search,count,list,more);draw();
 }).catch(()=>{source.textContent='তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'});
 if(recent)fetch('recent-data.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  recent.replaceChildren();const h=el('h2','সাম্প্রতিক প্রকাশিত লেখা'),ol=el('ol','','topic-list');recent.append(h,ol);
  for(const x of data.texts){const li=el('li'),a=link(x.t,'s/'+x.k+'.html'),small=el('small',(data.names[x.s]||'')+' · '+x.shown);a.append(small);li.append(a);ol.append(li)}
  const vh=el('h2','সাম্প্রতিক প্রকাশিত ভিডিও'),vl=el('ol','','topic-list');recent.append(vh,vl);
  for(const v of data.videos){const li=el('li'),a=link(v.t,'videos.html?v='+encodeURIComponent(v.id)),small=el('small',v.c+' · '+v.d.slice(0,10));a.append(small);li.append(a);vl.append(li)}
 }).catch(()=>{recent.textContent='তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'});
})();
