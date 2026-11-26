#!/usr/bin/env node
'use strict';
// Weekly rotating, read-only source check. Only a bounded byte range is read;
// no PDFs are copied. Respect the source's published 10-second crawl delay.
const source=require('./islamic-books-source.json');
const origin='https://book.tauhiderdak.com';
async function checkOne(url,request=fetch){
 const target=new URL(url);if(target.origin!==origin||!target.pathname.startsWith('/wp-content/uploads/')||!target.pathname.endsWith('.pdf'))throw Error('unexpected source URL');
 const response=await request(target.href,{headers:{Range:'bytes=0-4',Origin:'https://ebrahim-ead.github.io'},redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(response.status!==206){await response.body?.cancel();throw Error('expected byte-range HTTP 206, got '+response.status);}
 if(!/^bytes 0-4\/\d+$/.test(response.headers.get('content-range')||'')){await response.body?.cancel();throw Error('invalid content range');}
 const cors=response.headers.get('access-control-allow-origin');if(cors!=='*'&&cors!=='https://ebrahim-ead.github.io'){await response.body?.cancel();throw Error('CORS header missing');}
 const reader=response.body.getReader();let bytes=[],count=0;try{while(count<5){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>64)throw Error('range exceeded');bytes.push(...value);} }finally{await reader.cancel();}
 if(Buffer.from(bytes).subarray(0,5).toString('ascii')!=='%PDF-')throw Error('invalid PDF signature');
}
async function main(){
 const all=source.categories.flatMap(x=>x.items.map(item=>({name:item.name,url:item.pdf})));if(all.length!==102)throw Error('unexpected source inventory');
 const week=Math.floor(Date.now()/(7*24*60*60*1000)),bucket=week%8,selected=all.filter((_,i)=>i%8===bucket);let failures=0;
 console.log(`Checking rotating batch ${bucket+1}/8 (${selected.length} of ${all.length} PDFs); full cycle takes eight weeks.`);
 for(const [i,item] of selected.entries()){if(i)await new Promise(r=>setTimeout(r,11000));try{await checkOne(item.url);console.log('OK',item.name);}catch(e){failures++;console.error('FAIL',item.name,item.url,e.message);}}
 if(failures)throw Error(`${failures} source checks failed; outage, access restrictions and changed files require manual review`);
}
module.exports={checkOne};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
