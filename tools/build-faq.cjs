#!/usr/bin/env node
/* A small, explicitly selected FAQ page: visible full answers and matching structured data. */
'use strict';
const fs=require('fs'),path=require('path'),{ROOT,SITE,esc,fromQuestions}=require('./page-template.cjs');
const {excerptSource}=require('./article-excerpt.cjs');
const latin=v=>String(v||'').replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c)));
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const plain=s=>String(s||'').replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(m,e)=>{if(e[0]==='#'){const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);try{return String.fromCodePoint(n)}catch(_){return ' '}}return entities[e.toLowerCase()]||' '}).replace(/\s+/g,' ').trim();
let docs=[];for(const f of fs.readdirSync(path.join(ROOT,'texts'))){if(!/^[0-9a-f]{3}\.json$/.test(f))continue;const data=JSON.parse(fs.readFileSync(path.join(ROOT,'texts',f),'utf8'));for(const k in data){const x=data[k],question=latin(x.t).trim(),answer=latin(plain(excerptSource(x.h,x.s)));if(/^প্রশ্ন\s*(?:\(|[:ঃ])/u.test(question)&&/^উত্তর\s*[:ঃ]/u.test(answer)&&answer.length>=50&&answer.length<=700)docs.push({k,question,answer,source:/^https?:\/\//i.test(x.u||'')?x.u:''})}}
docs.sort((a,b)=>a.k.localeCompare(b.k));docs=docs.slice(0,30);if(docs.length<1)throw new Error('সম্পূর্ণ প্রশ্নোত্তর পাওয়া যায়নি');
const rows=docs.map(x=>`<article class="faq-item"><h2>${esc(x.question)}</h2><p>${esc(x.answer)}</p><a href="s/${x.k}.html">লেখার পাতায় যান →</a>${x.source?` · <a href="${esc(x.source)}" target="_blank" rel="noopener noreferrer nofollow">মূল প্রকাশনার সূত্র ↗</a>`:''}</article>`).join('\n');
const section=`<section id="faq" style="padding-top:0"><div class="wrap"><div class="title"><h1>বাছাই করা প্রশ্ন ও উত্তর</h1><p>সংগ্রহ থেকে ${docs.length}টি সংক্ষিপ্ত প্রশ্নোত্তর; পূর্ণ সূত্র দেখতে প্রতিটি লেখার লিংকে যান।</p></div>${rows}<p class="qnote"><a href="questions.html">আরও প্রশ্নোত্তর খুঁজুন →</a></p></div></section>`;
const ld={'@context':'https://schema.org','@type':'FAQPage',url:SITE+'faq.html',inLanguage:'bn',mainEntity:docs.map(x=>({'@type':'Question',name:x.question,acceptedAnswer:{'@type':'Answer',text:x.answer}}))};
const html=fromQuestions({sectionId:'faq',section,title:'বাছাই করা প্রশ্ন ও উত্তর — DAWAH X',description:'সংগ্রহ থেকে বাছাই করা সংক্ষিপ্ত প্রশ্ন ও সম্পূর্ণ উত্তর।',url:SITE+'faq.html',pageId:'faq',structuredData:ld});const file=path.join(ROOT,'faq.html');let old='';try{old=fs.readFileSync(file,'utf8')}catch(_){}if(old!==html)fs.writeFileSync(file,html);console.log('FAQ:',docs.length,'complete answers');
