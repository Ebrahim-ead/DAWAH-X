'use strict';
// Real browser and hadith indexes, two exact EAD/IRD Bengali records and the
// real site articles. Other chapter records, Quran and inference are mocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const {default:worker,queryTerms}=await import('../ai-worker/worker.mjs');
 const {topics,score,articleCandidate}=await import('../ai-worker/topic-search.mjs');
 const {findHadithCandidates}=await import('../ai-worker/hadith-index.mjs');
 const fixture=require('./fixtures/camel-hadith.json').records;
 const q='উটের মূত্র পানের হাদিসটি বুঝিয়ে বলুন',terms=topics(queryTerms(q));
 assert.equal(terms.length,3,'explanation request is not a separate required topic');
 assert.deepEqual(topics(queryTerms('উটের প্রস্রাব পান করার হাদিসটি বুঝিয়ে দিন')),terms,'common alternate substance and explanation wording');
 assert(topics(queryTerms('তিন দিন রোজা রাখা')).some(g=>g.includes('দিন')),'a substantive duration must not disappear');
 for(const word of ['মূত্র','মুত্র','প্রস্রাব','পেশাব'])assert.equal(score('উটের '+word+' পান করা',terms),3);
 assert.equal(score('উটের প্রস্রাব পানি দিয়ে ধোয়া',terms),2,'পান must not match পানি');
 assert(!articleCandidate('উটের প্রস্রাব পানি দিয়ে ধৌত করা হয়েছে।',queryTerms(q)));
 assert(!articleCandidate('উটের পান ও চিকিৎসা।',queryTerms(q)),'the substance is required');
 assert(!articleCandidate('উটের প্রস্রাব। '+('অন্য প্রসঙ্গ '.repeat(55))+'পান করা।',queryTerms(q)),'distant unrelated terms are not enough');
 const start=app.indexOf('const FOLD_MAP='),end=app.indexOf('/* সাইটে সংরক্ষিত প্রশ্নোত্তর খোঁজ:',start);assert(start>=0&&end>start);
 const sandbox={atob,Float32Array,Uint8Array,Promise,Set,Map,fetch:async u=>new Response(fs.readFileSync(path.join(root,String(u))))};
 vm.runInNewContext('const toLatinDigits=s=>String(s).replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));\n'+app.slice(start,end)+'\nglobalThis.suggest=SUGGEST;',sandbox);
 const found=await sandbox.suggest.find(q,{includeVideos:false,includeBodyMatches:true}),ids=Array.from(found.texts.slice(0,6),x=>x.k);
 assert(ids.includes('1289166d87d0da'));assert(ids.includes('1e002d00592ebe'));
 for(const key of ['1289166d87d0da','1e002d00592ebe']){const article=JSON.parse(fs.readFileSync(path.join(root,'texts',key.slice(-3)+'.json')))[key];assert(articleCandidate(article.h,queryTerms(q)),key)}
 const old=global.fetch,names={bukhari:'সহীহ বুখারী',muslim:'সহীহ মুসলিম','abu-dawud':'আবু দাউদ',tirmidhi:'তিরমিজি',nasai:'নাসাঈ','ibn-majah':'ইবনে মাজাহ',mishkat:'মিশকাত'};
 let candidates=[],prompt='',system='',model='প্রাপ্ত বর্ণনায় একদল অসুস্থ মানুষের কথা এসেছে। [1]',noHadith=false;
 global.fetch=async u=>{u=String(u);
  if(u.includes('/hadith-search/'))return new Response(fs.readFileSync(path.join(root,'hadith-search',u.slice(u.lastIndexOf('/')+1))));
  if(u.endsWith('/assets/search-ayahs.js'))return new Response('window.SITE_AYAHS=[[1,1,"পরীক্ষার তথ্য"]];');
  if(u.endsWith('/assets/hadith/data/index.json'))return Response.json({books:Object.entries(names).map(([slug,bn])=>({slug,bn,chapters:candidates.filter(x=>x.book===slug).map(x=>({id:x.id,bn:'পরীক্ষার অধ্যায়',from:Math.min(...x.numbers),to:Math.max(...x.numbers)}))}))});
  const m=u.match(/\/hadith\/data\/([a-z-]+)\/(\d+)\.json$/);if(m){const book=m[1],chapter=Number(m[2]),selected=candidates.find(x=>x.book===book&&x.id===chapter);assert(selected,'only validated candidate chapters are fetched');
   return Response.json({book,chapter,verses:selected.numbers.map(i=>!noHadith&&fixture[`${book}:${chapter}:${i}`]||{i,dup:0,b:'অপ্রাসঙ্গিক পরীক্ষার তথ্য'})})}
  const site=u.match(/\/texts\/([a-f0-9]{3})\.json$/);if(site)return new Response(fs.readFileSync(path.join(root,'texts',site[1]+'.json')));
  throw Error('Unexpected URL '+u)};
 const origin='https://ebrahim-ead.github.io',env={ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(_,args)=>{system=args.messages[0].content;prompt=args.messages[1].content;return {response:model}}}};
 const ask=async(keys)=>{const r=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:q,ids:keys,pages:[],history:[],lookupComplete:true,allSources:true,scriptureSearch:true,siteSearchLimited:true})});return (await worker.fetch(r,env)).json()};
 try{
  candidates=await findHadithCandidates(terms);
  assert(candidates.some(c=>c.book==='bukhari'&&c.id===4&&c.numbers.includes(233)),'real index must discover Bukhari 233');
  assert(candidates.some(c=>c.book==='muslim'&&c.id===29&&c.numbers.includes(4246)),'real index must discover Muslim 4246');
  let data=await ask(ids);assert.equal(data.grounded,true);assert.match(prompt,/হাদিস 233/);assert.match(prompt,/হাদিস 4246/);assert.match(prompt,/প্রাসঙ্গিক.*?পাদটীকা|উটের মূত্র নিয়ে/s);assert.match(prompt,/Latest question: উটের মূত্র পানের হাদিসটি বুঝিয়ে বলুন/);
  assert.match(system,/Never advise drinking animal urine/);assert.match(system,/medical claims.*unverified/i);assert.match(data.answer,/স্বাস্থ্য সতর্কতা: প্রাণীর মূত্র পান/);
  const direct=new Request('https://worker.test/',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({message:'বুখারী হাদিস নম্বর ২৩৩',ids:[],pages:[],history:[],lookupComplete:true,allSources:true})});
  const directResult=await (await worker.fetch(direct,env)).json();assert.equal(directResult.grounded,true);assert.match(directResult.answer,/স্বাস্থ্য সতর্কতা: প্রাণীর মূত্র পান/);assert.match(directResult.answer,/উটের পেশাব ও দুধ পান/);
  // Evidence remains unavailable if there are no actual relevant sources.
  noHadith=true;data=await ask([]);assert.equal(data.grounded,false);
 }finally{global.fetch=old}
 console.log('camel hadith: real browser and candidate indexes, exact EAD source fixtures, negation and medical safety pass');
})().catch(e=>{console.error(e);process.exitCode=1});
