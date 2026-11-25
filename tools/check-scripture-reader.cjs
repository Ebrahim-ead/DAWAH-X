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
let failChapter = false, encoded = false;
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
    res.end(data);
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
    return JSDOM.fromURL(base+file+hash,{resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.TextDecoder=TextDecoder;w.fetch=(url,opts)=>fetch(new URL(url,w.location.href),opts);}});
  }
  let dom = await open('quran.html'), w=dom.window, $=s=>w.document.querySelector(s);
  await waitFor(()=>w.document.querySelectorAll('.surah-card').length===114,'surah catalogue');
  assert.equal(w.location.hash,'#/surahs');
  assert.equal($('#menu a[href="hadith.html"]').getAttribute('href'),'hadith.html');
  assert.equal($('#menu a[aria-current="page"]').getAttribute('href'),'quran.html');
  await go(w,'/s/1/a/1');
  await waitFor(()=>$('#v1 .verse-translation')?.textContent.includes('রহমান, রহীম'),'translation');
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
  await go(w,'/hadith/bukhari/1'); await waitFor(()=>$('.hadith-card .hadith-bn')?.textContent.includes('নিয়্যাত'),'Bukhari direct link');
  click(w,'[data-action="hadith-bookmark"]'); await go(w,'/hadith/saved'); await waitFor(()=>$('#hadithSaved .hadith-card'),'saved hadith');
  await go(w,'/hadith/search?q='+encodeURIComponent('নিয়্যাত')+'&book=bukhari');
  await waitFor(()=>w.document.querySelectorAll('#hadithResults .result-item').length>0,'scoped hadith search');
  dom.window.close();
  encoded=true; dom=await open('hadith.html','#/hadith/nawawi/42'); w=dom.window; $=s=>w.document.querySelector(s);
  await waitFor(()=>$('.hadith-card'),'HTTP-decoded gzip direct link'); assert.ok($('[data-action="hadith-next"]').disabled); dom.window.close();
  encoded=false; failChapter=true; dom=await open('hadith.html','#/hadith/search?q=1&book=nawawi'); w=dom.window; $=s=>w.document.querySelector(s);
  await waitFor(()=>$('#hadithResults')?.textContent.includes('অনুসন্ধান সম্পূর্ণ হয়নি'),'failed search notice');
  assert.ok(!$('#hadithResults').textContent.includes('কিছু পাওয়া যায়নি'));
  dom.window.close(); assert.deepEqual(errors,[]);
  console.log('scripture reader: project-relative routes, surahs, tafsir, search, all 9 books, bookmarks, gzip modes and errors pass (jsdom)');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
