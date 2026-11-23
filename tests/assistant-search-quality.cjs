'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const {queryTerms,default:worker}=await import('../ai-worker/worker.mjs');
 const {topics,score,articleCandidate}=await import('../ai-worker/topic-search.mjs');
 const numeric=topics(queryTerms('নামাজ ৫ ওয়াক্ত ফরজ কিভাবে হল?'));
 assert.equal(score('পাঁচ ওয়াক্ত ছালাত ফরয',numeric),4,'Bengali spelled-out number should match the equivalent digit');
 for(const text of ['১৫ ওয়াক্ত ছালাত ফরয','পাঁচশো ওয়াক্ত ছালাত ফরয','পনেরো ওয়াক্ত ছালাত ফরয'])assert.equal(score(text,numeric),3,'different counts must not match: '+text);
 assert.equal(score('ছালাত পাঁচটি ওয়াক্ত ফরয',numeric),4);
 const spelled=topics(queryTerms('নামাজ পাঁচ ওয়াক্ত ফরজ?'));assert.equal(score('৫ ওয়াক্ত ছালাত ফরয',spelled),4);assert.equal(score('১৫ ওয়াক্ত ছালাত ফরয',spelled),3);
 const sud=topics(queryTerms('সুদ কেন হারাম?'));
 assert.equal(score('সুদকে হারাম করেছেন',sud),2);assert.equal(score('সুদী ব্যবসা হারাম',sud),2);
 assert.equal(score('সুদৃশ্য পোশাক হারাম',sud),1,'a short stem inside an unrelated word is not a match');
 const injection='রোজা রেখে ইনজেকশন নিলে কি রোজা ভেঙে যায়?',it=topics(queryTerms(injection));
 assert.equal(it.length,2,'incidental verbs should not hide the subject and condition');
 const article=require('../texts/7f3.json')['0ef127f864a7f3'];assert(articleCandidate(article.h,queryTerms(injection)),'actual relevant website article survives prefilter');
 assert(!articleCandidate('ছিয়াম সম্পর্কে আলোচনা, কিন্তু ওষুধের বিষয়টি নেই।',queryTerms(injection)),'unrelated source must not pass just one topic');
 const tawhid='কুরআন ও সুন্নাহর আলোকে তাওহীদের গুরুত্ব কী?';
 const tt=topics(queryTerms(tawhid));assert.equal(tt.length,1,'source-preface must not become a required topic');
 assert(tt[0].includes('তাওহিদ'),'possessive suffix should preserve the entire topic stem');
 assert.equal(score('তোমাদের ইলাহ এক ইলাহ',tt),1,'a relevant direct-scripture phrase can be discovered as a candidate');
 assert.equal(score('তোমাদের সবাইকে একত্র করা হবে',tt),0,'similar-looking words must not count as tawhid');
 assert(topics(queryTerms('কুরআন ও সুন্নাহর আলোকে তাওহীদের ইতিহাস কী?')).some(g=>g.some(x=>x.startsWith('ইতিহাস'))),'subject-specific conditions remain required');
 assert(articleCandidate(require('../texts/b68.json')['0c11409ae22b68'].h,queryTerms(tawhid)));
 assert(topics(queryTerms('সুন্নাহর গুরুত্ব কী?')).some(g=>g.some(x=>x.startsWith('সুন্নাহ'))),'a standalone question about Sunnah keeps its subject');
 assert(topics(queryTerms('কুরআন ও হাদিস সম্পর্কে সুন্নাহর গুরুত্ব কী?')).some(g=>g.some(x=>x.startsWith('সুন্নাহ'))),'only an explicit source-preface is removed');
 const hand='নামাজে হাত কোথায় বাঁধবো বুকে নাকি নাভির নিচে';
 const handArticle=require('../texts/1fa.json')['1baadfbb8e91fa'];
 assert(articleCandidate(handArticle.h,queryTerms(hand)),'the original colloquial question must reach its relevant candidate');
 assert(!articleCandidate('ছালাতে হাত বাঁধা বর্ণনা, কিন্তু শরীরের কোন স্থান উল্লেখ নেই।',queryTerms(hand)),'keep the body-location conditions');
 const child=require('../texts/c67.json')['11df79032aec67'];assert(!articleCandidate(child.h,queryTerms('আমি শুনছি প্রত্যেক শিশুই নাকি মুসলিম হিসেবে জন্মগ্রহণ করে')),'unrelated satan-touch article must stay excluded');
 // Full Worker flow using the real local site article; EAD data and inference are mocks.
 const old=global.fetch,origin='https://ebrahim-ead.github.io';let prompt='';
 global.fetch=async url=>{url=String(url);
  if(url.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[2,3,"অন্য পরীক্ষা"]];');
  if(url.endsWith('/assets/hadith/data/index.json'))return Response.json({books:[]});
  if(url.endsWith('/hadith-search/meta.json'))return Response.json({version:1,shards:32,books:['bukhari','muslim','abu-dawud','tirmidhi','nasai','ibn-majah','mishkat'],docs:[[0,1,1]]});
  if(/\/hadith-search\/\d\d\.json$/.test(url))return Response.json({});
  if(url.endsWith('/texts/7f3.json'))return new Response(fs.readFileSync(path.join(__dirname,'../texts/7f3.json')));
  throw Error('unexpected URL '+url);
 };
 const env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_model,args)=>{prompt=args.messages[1].content;return {response:'প্রার্থিত সাইটের তথ্য [1]'}}}};
 try{
  const req=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:injection,ids:['0ef127f864a7f3'],history:[],lookupComplete:true,allSources:true})});
  const data=await (await worker.fetch(req,env)).json();assert.equal(data.grounded,true);assert.equal(data.sources[0].key,'0ef127f864a7f3');assert.match(prompt,/ইনজেকশন খাদ্য/);assert.match(prompt,/Latest question: রোজা রেখে/,'do not remove conditions from the model question');
 }finally{global.fetch=old}
 console.log('assistant search quality: real article, short words, numeric equivalence and negative cases pass');
})().catch(e=>{console.error(e);process.exitCode=1});
