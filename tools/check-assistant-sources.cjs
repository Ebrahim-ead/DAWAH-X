#!/usr/bin/env node
'use strict';
// Read-only drift check. A Git tree difference is a review signal, not proof
// that the published Pages content changed or that the new content is correct.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const REPO='repos/Ebrahim-ead/ead';
const GROUPS=[
 {name:'Hadith data',path:'assets/hadith/data',directory:true},
 {name:'Quran data',path:'assets/quran/data',directory:true},
 {name:'Quran search index',path:'assets/search-ayahs.js',directory:false}
];
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
function fingerprint(data,group){
 const rows=group.directory?data:[data];
 if(!Array.isArray(rows)||!rows.length)throw Error('Invalid source response');
 const out=new Map();
 for(const row of rows){
  if(!row||typeof row.name!=='string'||!/^[A-Za-z0-9_.-]+$/.test(row.name)||!sha(row.sha)||!['file','dir'].includes(row.type)||out.has(row.name))throw Error('Invalid source response');
  if(group.directory&&row.name==='_trigger')continue;
  out.set(row.name,row.type+':'+row.sha);
 }
 if(!out.size)throw Error('Empty source response');
 return out;
}
async function inspect(api,baseline){
 if(!sha(baseline))throw Error('Invalid baseline');
 const head=await api(REPO+'/commits/main');if(!sha(head?.sha))throw Error('Invalid upstream commit');
 const results=[];
 for(const group of GROUPS){
  const [before,after]=await Promise.all([api(REPO+'/contents/'+group.path+'?ref='+baseline),api(REPO+'/contents/'+group.path+'?ref='+head.sha)]);
  const a=fingerprint(before,group),b=fingerprint(after,group);
  const changed=[...new Set([...a.keys(),...b.keys()])].filter(k=>a.get(k)!==b.get(k)).sort();
  results.push({name:group.name,path:group.path,changed});
 }
 return {baseline,head:head.sha,results};
}
function format(result){
 let text='# Assistant source drift review\n\n';
 if(result.error)return text+'Status: **ERROR**. Upstream comparison could not be completed. Check the job log and retry.\n';
 text+='Hadith index baseline commit: `'+result.baseline+'`\n\nUpstream EAD main commit: `'+result.head+'`\n\n';
 for(const r of result.results)text+='- **'+r.name+'** (`'+r.path+'`): '+(r.changed.length?'CHANGED — `'+r.changed.join('`, `')+'`':'unchanged')+'\n';
 return text+'\nA Git tree difference is a review signal, not a claim about deployed Pages or religious correctness. Quran files are compared to the hadith index baseline as a reference, not to a pinned runtime Quran version. No changes are applied automatically. Review upstream and verify attribution and text; rebuild and test the candidate index before a human approves any update. The assistant uses published EAD files at request time. This check does not test live model answers.\n';
}
function githubApi(endpoint){
 const output=execFileSync('gh',['api',endpoint],{encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']});
 return JSON.parse(output);
}
async function main(){
 const report=process.argv[2];if(!report){console.error('Usage: node tools/check-assistant-sources.cjs <report-path>');process.exitCode=2;return}
 let result;
 try{const meta=JSON.parse(fs.readFileSync(path.join(ROOT,'hadith-search/meta.json'),'utf8'));result=await inspect(githubApi,meta.source)}
 catch(e){console.error('Source check failed:',e.message);result={error:true}}
 fs.mkdirSync(path.dirname(path.resolve(report)),{recursive:true});fs.writeFileSync(report,format(result));
 console.log(format(result));if(result.error||result.results.some(r=>r.changed.length))process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={inspect,format,GROUPS};
