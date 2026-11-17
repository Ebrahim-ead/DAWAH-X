/* DAWAH X — সাইটের মোট সংখ্যা (stats.json)।
   হোমপেজের পরিসংখ্যান-পট্টি এই একটি ছোট ফাইল থেকেই সংখ্যা নেয়, তাই সংখ্যা কখনো হাতে লিখতে হয় না।
   চালান: node tools/build-stats.cjs
   ভিডিওর সংখ্যা tools/update-videos.cjs নিজেই হালনাগাদ করে; বাকিগুলো এই স্ক্রিপ্ট। */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const count=o=>Object.values(o).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0);

/* ফতোয়া ও প্রশ্নোত্তর: ক্যাটালগ-ফাইলগুলো (fatwa-catalog-part-NN.js) চালিয়ে গোনা হয় */
const loadCatalog=(prefix,globalName)=>{
  const ctx={window:{}};vm.createContext(ctx);
  fs.readdirSync(ROOT).filter(n=>new RegExp('^'+prefix+'-catalog-part-\\d+\\.js$').test(n)).sort()
    .forEach(n=>vm.runInContext(fs.readFileSync(path.join(ROOT,n),'utf8'),ctx));
  return ctx.window[globalName]||{};
};

const parse=p=>{try{return JSON.parse(read(p))}catch(e){return null}};

const fatwaParts=loadCatalog('fatwa','DAWAH_FATWAS_PARTS');
let fatwas=0,articles=0;
for(const rows of Object.values(fatwaParts))for(const r of rows){
  if(String(r[0]||'').includes('প্রবন্ধ'))articles++;else fatwas++;
}
const questions=count(loadCatalog('questions','DAWAH_QUESTIONS_PARTS'));

const meta=parse('search/meta.json')||{};
const texts=Number(meta.n)||0;
const videos=Number((parse('youtube-videos.json')||[]).length)||0;
const topicList=parse('tools/topics.json')||{};
const topics=Array.isArray(topicList.topics)?topicList.topics.length:0;

const stats={texts,fatwas,articles,questions,videos,topics,updated:new Date().toISOString().slice(0,10)};
const out=path.join(ROOT,'stats.json'),next=JSON.stringify(stats)+'\n';
let old='';try{old=fs.readFileSync(out,'utf8')}catch(e){}
if(old===next)console.log('stats.json অপরিবর্তিত');else{fs.writeFileSync(out,next);console.log('stats.json লেখা হয়েছে: '+next.trim())}
