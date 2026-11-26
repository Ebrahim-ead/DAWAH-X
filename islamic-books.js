(function(){
  'use strict';
  var groups=window.ISLAMIC_BOOKS||[], root=document.querySelector('[data-books-page]');
  if(!root)return;
  var $=function(id){return document.getElementById(id);}, entries=new Map(), byGroup=new Map(), storageKey='dawahx-books-progress-v1';
  groups.forEach(function(group){byGroup.set(group.id,group);group.items.forEach(function(item,i){entries.set(item.id,{item:item,group:group,index:i});});});
  function normalize(value){return String(value||'').toLowerCase().replace(/[০-৯]/g,function(d){return String('০১২৩৪৫৬৭৮৯'.indexOf(d));}).replace(/\s+/g,' ').trim();}
  function bookURL(item,n){return 'islamic-book-read.html?book='+encodeURIComponent(item.id)+(n?'&page='+n:'');}
  function groupURL(group){return 'islamic-book-collection.html?collection='+encodeURIComponent(group.id);}
  function saved(){try{var data=JSON.parse(localStorage.getItem(storageKey)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(_){return {};}}
  function savedPage(data,id){var n=data.pages&&Number(data.pages[id]);return Number.isSafeInteger(n)&&n>0&&n<=100000?n:0;}
  function savePage(id,n){try{var data=saved();if(!data.pages||typeof data.pages!=='object'||Array.isArray(data.pages))data.pages={};data.pages[id]=n;data.last=id;localStorage.setItem(storageKey,JSON.stringify(data));}catch(_){} }
  var bookmarkKey='dawahx-books-bookmarks-v1',scaleKey='dawahx-books-scale-v1';
  function bookmarks(){try{var a=JSON.parse(localStorage.getItem(bookmarkKey)||'[]');return Array.isArray(a)?a.filter(function(x){return x&&entries.has(x.id)&&Number.isSafeInteger(x.page)&&x.page>0&&x.page<=100000;}).slice(0,102):[];}catch(_){return [];}}
  function setBookmarks(a){try{localStorage.setItem(bookmarkKey,JSON.stringify(a));return true;}catch(_){return false;}}
  function savedScale(){try{var n=Number(localStorage.getItem(scaleKey));return [1,1.25,1.5].includes(n)?n:1;}catch(_){return 1;}}
  function kind(group){return group.id==='bidaya'?'ইতিহাস':group.id==='ahmad'?'হাদিস':'তাফসীর';}
  function element(tag,className,text){var el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
  function aLink(text,url,className){var a=element('a',className,text);a.href=url;return a;}
  var type=root.dataset.booksPage;
  if(type==='catalog'){
    // Redirect links created by the original in-page reader without dropping their page number.
    var old=new URLSearchParams(location.hash.slice(1)), legacy=entries.get(old.get('book'));
    if(legacy){var oldPage=Number(old.get('page'));location.replace(bookURL(legacy.item,Number.isSafeInteger(oldPage)&&oldPage>0?oldPage:1));return;}
    var data=saved(),last=entries.get(data.last),lp=last?savedPage(data,last.item.id):0;
    if(last&&lp){$('books-resume').hidden=false;$('books-resume-title').textContent=last.item.name;$('books-resume-page').textContent='পৃষ্ঠা '+lp;$('books-resume-link').href=bookURL(last.item,lp);}
    var marks=bookmarks();if(marks.length){$('books-saved').hidden=false;marks.forEach(function(mark){var found=entries.get(mark.id),a=aLink(found.item.name+' · পৃষ্ঠা '+mark.page,bookURL(found.item,mark.page),'books-match-link');$('books-saved-list').appendChild(a);});}
    var input=$('books-search'), filter='all';
    function searchCatalog(){
      var q=normalize(input.value),visible=0,matchedItems=0;
      document.querySelectorAll('.books-card').forEach(function(card){
        var group=byGroup.get(card.dataset.group),matches=group.items.filter(function(item){return !q||normalize(group.name+' '+item.name).indexOf(q)!==-1;}), matchesGroup=q&&normalize(group.name).indexOf(q)!==-1;
        var show=(filter==='all'||kind(group)===filter)&&(!q||matchesGroup||matches.length>0),box=card.querySelector('.books-match-list');card.hidden=!show;box.hidden=true;box.textContent='';
        if(!show)return;visible++;matchedItems+=(!q||matchesGroup)?group.items.length:matches.length;
        if(q&&!matchesGroup&&matches.length){box.hidden=false;matches.slice(0,3).forEach(function(item){box.appendChild(aLink(item.name,bookURL(item),'books-match-link'));});if(matches.length>3)box.appendChild(element('p','books-match-more','আরও '+(matches.length-3)+'টি মিল এই সংগ্রহে'));}
      });
      $('books-count').textContent=visible+'টি সংগ্রহ · '+matchedItems+'টি খণ্ড / ফাইল';$('books-empty').hidden=visible>0;
    }
    input.addEventListener('input',searchCatalog);
    document.querySelectorAll('.books-filter').forEach(function(button){button.addEventListener('click',function(){filter=button.dataset.filter;document.querySelectorAll('.books-filter').forEach(function(b){var active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});searchCatalog();});});
    searchCatalog();return;
  }
  var params=new URLSearchParams(location.search);
  if(type==='collection'){
    var group=byGroup.get(params.get('collection'));
    if(!group){$('collection-content').hidden=true;$('collection-error').hidden=false;return;}
    document.title=group.name+' — DAWAH X';$('collection-crumb').textContent=group.name;$('collection-kind').textContent=kind(group)+' · বইয়ের সংগ্রহ';$('collection-title').textContent=group.name;
    $('collection-description').textContent='উৎসে পাওয়া খণ্ডগুলো থেকে একটি নির্বাচন করুন। প্রতিটি খণ্ড আলাদা পাঠক পাতায় খুলবে।';$('collection-count').textContent=group.items.length+'টি খণ্ড / ফাইল';
    var list=$('volume-list'),s=saved();group.items.forEach(function(item,i){
      var a=aLink('',bookURL(item),'books-volume'),icon=element('span','volume-number',String(i+1).padStart(2,'0')),copy=element('span','volume-copy'),name=element('strong','',item.name),progress=savedPage(s,item.id);
      copy.append(name,element('small','',progress?'পৃষ্ঠা '+progress+' থেকে পড়া চালিয়ে যান':'অনলাইন PDF · খণ্ড খুলুন'));a.append(icon,copy,element('span','volume-arrow','→'));a.dataset.search=normalize(item.name);list.appendChild(a);
    });
    function filterVolumes(){var q=normalize($('volume-search').value),n=0;list.querySelectorAll('.books-volume').forEach(function(a){a.hidden=!!q&&a.dataset.search.indexOf(q)===-1;if(!a.hidden)n++;});$('volume-count').textContent=n+'টি খণ্ড / ফাইল';$('volume-empty').hidden=n>0;}
    $('volume-search').addEventListener('input',filterVolumes);filterVolumes();return;
  }
  if(type!=='reader')return;
  var entry=entries.get(params.get('book'));
  if(!entry){$('books-reader').hidden=true;$('books-error').hidden=false;return;}
  var item=entry.item,doc=null,loading=null,renderTask=null,version=0,drawId=0,resizeTimer=0,canvas=$('books-canvas'),scale=savedScale();
  var requestedPage=Number(params.get('page')),progress=savedPage(saved(),item.id);
  var page=params.has('page')?(Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1):(progress||1);
  document.title=item.name+' — DAWAH X';$('books-reader-title').textContent=item.name;$('books-reader-subtitle').textContent=entry.group.name+' · উৎসের PDF অনলাইনে পড়ুন';
  $('books-back').textContent=entry.group.name;$('books-back').href=groupURL(entry.group);$('books-all-volumes').href=groupURL(entry.group);
  $('books-source').href=item.page;$('books-original').href=item.pdf;
  if(entry.index>0){$('books-previous-volume').hidden=false;$('books-previous-volume').href=bookURL(entry.group.items[entry.index-1]);}
  if(entry.index+1<entry.group.items.length){$('books-next-volume').hidden=false;$('books-next-volume').href=bookURL(entry.group.items[entry.index+1]);}
  function message(text){$('books-status').textContent=text;}
  $('books-scale').value=String(scale);
  function updateBookmark(){var marked=bookmarks().some(function(x){return x.id===item.id&&x.page===page;});$('books-bookmark').setAttribute('aria-pressed',String(marked));$('books-bookmark').textContent=marked?'★ এই পৃষ্ঠা সরান':'☆ এই পৃষ্ঠা রাখুন';}
  $('books-bookmark').addEventListener('click',function(){if(!doc){message('পৃষ্ঠা লোড হওয়ার পর সংরক্ষণ করুন।');return;}var a=bookmarks(),exists=a.some(function(x){return x.id===item.id&&x.page===page;});a=a.filter(function(x){return !(x.id===item.id&&x.page===page);});if(!exists){if(a.length>=102){message('১০২টি বুকমার্কের সীমা পূর্ণ। আগে একটি সরান।');return;}a.unshift({id:item.id,page:page});}if(!setBookmarks(a)){message('ব্রাউজারে বুকমার্ক সংরক্ষণ করা যায়নি।');return;}updateBookmark();message(exists?'বুকমার্ক সরানো হয়েছে।':'এই পৃষ্ঠা এই ব্রাউজারে সংরক্ষিত হয়েছে।');});
  function controls(){updateBookmark();var ready=!!doc;['books-prev','books-bottom-prev'].forEach(function(id){$(id).disabled=!ready||page<=1;});['books-next','books-bottom-next'].forEach(function(id){$(id).disabled=!ready||page>=doc.numPages;});$('books-page').value=String(page);$('books-page-total').textContent='/ '+(ready?doc.numPages:'—');$('books-bottom-page').textContent=ready?'পৃষ্ঠা '+page+' / '+doc.numPages:'—';$('books-progress-fill').style.width=ready?(page/doc.numPages*100)+'%':'0%';}
  function syncURL(){var url=new URL(location.href);url.searchParams.set('book',item.id);url.searchParams.set('page',String(page));url.hash='';history.replaceState(null,'',url.pathname+url.search);}
  function ensurePdf(){return window.pdfjsLib?Promise.resolve(window.pdfjsLib):import('./books-pdf.min.mjs');}
  async function draw(ticket){
    if(!doc)return;var drawing=++drawId,previous=renderTask;renderTask=null;
    if(previous){try{previous.cancel();await previous.promise.catch(function(){});}catch(_){}}
    var thisDoc=doc,thisPage=page;controls();message('পৃষ্ঠা '+page+' লোড হচ্ছে…');$('books-retry').hidden=true;canvas.hidden=true;$('books-canvas-placeholder').hidden=false;$('books-canvas-placeholder').textContent='পৃষ্ঠা লোড হচ্ছে…';
    try{
      var p=await thisDoc.getPage(thisPage);if(ticket!==version||drawing!==drawId||thisDoc!==doc||thisPage!==page)return;
      var initial=p.getViewport({scale:1}),space=Math.max(220,canvas.parentElement.clientWidth-8),desired=Math.min(2.5,space/initial.width)*scale;
      var viewport=p.getViewport({scale:desired}),dpr=Math.min(window.devicePixelRatio||1,2),maxPixels=12000000;
      dpr=Math.min(dpr,Math.sqrt(maxPixels/(viewport.width*viewport.height)));
      canvas.width=Math.max(1,Math.floor(viewport.width*dpr));canvas.height=Math.max(1,Math.floor(viewport.height*dpr));canvas.style.width=Math.floor(viewport.width)+'px';canvas.style.height=Math.floor(viewport.height)+'px';
      var task=p.render({canvasContext:canvas.getContext('2d'),viewport:viewport,transform:[dpr,0,0,dpr,0,0]});renderTask=task;await task.promise;
      if(ticket!==version||drawing!==drawId||thisDoc!==doc||thisPage!==page)return;renderTask=null;canvas.hidden=false;$('books-canvas-placeholder').hidden=true;canvas.setAttribute('aria-label',item.name+' · পৃষ্ঠা '+page);message('পৃষ্ঠা '+page+' / '+doc.numPages);syncURL();savePage(item.id,page);
    }catch(e){if(e&&e.name==='RenderingCancelledException')return;if(ticket===version&&drawing===drawId){message('এই পৃষ্ঠাটি দেখানো যায়নি। আবার চেষ্টা করুন অথবা উৎস পাতা খুলুন।');$('books-canvas-placeholder').textContent='পৃষ্ঠা লোড করা যায়নি';$('books-retry').hidden=false;}}
  }
  async function load(){
    var ticket=++version;doc=null;if(renderTask){try{renderTask.cancel();}catch(_){}renderTask=null;}
    if(loading){try{Promise.resolve(loading.destroy()).catch(function(){});}catch(_){}loading=null;}
    canvas.hidden=true;$('books-canvas-placeholder').hidden=false;$('books-canvas-placeholder').textContent='বই লোড হচ্ছে…';$('books-retry').hidden=true;controls();message('বই লোড হচ্ছে, বড় ফাইলের জন্য কিছু সময় লাগতে পারে…');
    try{
      var lib=await ensurePdf();if(ticket!==version)return;lib.GlobalWorkerOptions.workerSrc='books-pdf.worker.min.mjs';
      var task=lib.getDocument({url:item.pdf,isEvalSupported:false});loading=task;var loaded=await task.promise;if(ticket!==version){loaded.destroy();return;}
      doc=loaded;page=Math.max(1,Math.min(page,doc.numPages));controls();draw(ticket);
    }catch(e){if(ticket===version){doc=null;controls();message('বইটি লোড করা যায়নি। ইন্টারনেট ও উৎসের সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।');$('books-canvas-placeholder').textContent='বই লোড করা যায়নি';$('books-retry').hidden=false;}}
  }
  function jump(n,scroll){if(!doc)return;var target=Math.min(doc.numPages,Math.max(1,n));if(target===page){controls();return;}page=target;draw(version);if(scroll)$('books-page-view').scrollIntoView({behavior:'smooth',block:'start'});}
  ['books-prev','books-bottom-prev'].forEach(function(id){$(id).addEventListener('click',function(){jump(page-1,id==='books-bottom-prev');});});
  ['books-next','books-bottom-next'].forEach(function(id){$(id).addEventListener('click',function(){jump(page+1,id==='books-bottom-next');});});
  $('books-jump').addEventListener('submit',function(e){e.preventDefault();var n=Number(normalize($('books-page').value));if(Number.isSafeInteger(n)&&n>0)jump(n,false);else message('একটি সঠিক পৃষ্ঠা নম্বর লিখুন।');});
  $('books-scale').addEventListener('change',function(e){scale=Number(e.target.value)||1;try{localStorage.setItem(scaleKey,String(scale));}catch(_){}draw(version);});$('books-retry').addEventListener('click',function(){if(doc)draw(version);else load();});
  $('books-share').addEventListener('click',async function(){try{var url=new URL(location.href);url.searchParams.set('book',item.id);url.searchParams.set('page',String(page));url.hash='';await navigator.clipboard.writeText(url.href);message('এই পৃষ্ঠার লিংক কপি হয়েছে।');}catch(_){message('লিংক কপি করা যায়নি। ব্রাউজারের ঠিকানা থেকে কপি করুন।');}});
  window.addEventListener('resize',function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){if(doc)draw(version);},180);});
  window.addEventListener('keydown',function(e){if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowLeft'){e.preventDefault();jump(page-1,false);}else if(e.key==='ArrowRight'){e.preventDefault();jump(page+1,false);}});
  load();
}());
