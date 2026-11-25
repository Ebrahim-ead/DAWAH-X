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
  if (failChapter && name === 'scripture-hadith-nawawi-1.json.gz') { res.writeHead(503).end(); return; }
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
      w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.TextDecoder=TextDecoder;w.fetch=(url,opts)=>fetch(new URL(url,w.location.href),opts);
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
  // Full-surah playback reuses the verse player, handles races and all endings.
  let playback=await open('quran.html','#/s/1/a/4'), pw=playback.window, psel=s=>pw.document.querySelector(s);
  await waitFor(()=>psel('[data-action=surah-audio]'),'complete surah control');
  assert.equal(pw.__audio.length,0,'do not autoplay on page load');
  click(pw,'[data-action=surah-audio]');let player=pw.__audio[0];
  assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001001.mp3','full surah starts at first verse even from deep link');
  assert.equal(psel('[data-action=surah-audio]').getAttribute('aria-pressed'),'true');
  player.finish();assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001002.mp3');
  assert.match(psel('#surahAudioStatus').textContent,/আয়াত ২ \/ ৭/);
  click(pw,'[data-action=surah-audio]');assert(player.paused);assert.equal(psel('[data-action=surah-audio]').getAttribute('aria-pressed'),'false');
  player.dispatchEvent(new pw.Event('ended'));assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001002.mp3','stale ended does not advance while paused');
  click(pw,'[data-action=surah-audio]');assert(!player.paused);assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001002.mp3');
  await go(pw,'/s/1/a/5');assert(!player.paused,'same-surah navigation continues full playback');
  click(pw,'[data-action=mode][data-mode=mushaf]');assert.equal(psel('[data-action=surah-audio]').getAttribute('aria-pressed'),'true','mode changes retain the queue');
  for(let n=2;n<=7;n++)player.finish();
  assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001007.mp3','stop at last verse');
  assert.equal(psel('[data-action=surah-audio]').getAttribute('aria-pressed'),'false');assert.match(psel('#surahAudioStatus').textContent,/শেষ হয়েছে/);
  click(pw,'[data-action=surah-audio]');assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001001.mp3','replay starts at first verse');
  await go(pw,'/s/114/a/6');assert(player.paused);assert.equal(player.src,'','changing surah stops playback');
  click(pw,'[data-action=surah-audio]');assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/114001.mp3');
  for(let n=1;n<=6;n++)player.finish();assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/114006.mp3');assert.match(psel('#surahAudioStatus').textContent,/শেষ হয়েছে/);
  click(pw,'[data-action=mode][data-mode=cards]');click(pw,'[data-action=surah-audio]');
  click(pw,'#v2 [data-action=audio]');assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/114002.mp3');
  player.finish();assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/114002.mp3','individual verse cancels continuous mode');
  player.rejectNext=true;click(pw,'[data-action=surah-audio]');await waitFor(()=>psel('[data-action=surah-audio]').getAttribute('aria-pressed')==='false','failed stream resets state');
  let loads=player.loads;click(pw,'[data-action=surah-audio]');assert.equal(player.loads,loads+1,'failed stream retries media');assert(!player.paused);
  player.rejectNext=true;player.finish();await waitFor(()=>psel('[data-action=surah-audio]').getAttribute('aria-pressed')==='false','next verse failure is reported');
  assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/114002.mp3');
  click(pw,'[data-action=surah-audio]');assert.equal(player.src,'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/114002.mp3','retry resumes the failed verse without skipping');
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
  await waitFor(()=>w.document.querySelectorAll('.hadith-book').length===9,'book catalogue'); assert.equal(w.location.hash,'#/hadith');
  const bn=n=>String(n).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[+d]);
  const grades=w.document.querySelectorAll('.grade-card');
  assert.ok(grades[0].textContent.includes(bn(w.HADITH_GRADE_INDEX.daif.length)));
  assert.ok(grades[1].textContent.includes(bn(w.HADITH_GRADE_INDEX.mawdu.length)));
  for (const [book, b] of Object.entries(w.HADITH_INDEX.books)) {
    const sec=b.sections.find(s=>s.count); await go(w,`/hadith/${book}/section/${sec.id}`);
    await waitFor(()=>w.HADITH_DATA[book][sec.id]?.length===sec.count,book+' chapter');
    assert.ok($('.hadith-card'),book+' rendered');
  }
  await go(w,'/hadith/bukhari/section/64');await waitFor(()=>w.document.querySelectorAll('#hadithList .hadith-card').length===20,'first automatic batch');
  assert.equal(w.document.querySelectorAll('#hadithList button.more-btn').length,0);let ob=w.__observers.findLast(x=>!x.disconnected);assert(ob,'automatic observer');let kept=$('#hadithList .hadith-card');let focus=kept.querySelector('button');focus.focus();ob.trigger();
  await waitFor(()=>w.document.querySelectorAll('#hadithList .hadith-card').length===60,'automatic next batch');assert.equal(w.document.querySelectorAll('#hadithList .hadith-num').length,60);assert.equal($('#hadithList .hadith-card'),kept,'automatic batch preserves existing cards');assert.equal(w.document.activeElement,focus,'automatic batch preserves focus');
  await go(w,'/hadith/grade/daif');await waitFor(()=>$('#hadithGradeResults .hadith-card .hadith-grade'),'weak-grade cards');
  assert.match($('#hadithGradeResults .hadith-grade').textContent,/যঈফ/);assert.equal(w.document.querySelectorAll('#hadithGradeResults .hadith-grade-reason, #hadithGradeResults button.more-btn').length,0);
  ob=w.__observers.findLast(x=>!x.disconnected);assert(ob,'grade observer');kept=$('#hadithGradeResults .hadith-card');ob.trigger();await waitFor(()=>w.document.querySelectorAll('#hadithGradeResults .hadith-card').length>20,'automatic grade batch');assert.equal($('#hadithGradeResults .hadith-card'),kept,'grade batch preserves existing cards');
  await go(w,'/hadith/tirmidhi/2727');await waitFor(()=>$('.hadith-card .hadith-grade')?.textContent.includes('জাল'),'fabricated grade remains');
  assert.equal(w.document.querySelectorAll('.hadith-grade-reason').length,0,'no separate grade-reason panel');
  await go(w,'/hadith/bukhari/1'); await waitFor(()=>$('.hadith-card .hadith-bn')?.textContent.includes('নিয়্যাত'),'Bukhari direct link');
  click(w,'[data-action="hadith-bookmark"]'); await go(w,'/hadith/saved'); await waitFor(()=>$('#hadithSaved .hadith-card'),'saved hadith');
  await go(w,'/hadith/search?q='+encodeURIComponent('নিয়্যাত')+'&book=bukhari');
  await waitFor(()=>w.document.querySelectorAll('#hadithResults .result-item').length>0,'scoped hadith search');
  await go(w,'/hadith/search?q='+encodeURIComponent('আল্লাহ')+'&book=bukhari');
  await waitFor(()=>w.document.querySelectorAll('#hadithResults .result-item').length===40,'first search batch');
  assert.equal(w.document.querySelectorAll('#hadithResults button.more-btn').length,0);ob=w.__observers.findLast(x=>!x.disconnected);assert(ob,'search observer');kept=$('#hadithResults .result-item');kept.focus();ob.trigger();await waitFor(()=>w.document.querySelectorAll('#hadithResults .result-item').length>40,'automatic search batch');assert.equal($('#hadithResults .result-item'),kept);assert.equal(w.document.activeElement,kept);
  dom.window.close();
  encoded=true; dom=await open('hadith.html','#/hadith/nawawi/42'); w=dom.window; $=s=>w.document.querySelector(s);
  await waitFor(()=>$('.hadith-card'),'HTTP-decoded gzip direct link'); assert.ok($('[data-action="hadith-next"]').disabled); dom.window.close();
  encoded=false; failChapter=true; dom=await open('hadith.html','#/hadith/search?q=1&book=nawawi'); w=dom.window; $=s=>w.document.querySelector(s);
  await waitFor(()=>$('#hadithResults')?.textContent.includes('অনুসন্ধান সম্পূর্ণ হয়নি'),'failed search notice');
  assert.ok(!$('#hadithResults').textContent.includes('কিছু পাওয়া যায়নি'));
  dom.window.close(); assert.deepEqual(errors,[]);
  console.log('scripture reader: project-relative routes, surahs, tafsir, search, all 9 books, bookmarks, gzip modes and errors pass (jsdom)');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
