'use strict';
const assert=require('node:assert/strict'),{checkOne}=require('../tools/check-books-source-health.cjs');
const url='https://book.tauhiderdak.com/wp-content/uploads/test.pdf';
function response(status=206,signature='%PDF-',headers={'content-range':'bytes 0-4/100','access-control-allow-origin':'*'}){return new Response(signature,{status,headers});}
(async()=>{
 await checkOne(url,async(u,options)=>{assert.equal(u,url);assert.equal(options.headers.Range,'bytes=0-4');assert.equal(options.redirect,'manual');return response();});
 await assert.rejects(checkOne('https://example.com/a.pdf',async()=>response()));
 await assert.rejects(checkOne(url,async()=>response(200)));await assert.rejects(checkOne(url,async()=>response(206,'hello')));await assert.rejects(checkOne(url,async()=>response(206,'%PDF-',{'content-range':'bytes 0-4/100'})));
 console.log('PDF source health: restricted host, byte range, signature, CORS and failures verified.');
})().catch(e=>{console.error(e);process.exitCode=1});
