(()=>{
 'use strict';
 const source=document.getElementById('source-browser'),recent=document.getElementById('recent-browser');
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e};
 const link=(title,href)=>{const a=el('a',title);a.href=href;return a};
 if(source)fetch('source-data.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  const select=el('select');select.setAttribute('aria-label','প্রকাশনা বেছে নিন');
  Object.keys(data.names).forEach(code=>{const o=el('option',data.names[code]+' · '+data.sources[code].length+'টি লেখা');o.value=code;select.append(o)});
  const search=el('input');search.type='search';search.placeholder='শিরোনাম খুঁজুন';search.setAttribute('aria-label','শিরোনাম খুঁজুন');
  const count=el('p','','qnote'),list=el('ol','','topic-list'),more=el('button','আরও দেখুন','qmore');more.type='button';let limit=50;
  const draw=()=>{const items=data.sources[select.value].filter(x=>x[1].toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));list.replaceChildren();for(const row of items.slice(0,limit)){const li=el('li');li.append(link(row[1],'s/'+row[0]+'.html'));list.append(li)}count.textContent=items.length+'টি লেখা · '+Math.min(items.length,limit)+'টি দেখানো হচ্ছে';more.hidden=limit>=items.length};
  select.addEventListener('change',()=>{limit=50;draw()});search.addEventListener('input',()=>{limit=50;draw()});more.addEventListener('click',()=>{limit+=50;draw()});source.replaceChildren(select,search,count,list,more);draw();
 }).catch(()=>{source.textContent='তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'});
 if(recent)fetch('recent-data.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  recent.replaceChildren();const h=el('h2','সাম্প্রতিক প্রকাশিত লেখা'),ol=el('ol','','topic-list');recent.append(h,ol);
  for(const x of data.texts){const li=el('li'),a=link(x.t,'s/'+x.k+'.html'),small=el('small',(data.names[x.s]||'')+' · '+x.shown);a.append(small);li.append(a);ol.append(li)}
  const vh=el('h2','সাম্প্রতিক প্রকাশিত ভিডিও'),vl=el('ol','','topic-list');recent.append(vh,vl);
  for(const v of data.videos){const li=el('li'),a=link(v.t,'videos.html?v='+encodeURIComponent(v.id)),small=el('small',v.c+' · '+v.d.slice(0,10));a.append(small);li.append(a);vl.append(li)}
 }).catch(()=>{recent.textContent='তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'});
})();
