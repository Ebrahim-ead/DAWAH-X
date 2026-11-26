#!/usr/bin/env node
'use strict';
// Run with NODE_PATH pointing at a jsdom installation. Uses a project subpath
// and real shipped files; gzip can be tested both with and without HTTP decoding.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..');
let failChapter = false, encoded = false, delayIndexes = false;
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.replace(/^\/project\//, '');
  if (!/^[-a-z0-9.]+$/.test(name)) { res.writeHead(404).end(); return; }
  if (failChapter && name === 'scripture-hadith-bukhari-1.json.gz') { res.writeHead(503).end(); return; }
  try {
    const data = fs.readFileSync(path.join(root, name));
    if (name.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
    else if (name.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    else if (name.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
    else if (encoded && name.endsWith('.gz')) res.setHeader('Content-Encoding', 'gzip');
    if (delayIndexes && ['scripture-bn-translation.js','scripture-en-translation.js'].includes(name)) setTimeout(()=>res.end(data),250);
    else res.end(data);
  } catch (_) { res.writeHead(404).end(); }
});
async function waitFor(fn, label, ms=30000) {
  const end = Date.now()+ms;
  while (Date.now()<end) { if (fn()) return; await new Promise(r=>setTimeout(r,35)); }
  throw new Error('Timed out: '+label);
}
function click(w, selector) { const el=w.document.querySelector(selector); assert.ok(el,selector); el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true})); }
async function go(w, hash) { w.location.hash=hash; await new Promise(r=>setTimeout(r,100)); }
(async () => {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}/project/`, errors=[], vc=new VirtualConsole();
  vc.on('jsdomError', e=>errors.push(e.message)); vc.on('error', e=>errors.push(String(e)));
  async function open(file, hash='') {
    return JSDOM.fromURL(base+file+hash,{resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
      w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.TextDecoder=TextDecoder;
      w.__copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{w.__copied=t}}});w.fetch=(url,opts)=>fetch(new URL(url,w.location.href),opts);
      w.__audio=[];w.Audio=class extends w.EventTarget {
        constructor(){super();this._src='';this.paused=true;this.ended=false;this.error=null;this.loads=0;this.rejectNext=false;w.__audio.push(this)}
        get src(){return this._src} set src(v){this._src=v;this.ended=false;this.error=null}
        play(){if(this.rejectNext){this.rejectNext=false;return Promise.reject(new Error('media unavailable'))}this.paused=false;return Promise.resolve()}
        pause(){this.paused=true} removeAttribute(name){if(name==='src')this.src=''} load(){this.loads++;this.error=null;this.ended=false}
        finish(){this.ended=true;this.paused=true;this.dispatchEvent(new w.Event('ended'))}
      };
      w.__observers=[];w.IntersectionObserver=class {constructor(cb){this.cb=cb;this.disconnected=false;w.__observers.push(this)}observe(el){this.el=el}disconnect(){this.disconnected=true}trigger(){if(!this.disconnected)this.cb([{isIntersecting:true,target:this.el}])}};
    }});
  }
  // Full-surah playback uses one recording and shares the verse player.
  let playback=await open('quran.html','#/s/1/a/4'), pw=playback.window, psel=s=>pw.document.querySelector(s);
  await waitFor(()=>psel('[data-action=surah-audio]'),'complete surah control');
  assert.equal(pw.__audio.length,0,'do not autoplay on page load');
  click(pw,'[data-action=surah-audio]');let player=pw.__audio[0];
  const full=s=>'https://download.quranicaudio.com/quran/yasser_ad-dussary/'+String(s).padStart(3,'0')+'.mp3';
  assert.equal(player.src,full(1),'deep link plays whole surah');
  assert.equal(psel('[data-action=surah-audio]').getAttribute('aria-pressed'),'true');
  assert.match(psel('#surahAudioStatus').textContent,/সম্পূর্ণ সূরা চলছে/);
  assert(!psel('#surahAudioStatus').textContent.includes('আয়াত'), 'do not claim unverified verse progress');
  player.currentTime=14;
  click(pw,'[data-action=surah-audio]');assert(player.paused);assert.equal(psel('[data-action=surah-audio]').getAttribute('aria-pressed'),'false');
  player.dispatchEvent(new pw.Event('ended'));assert.equal(player.src,full(1),'stale ended does not stop playback while paused');
  click(pw,'[data-action=surah-audio]');assert(!player.paused);assert.equal(player.currentTime,14,'resume at same position');
  await go(pw,'/s/1/a/5');assert(!player.paused,'same-surah navigation continues full playback');
  click(pw,'[data-action=mode][data-mode=mushaf]');assert.equal(psel('[data-action=surah-audio]').getAttribute('aria-pressed'),'true');
  player.finish();assert.equal(player.src,full(1));assert.equal(psel('[data-action=surah-audio]').getAttribute('aria-pressed'),'false');assert.match(psel('#surahAudioStatus').textContent,/শেষ হয়েছে/);
  click(pw,'[data-action=surah-audio]');assert.equal(player.src,full(1),'replay starts at beginning');
  await go(pw,'/s/114/a/6');assert(player.paused);assert.equal(player.src,'','changing surah stops playback');
  click(pw,'[data-action=surah-audio]');assert.equal(player.src,full(114));player.finish();assert.match(psel('#surahAudioStatus').textContent,/শেষ হয়েছে/);
  click(pw,'[data-action=mode][data-mode=cards]');click(pw,'[data-action=surah-audio]');
  click(pw,'#v2 [data-action=audio]');assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/114002.mp3');
  player.finish();assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/114002.mp3','individual verse cancels full mode');
  player.rejectNext=true;click(pw,'[data-action=surah-audio]');await waitFor(()=>psel('[data-action=surah-audio]').getAttribute('aria-pressed')==='false','failed stream resets state');
  player.currentTime=20;let loads=player.loads;click(pw,'[data-action=surah-audio]');assert.equal(player.loads,loads+1,'failed stream reloads');
  player.currentTime=0;player.dispatchEvent(new pw.Event('loadedmetadata'));assert.equal(player.currentTime,20,'retry restores position');assert(!player.paused);
  player.error={code:2};player.dispatchEvent(new pw.Event('error'));assert.equal(psel('[data-action=surah-audio]').getAttribute('aria-pressed'),'false','media error reported');
  click(pw,'[data-action=surah-audio]');assert.equal(player.src,full(114),'retry keeps whole surah');
  await go(pw,'/surahs');assert(player.paused);assert.equal(player.src,'');playback.window.close();
  let dom = await open('quran.html'), w=dom.window, $=s=>w.document.querySelector(s);
  await waitFor(()=>w.document.querySelectorAll('.surah-card').length===114,'surah catalogue');
  assert.equal(w.location.hash,'#/surahs');
  assert.equal($('#menu a[href="hadith.html"]').getAttribute('href'),'hadith.html');
  assert.equal($('#menu a[aria-current="page"]').getAttribute('href'),'quran.html');
  await go(w,'/s/1/a/1');
  await waitFor(()=>$('#v1 .verse-translation')?.textContent.includes('রহমান, রহীম'),'translation');
  await waitFor(()=>$('#v1 .english-translation .tr-text')?.textContent === '(1) In the name of Allāh,[2] the Entirely Merciful, the Especially Merciful.[3]','English translation');
  assert.ok($('.source-note').textContent.includes('Saheeh International'));
  assert.ok($('#v1 .english-notes').textContent.includes('Allāh is a proper name'));
  assert.equal(w.__audio.length,0,'audio must not be requested before a click');
  click(w,'#v1 [data-action=audio]');assert.equal(w.__audio.length,1);assert.equal(w.__audio[0].src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001001.mp3');assert.equal($('#v1 [data-action=audio]').getAttribute('aria-pressed'),'true');
  click(w,'#v2 [data-action=audio]');assert.equal(w.__audio.length,1,'only one audio player');assert.equal(w.__audio[0].src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001002.mp3');assert.equal($('#v1 [data-action=audio]').getAttribute('aria-pressed'),'false');
  click(w,'#v2 [data-action=audio]');assert(w.__audio[0].paused);assert.equal($('#v2 [data-action=audio]').getAttribute('aria-pressed'),'false');
  assert.equal(w.document.querySelectorAll('footer .qlinks li').length,13);
  click(w,'#showEnglish'); assert.equal($('#v1 .english-translation'),null);
  click(w,'#showEnglish'); await waitFor(()=>$('#v1 .english-translation .tr-text')?.textContent.includes('In the name'), 'English translation re-enabled');
  await go(w,'/s/114/a/6'); await waitFor(()=>$('#v6 .english-translation .tr-text')?.textContent==='(6) From among the jinn and mankind."[2017]','last English verse');
  click(w,'#v6 [data-action=audio]');assert.equal(w.__audio[0].src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/114006.mp3');
  await go(w,'/s/1/a/1');assert(w.__audio[0].paused);assert.equal(w.__audio[0].src,'');
  await go(w,'/s/1/a/1'); await waitFor(()=>$('#v1 .fn-ref'),'first surah restored');
  click(w,'#v1 .fn-ref'); await waitFor(()=>$('#v1 .verse-tafsir .fn-anchor'),'Zakaria tafsir');
  let select=$('#tafsirSourceSelect'); select.value='ibn-kathir'; select.dispatchEvent(new w.Event('change',{bubbles:true}));
  click(w,'[data-action="mode"][data-mode="study"]'); await waitFor(()=>$('#v1 .tafsir-body'),'Ibn Kathir tafsir');
  click(w,'#v1 [data-action="bookmark"]'); assert.ok(w.localStorage.getItem('dawahx-quran:bookmarks').includes('1:1'));
  await go(w,'/surahs'); click(w,'a[href="#/bookmarks"]'); await waitFor(()=>$('.bookmark-item'),'saved Quran verse');
  assert.ok($('.bookmark-item').textContent.includes('আল-ফাতিহা'));
  await go(w,'/surahs'); const form=$('[data-action="search-submit"]'); form.querySelector('input').value='রহমান';
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await waitFor(()=>w.document.querySelectorAll('.result-bn-snippet').length>0,'Quran search');
  dom.window.close();
  // Input may change while the lazy indexes are still loading. Results must
  // reflect the latest query, and English matching is case-insensitive.
  delayIndexes=true; dom=await open('quran.html','#/search?q=a'); w=dom.window; $=s=>w.document.querySelector(s);
  await waitFor(()=>$('#searchInput'),'search input');
  $('#searchInput').value='MERCIFUL'; $('#searchInput').dispatchEvent(new w.Event('input',{bubbles:true}));
  await waitFor(()=>$('#searchResults')?.textContent.includes('ইংরেজি অনুবাদে মিল'),'latest English query');
  assert.ok($('#searchResults').textContent.includes('Merciful'));
  assert.ok(!$('#searchResults').textContent.includes('লোড হচ্ছে'));
  assert.ok(w.document.querySelector('#searchResults [data-s="1"][data-a="1"]'));
  click(w,'#searchResults [data-s="1"][data-a="1"]'); await waitFor(()=>$('#v1'),'English result opens the correct ayah');
  dom.window.close();
  dom=await open('quran.html','#/search?q='+encodeURIComponent('সকল')); w=dom.window; $=s=>w.document.querySelector(s);
  await waitFor(()=>$('#searchInput'),'Bengali search input');
  $('#searchInput').value='রহমান'; $('#searchInput').dispatchEvent(new w.Event('input',{bubbles:true}));
  await waitFor(()=>$('#searchResults')?.querySelector('.result-bn-snippet'),'latest Bengali query');
  assert.ok(!$('#searchResults').textContent.includes('লোড হচ্ছে'));
  assert.ok($('#searchResults').textContent.includes('রহমান'));
  dom.window.close(); delayIndexes=false;
  dom=await open('hadith.html'); w=dom.window; $=s=>w.document.querySelector(s);
  await waitFor(()=>w.document.querySelectorAll('.hadith-book').length===28,'book catalogue'); assert.equal(w.location.hash,'#/hadith');
  await go(w,'/hadith2/darimimirror');
  assert.match(w.document.querySelector('#app').textContent,/বর্তমান HadithBD-এর ৩৫৪৬ রেকর্ডের সম্পূর্ণ সংস্করণ নয়/);
  await go(w,'/hadith2/darimimirror/1');
  await waitFor(()=>w.document.querySelector('.hadith-card'),'Darimi mirror record');
  assert.match(w.document.querySelector('.hadith-card').textContent,/বর্তমান সংস্করণ সম্পূর্ণ নয়/);
  assert.match(w.document.querySelector('.hadith-card .hadith-grade-reason').textContent,/উৎসের সম্পূর্ণ পাঠ ও টীকা/);
  assert.equal(new URL(w.document.querySelector('.hadith-card a[href^="https://www.tauhiderdak.com/"]').href).hostname,'www.tauhiderdak.com');
  await go(w,'/hadith2/search?q=113&book=darimimirror');
  await waitFor(()=>w.document.querySelectorAll('#hadithResults .result-item').length===2,'both source records numbered 113');
  await go(w,'/hadith2/search?q=114&book=darimimirror');
  await waitFor(()=>w.document.querySelector('#hadithResults .empty-state h3')?.textContent.includes('কিছু পাওয়া যায়নি'),'missing mirror heading does not resolve to another record');
  await go(w,'/hadith2/dbhtdaif');
  assert.match($('#app').textContent,/সম্পূর্ণ বা বর্তমান HadithBD/);
  await go(w,'/hadith2/dbhtdaif/3');
  await waitFor(()=>$('.hadith-card .hadith-dbht-text'),'DBHT source record');
  assert.match($('.hadith-card').textContent,/শিরোনাম ও পাঠের নম্বর আলাদা/);
  assert.match($('.hadith-card').textContent,/পাঠের শিরোনাম নম্বর: 2/);
  assert.ok($('.hadith-card .hadith-dbht-text [dir=auto]'));
  await go(w,'/hadith2/search?q=2&book=dbhtdaif');
  await waitFor(()=>[...w.document.querySelectorAll('#hadithResults .result-item')].some(x=>x.textContent.includes('৩')),'search finds mismatching body number');
  await go(w,'/hadith');
  const bn=n=>String(n).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[+d]);
  const grades=w.document.querySelectorAll('.grade-card');
  assert.ok(grades[0].textContent.includes(bn(w.HADITH_GRADE_INDEX.daif.length)));
  assert.ok(grades[1].textContent.includes(bn(w.HADITH_GRADE_INDEX.mawdu.length)));
  for (const [book, b] of Object.entries(w.HADITH_INDEX.books)) {
    const sec=b.sections.find(s=>s.count); await go(w,`/hadith2/${book}/section/${sec.id}`);
    await waitFor(()=>w.HADITH_DATA[book][sec.id]?.length===sec.count,book+' chapter');
    assert.ok($('.hadith-card'),book+' rendered');
  }
  await go(w,'/hadith2/bukhari/section/64');await waitFor(()=>w.document.querySelectorAll('#hadithList .hadith-card').length===20,'first automatic batch');
  assert.equal(w.document.querySelectorAll('#hadithList button.more-btn').length,0);let ob=w.__observers.findLast(x=>!x.disconnected);assert(ob,'automatic observer');let kept=$('#hadithList .hadith-card');let focus=kept.querySelector('button');focus.focus();ob.trigger();
  await waitFor(()=>w.document.querySelectorAll('#hadithList .hadith-card').length===60,'automatic next batch');assert.equal(w.document.querySelectorAll('#hadithList .hadith-num').length,60);assert.equal($('#hadithList .hadith-card'),kept,'automatic batch preserves existing cards');assert.equal(w.document.activeElement,focus,'automatic batch preserves focus');
  await go(w,'/hadith2/grade/daif');await waitFor(()=>$('#hadithGradeResults .hadith-card .hadith-grade'),'weak-grade cards');
  assert.match($('#hadithGradeResults .hadith-grade').textContent,/যঈফ|দুর্বল/);assert.equal(w.document.querySelectorAll('#hadithGradeResults button.more-btn').length,0);
  ob=w.__observers.findLast(x=>!x.disconnected);assert(ob,'grade observer');kept=$('#hadithGradeResults .hadith-card');ob.trigger();await waitFor(()=>w.document.querySelectorAll('#hadithGradeResults .hadith-card').length>20,'automatic grade batch');assert.equal($('#hadithGradeResults .hadith-card'),kept,'grade batch preserves existing cards');
  await go(w,'/hadith/bukhari/1');assert(w.document.body.textContent.includes('সংগ্রহ পরিবর্তিত হয়েছে'),'old links do not change meaning');
  await go(w,'/hadith2/hundredsunnah/60');await waitFor(()=>$('.hadith-card .hadith-bn')?.textContent.includes('সর্বাবস্থায়'),'100 hadith chapter');
  assert.ok($('.hadith-ar.missing'));assert.equal($('.hadith-actions a').href,'https://ihadis.com/100-hadith/hadith/60');assert.match($('.hadith-grade-reason').textContent,/মুসলিম ৩৭৩/);
  await go(w,'/hadith2/ramadandaif/15');await waitFor(()=>$('.hadith-card .hadith-grade-reason')?.textContent.includes('ইব্‌ন রজব'),'Ramadan weak hadith notes');
  assert.ok($('.hadith-grade.daif'));assert.match($('.hadith-ar').textContent,/إني رأيت/);
  await go(w,'/hadith2/mishkatdaif/35');await waitFor(()=>$('.hadith-card .hadith-grade-reason')?.textContent.includes('পরিত্যক্ত'),'separate Mishkat weak book notes');
  assert.equal($('.hadith-actions a').href,'https://ihadis.com/miskate-dhaif-hadis/hadith/35');
  await go(w,'/hadith2/fazayeleamal/100');await waitFor(()=>$('.hadith-grade-reason')?.textContent.includes('৩০৫৩'),'Fazayele Amal note');
  assert.ok($('.hadith-ar.missing'));assert.equal($('.hadith-actions a').href,'https://ihadis.com/fazayele-amal/hadith/100');
  await go(w,'/hadith2/hadisequdsi/120');await waitFor(()=>$('.hadith-card .hadith-grade.hasan'),'Hadith Qudsi grade');
  assert.match($('.hadith-ar').textContent,/هُرَيْرَةَ/);assert.match($('.hadith-grade-reason').textContent,/হাকেম/);
  await go(w,'/hadith2/luluwal/section/0');await waitFor(()=>$('.hadith-card'),'Luluwal chapter zero');assert.match($('.hadith-card .hadith-bn').textContent,/মিথ্যারোপ করো না/);
  await go(w,'/hadith2/riyad/35');await waitFor(()=>$('.hadith-card .hadith-ref')?.textContent.includes('১০/৩৫'),'Riyad source reference');assert.equal($('.hadith-actions a').href,'https://ihadis.com/riyadus-salihin/hadith/35');
  await go(w,'/hadith2/riyad/942');await waitFor(()=>$('.hadith-card .hadith-ref')?.textContent.includes('৩/৯৪২'),'Riyad range expanded');assert.match($('.hadith-bn').textContent,/জানাযার নামায/);
  await go(w,'/hadith2/bulug/1448');await waitFor(()=>$('.hadith-card .hadith-ref')?.textContent.includes('১৪৪৮ - ১৪৪৯'),'Bulugh displayed range');assert.match($('.hadith-bn').textContent,/জুতা পরে/);
  await go(w,'/hadith2/targib/18');await waitFor(()=>$('.hadith-card .hadith-bn')?.textContent.includes('আবু হুরায়রা'),'Targhib embedded narrator');
  assert.match($('.hadith-ar').textContent,/هُرَيْرَةَ/);assert.equal($('.hadith-actions a').href,'https://ihadis.com/targib-wattahrib/hadith/18');
  await go(w,'/hadith2/upodesh/68');await waitFor(()=>$('.hadith-card .hadith-bn')?.textContent.includes('সামুরা ইবনে জুনদুব'),'Advice embedded narrator');
  assert.ok($('.hadith-grade.sahih'));assert.match($('.hadith-grade-reason').textContent,/বুখারী/);
  await go(w,'/hadith2/daifseries/14');await waitFor(()=>$('.hadith-card .hadith-grade-reason'),'iHadis direct edition');
  assert.equal($('.hadith-card .hadith-grade.daif').textContent, "যঈফ (Dai'f)");assert.equal($('.hadith-source-grade').textContent,'উৎসের মান: খুবই দুর্বল');assert.ok($('.hadith-ar.missing'));assert.match($('.hadith-grade-reason').textContent,/ওয়াকেদী/);
  assert.equal($('.hadith-actions a').href,'https://ihadis.com/dhaif-hadis-sirij/hadith/14');
  await go(w,'/hadith2/nawawi/11');await waitFor(()=>$('.hadith-card .hadith-source-grade')?.textContent.includes('হাসান সহিহ'),'iHadis full individual source');assert.ok($('.hadith-grade.hasan'));assert.ok($('.hadith-grade.sahih'));assert.match($('.hadith-card .hadith-ar').textContent,/الْحَسَنِ/);
  // All six requested styles, plus mixed and pending source verdicts.
  const badgeCases = [
    ['bukhari',1,'সহিহ হাদিস',[['sahih','সহিহ (Sahih)']]],
    ['nasai',50,'হাসান হাদিস',[['hasan','হাসান (Hasan)']]],
    ['nasai',34,'দুর্বল হাদিস',[['daif',"যঈফ (Dai'f)"]]],
    ['nasai',375,'মুনকার',[['munkar','মুনকার (সহিহ হাদীসের বিপরীত)']]],
    ['nasai',36,'অন্যান্য',[['other','অন্যান্য']]],
    ['abudawud',5081,'জাল হাদিস',[['mawdu','জাল (Fake)']]],
    ['nasai',753,'দুর্বল মুনকার',[['daif',"যঈফ (Dai'f)"],['munkar','মুনকার (সহিহ হাদীসের বিপরীত)']]],
    ['nasai',17,'হাসান সহিহ',[['hasan','হাসান (Hasan)'],['sahih','সহিহ (Sahih)']]],
    ['mishkat',18,'তাহকীক চলমান',[['other','অন্যান্য']]]
  ];
  for (const [book,num,sourceGrade,expected] of badgeCases) {
    await go(w,`/hadith2/${book}/${num}`);
    await waitFor(()=>$('.hadith-source-grade')?.textContent==='উৎসের মান: '+sourceGrade,'grade '+book+':'+num);
    assert.equal(w.document.querySelectorAll('.hadith-grade').length,expected.length);
    for (const [cls,text] of expected) assert.equal($('.hadith-grade.'+cls).textContent,text);
  }
  await go(w,'/hadith2/abudawud/1');await waitFor(()=>$('.hadith-card .hadith-bn'),'EAD first hadith');
  const source=w.HADITH_DATA.abudawud[1][0];assert.equal($('.hadith-bn').textContent,source[3]);assert.equal($('.hadith-source-grade').textContent,'উৎসের মান: '+source[7]);assert.equal($('.hadith-actions a').href,'https://ebrahim-ead.github.io/ead/hadith.html#abu-dawud:1:1');
  await go(w,'/hadith2/abudawud/3');await waitFor(()=>$('.hadith-grade-reason p'),'source note');assert.equal($('.hadith-grade-reason p').textContent,w.HADITH_DATA.abudawud[1][2][8]);
  click(w,'[data-action=hadith-bookmark]');await go(w,'/hadith2/saved');await waitFor(()=>$('#hadithSaved .hadith-card'),'saved hadith');
  await go(w,'/hadith2/search?q=1&book=abudawud');await waitFor(()=>$('#hadithResults .result-item'),'number search');
  assert([...w.document.querySelectorAll('#hadithResults .result-ref')].every(x=>x.textContent.includes('১')));
  await go(w,'/hadith2/search?q=886&book=bukhari');await waitFor(()=>$('#hadithResults .result-item'),'duplicate source number');
  assert.equal(w.document.querySelectorAll('#hadithResults .result-item').length,2,'both duplicate records are searchable');
  await go(w,'/hadith2/search?q=4457&book=mishkat');await waitFor(()=>$('#hadithResults')?.textContent.includes('কিছু পাওয়া যায়নি'),'missing source number');
  await go(w,'/hadith2/bukhari/54');await waitFor(()=>$('.hadith-ar.missing'),'missing Arabic is disclosed');
  w.localStorage.setItem('dawahx-quran:hadithBookmarks',JSON.stringify(['muslim:93']));
  await go(w,'/hadith2/saved');await waitFor(()=>w.document.body.textContent.includes('muslim:93'),'legacy bookmark IDs preserved but not reinterpreted');
  await go(w,'/hadith2/bukhari/1');await waitFor(()=>$('.hadith-card .hadith-bn'),'Bukhari direct link');
  await go(w,'/hadith2/search?q='+encodeURIComponent('আল্লাহ')+'&book=bukhari');
  await waitFor(()=>w.document.querySelectorAll('#hadithResults .result-item').length===40,'first search batch');
  assert.equal(w.document.querySelectorAll('#hadithResults button.more-btn').length,0);ob=w.__observers.findLast(x=>!x.disconnected);assert(ob,'search observer');kept=$('#hadithResults .result-item');kept.focus();ob.trigger();await waitFor(()=>w.document.querySelectorAll('#hadithResults .result-item').length>40,'automatic search batch');assert.equal($('#hadithResults .result-item'),kept);assert.equal(w.document.activeElement,kept);
  dom.window.close();
  encoded=true; dom=await open('hadith.html','#/hadith2/bukhari/7546'); w=dom.window; $=s=>w.document.querySelector(s);
  await waitFor(()=>$('.hadith-card'),'HTTP-decoded gzip direct link'); assert.ok($('[data-action="hadith-next"]').disabled); dom.window.close();
  encoded=false; failChapter=true; dom=await open('hadith.html','#/hadith2/search?q=1&book=bukhari'); w=dom.window; $=s=>w.document.querySelector(s);
  await waitFor(()=>$('#hadithResults')?.textContent.includes('অনুসন্ধান সম্পূর্ণ হয়নি'),'failed search notice');
  assert.ok(!$('#hadithResults').textContent.includes('কিছু পাওয়া যায়নি'));
  dom.window.close(); assert.deepEqual(errors,[]);
  console.log('scripture reader: project-relative routes, surahs, tafsir, search, all 28 collections, bookmarks, gzip modes and errors pass (jsdom)');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
