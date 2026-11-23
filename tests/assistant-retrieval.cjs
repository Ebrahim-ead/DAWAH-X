'use strict';
// Exercise the real, generated site index without loading the large video catalogue.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* সাইটে সংরক্ষিত প্রশ্নোত্তর খোঁজ:',start);assert(start>=0&&end>start);
const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async url=>{const file=path.resolve(root,url);assert(file.startsWith(root+path.sep));const text=fs.readFileSync(file,'utf8');return {ok:true,json:async()=>JSON.parse(text),text:async()=>text}}};
vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',sandbox);
(async()=>{
 const q='স্বাস্থ্য রক্তচাপ কোলেস্টেরল';
 const titles=await sandbox.suggest.find(q,{includeVideos:false});
 const full=await sandbox.suggest.find(q,{includeVideos:false,includeBodyMatches:true});
 assert(full.texts.length>titles.texts.length,'body matching should find additional articles');
 assert(full.texts.some(x=>x.title.includes('মাহে রামাযান')),'real body-only match should be discoverable');
 const found=await sandbox.suggest.find('পাইথন প্রোগ্রামিং কি হালাল?',{includeVideos:false,includeBodyMatches:true});assert.equal(found.texts.length,0);
 // Real title shards contain সালাত even though the body index treats it as a stopword.
 // The general article must be the first source actually sent to the Worker, not
 // displaced by questions about individual types or times of prayer.
 for(const question of ['সালাতের গুরুত্ব কী?','নামাজের গুরুত্ব কী?','ছালাতের গুরুত্ব কী?','namajer gurutto ki','salater gurutto ki']){
  const result=await sandbox.suggest.find(question,{includeVideos:false,includeBodyMatches:true});
  assert(result&&result.texts.length,question);
  assert.equal(result.texts[0].k,'1f047bd96535e5',question);
  assert.match(result.texts[0].title,/ছালাতের গুরুত্ব/);
 }
 for(const question of ['নামাজ','সালাত','ইসলাম কী','আল্লাহ কে']){
  const result=await sandbox.suggest.find(question,{includeVideos:false,includeBodyMatches:true});
  assert(result&&result.texts.length,question);
 }
 const injection=await sandbox.suggest.find('রোজা রেখে ইনজেকশন নিলে কি রোজা ভেঙে যায়?',{includeVideos:false,includeBodyMatches:true});
 assert(injection.texts.slice(0,4).some(x=>x.title.includes('ইনজেকশন')),'specific fasting question');
 const romanInjection=await sandbox.suggest.find('roja rekhe injection nile ki roja venge jay',{includeVideos:false,includeBodyMatches:true});
 assert(romanInjection.texts.slice(0,4).some(x=>x.title.includes('ইনজেকশন')),'common Banglish should preserve the specific fasting question');
 // User's real question has a colloquial verb; source titles use বাঁধা/বেঁধে.
 for(const question of ['নামাজে হাত কোথায় বাঁধবো বুকে নাকি নাভির নিচে','নামাজে হাত বেঁধে বুকে নাকি নাভির নিচে','নামাজের সময় হাত কোথায় বাঁধবো বুকে নাকি নাভির নিচে']){
  const result=await sandbox.suggest.find(question,{includeVideos:false,includeBodyMatches:true});
  assert(result.texts.slice(0,4).some(x=>['1baadfbb8e91fa','1cdcea4ead1cbb','1592fe54154eac'].includes(x.k)),'hand-placement candidate should be retrieved: '+question);
 }
 const wrongTopic=await sandbox.suggest.find('নামাজে হাত কোথায় বাঁধবো কোয়ান্টামফটোনিক্স?',{includeVideos:false,includeBodyMatches:true});
 assert.equal(wrongTopic.texts.length,0,'unknown conditions must not be silently discarded');
 const tawhid='কুরআন ও সুন্নাহর আলোকে তাওহীদের গুরুত্ব কী?';
 const tawhidResult=await sandbox.suggest.find(tawhid,{includeVideos:false,includeBodyMatches:true});
 assert(tawhidResult.texts.slice(0,4).some(x=>x.k==='0c11409ae22b68'),'source-preface should not hide the actual tawhid topic');
 const unknownWithPreface=await sandbox.suggest.find('কুরআন ও সুন্নাহর আলোকে কোয়ান্টামফটোনিক্স কী?',{includeVideos:false,includeBodyMatches:true});
 assert.equal(unknownWithPreface.texts.length,0,'do not invent answers when the topic itself is unknown');
 const unknownRoman=await sandbox.suggest.find('namaj quantumflux ki',{includeVideos:false,includeBodyMatches:true});assert.equal(unknownRoman.texts.length,0,'unknown Banglish terms must not be dropped');
 const unknown=await sandbox.suggest.find('কোয়ান্টামফটোনিক্স নামাজ হালাল?',{includeVideos:false,includeBodyMatches:true});
 assert.equal(unknown.texts.length,0,'unknown topic should not be discarded in favour of generic prayer');
 const ordinary=await sandbox.suggest.find('নামাজ',{includeVideos:false});
 assert.equal(ordinary.texts.length,0,'assistant-only stopword exception must not change normal suggestions');
 // Broken candidate lookups must be visible to the assistant, not treated as no match.
 sandbox.suggest.relc.clear();const previousFetch=sandbox.fetch;sandbox.fetch=async url=>String(url).startsWith('rel/')?{ok:false}:previousFetch(url);
 assert.equal(await sandbox.suggest.find('সালাতের গুরুত্ব কী?',{includeVideos:false,includeBodyMatches:true}),null,'candidate metadata outage must fail assistant search');
 sandbox.fetch=previousFetch;sandbox.suggest.relc.clear();
 assert((await sandbox.suggest.find('সালাতের গুরুত্ব কী?',{includeVideos:false,includeBodyMatches:true})).texts.length,'failed candidate fetch must be retried');
 sandbox.suggest.bodyc.clear();sandbox.fetch=async url=>String(url).startsWith('texts/')?{ok:false}:previousFetch(url);
 await assert.rejects(()=>sandbox.suggest.bodyNear('034d218703d000',[[['সালাত',true]]],true));
 assert.equal(await sandbox.suggest.bodyNear('034d218703d000',[[['সালাত',true]]],false),false);
 sandbox.fetch=previousFetch;
 const noTerms=await sandbox.suggest.find('কি?',{includeVideos:false,includeBodyMatches:true});assert.equal(noTerms.limited,true);
 const assistant=fs.readFileSync(path.join(root,'assistant.js'),'utf8');
 assert(assistant.includes('texts=result.texts.slice(0,4)'), 'Worker receives results in relevance order');
 console.log('assistant retrieval: real indexes, prayer synonyms, generic topics, body matches and unavailable topics pass');
})().catch(e=>{console.error(e);process.exitCode=1});
