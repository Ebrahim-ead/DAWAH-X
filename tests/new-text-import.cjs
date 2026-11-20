'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const report=JSON.parse(read('tools/new-text-import-report.json')),index=JSON.parse(read('texts/index.json')),sources=JSON.parse(read('source-data.json')).sources,seen=new Set(),catalog={};
for(const f of fs.readdirSync(root).filter(x=>/^(questions|fatwa)-catalog-part-\d+\.js$/.test(x))){const w={};vm.runInNewContext(read(f),{window:w});for(const group of Object.values(w))for(const rows of Object.values(group))for(const row of rows)catalog[row[2]]=true}
for(const a of report.added){assert(!seen.has(a.k),'duplicate key: '+a.k);seen.add(a.k);const x=JSON.parse(read('texts/'+a.k.slice(-3)+'.json'))[a.k];assert(x&&x.s===a.s&&x.u===a.u&&x.t===a.t,'article metadata mismatch');assert(x.h&&x.h.replace(/<[^>]*>/g,'').trim().length>=12,'missing article body');assert(!/<(?:script|iframe|form)\b|\son\w+\s*=/i.test(x.h),'unsafe markup');assert(catalog[x.u],'article missing from library catalog');assert(sources[x.s].some(row=>row[0]===a.k),'article missing from source listing');assert(fs.existsSync(path.join(root,'s',a.k+'.html')),'article landing missing');assert(index.full[x.s]||index.keys.includes(a.k),'article missing from local text index')}
assert.equal(report.added.length,162);assert.equal(report.added.filter(x=>x.s==='ra').length,0,'existing RA post IDs must not be duplicated');
console.log('new texts: 162 sourced articles, catalog, local index and landing pages verified');
