(function(){
  'use strict';
  var groups=window.ISLAMIC_BOOKS || [], $=function(id){return document.getElementById(id);};
  var cat=$('books-catalog'),search=$('books-search'),reader=$('books-reader'),status=$('books-status'),canvas=$('books-canvas');
  if(!cat||!search||!reader)return;
  var current=null,doc=null,loading=null,renderTask=null,version=0,drawId=0,page=1,scale=1,resizeTimer=0;
  var entries=new Map();
  var normalize=function(s){return String(s).toLowerCase().replace(/[০-৯]/g,function(d){return String('০১২৩৪৫৬৭৮৯'.indexOf(d));}).replace(/\s+/g,' ').trim();};
  cat.textContent='';
  groups.forEach(function(group){
    var details=document.createElement('details');details.className='books-group';
    var summary=document.createElement('summary'),text=document.createElement('div'),h=document.createElement('h2'),small=document.createElement('small');
    h.textContent=group.name;small.textContent=group.items.length+'টি খণ্ড/ফাইল';text.append(h,small);summary.append(text);details.append(summary);
    var list=document.createElement('ul');list.className='books-volume-list';
    group.items.forEach(function(item){
      entries.set(item.id,item);var li=document.createElement('li'),button=document.createElement('button'),label=document.createElement('span'),action=document.createElement('span');
      button.type='button';button.className='books-volume';label.textContent=item.name;action.textContent='পড়ুন →';button.append(label,action);li.append(button);list.append(li);
      li.dataset.search=normalize(group.name+' '+item.name);button.addEventListener('click',function(){openBook(item,1,true);});
    });details.append(list);details.dataset.search=normalize(group.name);cat.append(details);
  });
  function filter(){
    var q=normalize(search.value),n=0,gn=0;
    cat.querySelectorAll('.books-group').forEach(function(g){var visible=0,groupMatch=q && g.dataset.search.indexOf(q)!==-1;
      g.querySelectorAll('li').forEach(function(li){var show=!q||groupMatch||li.dataset.search.indexOf(q)!==-1;li.hidden=!show;if(show){visible++;n++;}});
      g.hidden=!visible;if(visible)gn++;if(q&&visible)g.open=true;else if(!q)g.open=false;
    });$('books-count').textContent=gn+'টি সংগ্রহ · '+n+'টি খণ্ড/ফাইল';
  }
  search.addEventListener('input',filter);filter();
  function setStatus(message){status.textContent=message;}
  function setButtons(){var ready=!!doc;$('books-prev').disabled=!ready||page<=1;$('books-next').disabled=!ready||page>=doc.numPages;$('books-page').value=String(page);$('books-page-total').textContent='/ '+(ready?doc.numPages:'—');}
  function setHash(){if(current)history.replaceState(null,'','#book='+encodeURIComponent(current.id)+'&page='+page);}
  function ensurePdf(){
    if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
    return import('./books-pdf.min.mjs');
  }
  async function draw(ticket){
    if(!doc)return;
    var drawing=++drawId;
    if(renderTask){try{renderTask.cancel();}catch(_){}renderTask=null;}
    var thisDoc=doc,thisPage=page;setButtons();setStatus('পৃষ্ঠা '+page+' লোড হচ্ছে…');
    try{
      var p=await thisDoc.getPage(thisPage);if(ticket!==version||drawing!==drawId||thisDoc!==doc||thisPage!==page)return;
      var initial=p.getViewport({scale:1}),space=Math.max(220,canvas.parentElement.clientWidth-8),desired=Math.min(2.5,space/initial.width)*scale;
      var viewport=p.getViewport({scale:desired}),dpr=Math.min(window.devicePixelRatio||1,2),maxPixels=12000000;
      dpr=Math.min(dpr,Math.sqrt(maxPixels/(viewport.width*viewport.height)));
      canvas.width=Math.max(1,Math.floor(viewport.width*dpr));canvas.height=Math.max(1,Math.floor(viewport.height*dpr));canvas.style.width=Math.floor(viewport.width)+'px';canvas.style.height=Math.floor(viewport.height)+'px';
      var task=p.render({canvasContext:canvas.getContext('2d'),viewport:viewport,transform:[dpr,0,0,dpr,0,0]});renderTask=task;await task.promise;
      if(ticket!==version||drawing!==drawId||thisDoc!==doc||thisPage!==page)return;renderTask=null;setStatus('পৃষ্ঠা '+page+' / '+doc.numPages);setHash();
    }catch(e){if(e&&e.name==='RenderingCancelledException')return;if(ticket===version&&drawing===drawId)setStatus('এই পৃষ্ঠাটি দেখানো যায়নি। আবার চেষ্টা করুন অথবা উৎস পাতা খুলুন।');}
  }
  async function openBook(item,n,focus){
    var ticket=++version;current=item;page=Math.max(1,n||1);doc=null;if(renderTask){try{renderTask.cancel();}catch(_){}renderTask=null;}
    if(loading){try{loading.destroy();}catch(_){}loading=null;}
    canvas.width=1;canvas.height=1;canvas.style.width='';canvas.style.height='';reader.hidden=false;$('books-reader-title').textContent=item.name;$('books-source').href=item.page;$('books-original').href=item.pdf;setButtons();setStatus('বই লোড হচ্ছে, বড় ফাইলের জন্য কিছু সময় লাগতে পারে…');setHash();
    if(focus){reader.scrollIntoView({behavior:'smooth',block:'start'});$('books-close').focus({preventScroll:true});}
    try{
      var lib=await ensurePdf();if(ticket!==version)return;lib.GlobalWorkerOptions.workerSrc='books-pdf.worker.min.mjs';
      var task=lib.getDocument({url:item.pdf,isEvalSupported:false});loading=task;var loaded=await task.promise;if(ticket!==version){loaded.destroy();return;}
      doc=loaded;page=Math.max(1,Math.min(page,doc.numPages));setButtons();draw(ticket);
    }catch(e){if(ticket===version){doc=null;setButtons();setStatus('বইটি লোড করা যায়নি। ইন্টারনেট ও উৎসের সংযোগ পরীক্ষা করুন, অথবা উৎস পাতা খুলুন।');}}
  }
  function jump(n){if(!doc)return;page=Math.min(doc.numPages,Math.max(1,n));draw(version);}
  $('books-prev').addEventListener('click',function(){jump(page-1);});$('books-next').addEventListener('click',function(){jump(page+1);});
  $('books-jump').addEventListener('submit',function(e){e.preventDefault();var n=Number(normalize($('books-page').value));if(Number.isSafeInteger(n)&&n>0)jump(n);else setStatus('একটি সঠিক পৃষ্ঠা নম্বর লিখুন।');});
  $('books-scale').addEventListener('change',function(e){scale=Number(e.target.value)||1;draw(version);});
  $('books-close').addEventListener('click',function(){++version;if(renderTask){try{renderTask.cancel();}catch(_){}}if(loading){try{loading.destroy();}catch(_){}}loading=null;doc=null;current=null;reader.hidden=true;history.replaceState(null,'',location.pathname+location.search);search.focus();});
  window.addEventListener('resize',function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){if(doc)draw(version);},180);});
  var params=new URLSearchParams(location.hash.slice(1)),item=entries.get(params.get('book'));
  if(item){var n=parseInt(params.get('page'),10);openBook(item,Number.isSafeInteger(n)&&n>0?n:1,false);}
}());
