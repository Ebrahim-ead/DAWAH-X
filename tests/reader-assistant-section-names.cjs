'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const names={'questions.html':'নাস্তিকতা বিষয়ক প্রশ্নোত্তর','fatwa.html':'ইসলামিক প্রশ্নোত্তর'};
for(const file of fs.readdirSync(root).filter(x=>x.endsWith('.html'))){
 const html=read(file),nav=html.match(/<nav\b[^>]*\bid="menu"[^>]*>([\s\S]*?)<\/nav>/);if(!nav)continue;
 for(const [href,label] of Object.entries(names))assert.match(nav[1],new RegExp('<a\\b[^>]*href="'+href+'"[^>]*>'+label+'</a>'),file+' menu '+href);
}
for(const [file,label] of Object.entries(names)){assert(read(file).includes('<h1>'+label+'</h1>'));assert(read('index.html').includes('<b>'+label+'</b>'))}
const manifest=JSON.parse(read('manifest.webmanifest'));for(const [href,label] of Object.entries(names))assert.equal(manifest.shortcuts.find(x=>x.url==='./'+href).name,label);
for(const file of ['quran.html','hadith.html']){const html=read(file);assert(html.indexOf('src="reader-assistant-search.js"')>0);assert(html.indexOf('src="assistant.js"')>html.indexOf('src="reader-assistant-search.js"'));assert(!html.includes('src="app.js"'))}
const check=spawnSync(process.execPath,['tools/build-reader-assistant-search.cjs','--check'],{cwd:root,encoding:'utf8'});assert.equal(check.status,0,check.stderr);
assert(read('sw.js').includes("'reader-assistant-search.js'"));
const {fromQuestions}=require('../tools/page-template.cjs');const built=fromQuestions({sectionId:'test',section:'<section id="test"></section>',title:'test',description:'test',url:'https://example.test/test.html'});
assert(!built.includes('aria-current="page" class="on" href="questions.html"'));assert(built.includes('href="questions.html">'+names['questions.html']+'</a>'));
console.log('section names and reader assistant: navigation, template, precache and shared-search sync pass');
