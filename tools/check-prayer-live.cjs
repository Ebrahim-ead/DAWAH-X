'use strict';
// Opt-in production API check. This only queries a fixed public Dhaka calendar.
const assert=require('node:assert/strict');
(async()=>{
 const url='https://api.aladhan.com/v1/calendarByCity/2026/11?city=Dhaka&country=Bangladesh&method=1&school=0';
 const r=await fetch(url,{headers:{Origin:'https://ebrahim-ead.github.io'},signal:AbortSignal.timeout(20000)});
 assert(r.ok,'AlAdhan HTTP '+r.status);
 const cors=r.headers.get('access-control-allow-origin');assert(cors==='*'||cors==='https://ebrahim-ead.github.io','API must allow the live site origin; received '+cors);
 const body=await r.json();assert.equal(body.code,200);assert(Array.isArray(body.data));
 const row=body.data.find(x=>x.date?.gregorian?.date==='22-11-2026');assert(row);assert.equal(row.meta.timezone,'Asia/Dhaka');assert.equal(row.meta.method.id,1);assert.equal(row.meta.school,'STANDARD');
 const expected={Fajr:'04:58',Sunrise:'06:17',Dhuhr:'11:44',Asr:'14:51',Maghrib:'17:11',Isha:'18:30'};
 for(const [key,time] of Object.entries(expected))assert.equal(row.timings[key].slice(0,5),time,key+' differs from the public calendar sample');
 console.log('::notice::AlAdhan Dhaka API, CORS and public calendar sample pass');
})().catch(error=>{console.error(error);console.log('::error::AlAdhan live check failed: '+String(error.message).replace(/[%\r\n]/g,' '));process.exitCode=1});
