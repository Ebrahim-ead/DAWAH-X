'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');const root=path.join(__dirname,'..'),read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const original=read('source-data.json'),index=read('source-index.json'),files=new Set();assert.equal(index.v,1);assert.equal(index.chunkSize,250);
assert.deepStrictEqual(Object.keys(index.sources),Object.keys(original.sources));for(const [code,info] of Object.entries(index.sources)){
 assert.equal(info.name,original.names[code]);assert.equal(info.count,original.sources[code].length);const found=[];
 for(const name of info.files){assert(new RegExp('^source-'+code+'-[0-9]{3}\\.json$').test(name));assert(!files.has(name));files.add(name);const rows=read(name);assert(rows.length>0&&rows.length<=index.chunkSize);found.push(...rows)}
 assert.deepStrictEqual(found,original.sources[code].map(([k,t])=>[k,t]),code+' entries or order differ');
}
for(const f of fs.readdirSync(root).filter(x=>/^source-[a-z]{2}-[0-9]{3}\.json$/.test(x)))assert(files.has(f),'orphan shard: '+f);
console.log('source shards: every source, item, order and count matches the full index');
