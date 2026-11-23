'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('prayer-times.js','utf8'),policy=fs.readFileSync('policy.html','utf8');
const keys=['fajr','sunrise','dhuhr','asr','maghrib','isha'],api=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];
assert.equal((html.match(/class="prayer-icon" aria-hidden="true"/g)||[]).length,6);
assert(html.includes('https://aladhan.com/calendar/Dhaka/Bangladesh'));assert(html.includes('হানাফী আসরের সময় ভিন্ন'));assert(!html.includes('IslamicFinder'));assert(policy.includes('AlAdhan API'));
// Captured from the linked calendar and its Karachi/standard API, 22 November 2026.
const samples={22:['04:58','06:17','11:44','14:51','17:11','18:30']};
const clone=x=>JSON.parse(JSON.stringify(x));
function payload(year,month){
 const days=new Date(Date.UTC(year,month,0)).getUTCDate();return {code:200,data:Array.from({length:days},(_,i)=>{
  const day=i+1,values=year===2026&&month===11&&samples[day]||['05:10','06:25','11:50','15:00','17:20','18:40'];
  return {date:{gregorian:{date:String(day).padStart(2,'0')+'-'+String(month).padStart(2,'0')+'-'+year}},timings:Object.fromEntries(api.map((name,j)=>[name,values[j]+' (+06)'])),meta:{timezone:'Asia/Dhaka',method:{id:1},school:'STANDARD',offset:Object.fromEntries(api.map(name=>[name,0]))}};
 })};
}
const node=()=>({textContent:'',dateTime:'',removeAttribute(){this.dateTime=''}});
function harness(start,handler){
 let now=start,nextTimer=0;const events={},docEvents={},timers=new Map(),requests=[];
 const cards=keys.map(key=>{const time=node(),state=node(),classes=new Set();return {key,time,state,classes,querySelector:s=>s==='time'?time:state,classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name),remove:(...names)=>names.forEach(name=>classes.delete(name))}}});
 const nodes={'prayer-date':node(),'prayer-next':node()};
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return new Date(now).getTime()}}
 const document={hidden:false,getElementById:id=>nodes[id]||null,querySelector:s=>cards.find(c=>s.includes('"'+c.key+'"')),addEventListener:(key,fn)=>docEvents[key]=fn};
 const window={addEventListener:(key,fn)=>events[key]=fn,setInterval:(fn,ms)=>{assert.equal(ms,60000);events.tick=fn},setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id)};
 const fetch=async(url,opts)=>{requests.push({url,opts});const u=new URL(url);assert.equal(u.origin,'https://api.aladhan.com');assert.equal(u.searchParams.get('city'),'Dhaka');assert.equal(u.searchParams.get('country'),'Bangladesh');assert.equal(u.searchParams.get('method'),'1');assert.equal(u.searchParams.get('school'),'0');assert.equal(opts.credentials,'omit');assert.equal(opts.referrerPolicy,'no-referrer');
  const match=/\/calendarByCity\/(\d{4})\/(\d+)$/.exec(u.pathname);assert(match);return handler(Number(match[1]),Number(match[2]),requests.length,opts);
 };
 const context=vm.createContext({window,document,Intl,Date:FakeDate,URL,fetch,AbortController,Promise});vm.runInContext(js,context);
 return {events,docEvents,nodes,cards,timers,requests,setNow:value=>{now=value},document};
}
const ok=x=>({ok:true,json:async()=>x});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const minute=t=>{const m=t.match(/(\d+):(\d+)\s*([AP]M)/);assert(m,t);return (+m[1]%12+(m[3]==='PM'?12:0))*60+(+m[2])};
(async()=>{
 let h=harness('2026-11-22T05:00:00Z',async(y,m)=>ok(payload(y,m)));await flush();
 assert.equal(h.requests.length,1);assert(h.nodes['prayer-date'].textContent.includes('22'));
 h.cards.forEach((card,i)=>{const [hours,minutes]=samples[22][i].split(':').map(Number);assert.equal(minute(card.time.textContent),hours*60+minutes,card.key);assert(card.time.dateTime)});
 assert(h.cards[1].classes.has('is-current'));assert(h.cards[2].classes.has('is-next'));assert(h.nodes['prayer-next'].textContent.includes('যোহর'));
 h.setNow('2026-11-22T16:00:00Z');h.events.tick();await flush();assert(h.cards[5].classes.has('is-current'));assert(h.nodes['prayer-next'].textContent.includes('আগামীকাল 05:10 AM'));assert.equal(h.requests.length,2,'expired data is refreshed; tomorrow in the same month is reused');
 h.setNow('2026-11-22T17:59:59Z');h.events.tick();await flush();const before=h.cards.map(c=>c.time.dateTime),midnight=[...h.timers.values()].find(t=>t.ms===1050);assert(midnight,'Dhaka midnight timer');
 h.setNow('2026-11-22T18:00:00.050Z');midnight.fn();await flush();assert(h.nodes['prayer-date'].textContent.includes('23'));assert(h.cards.every((c,i)=>c.time.dateTime!==before[i]));
 h.setNow('2026-11-25T04:00:00Z');h.events.focus();await flush();assert(h.nodes['prayer-date'].textContent.includes('25'));
 const count=h.requests.length;h.setNow('2026-11-25T10:01:00Z');h.events.tick();await flush();assert.equal(h.requests.length,count+1,'six-hour data is refreshed');
 h=harness('2026-12-31T16:00:00Z',async(y,m)=>ok(payload(y,m)));await flush();assert(h.nodes['prayer-next'].textContent.includes('আগামীকাল 05:10 AM'));assert(h.requests.some(r=>r.url.includes('/2027/1?')),'next year is fetched after Isha on Dec 31');
 h=harness('2026-11-22T05:00:00Z',async()=>({ok:false}));await flush();assert(h.cards.every(c=>c.time.textContent==='—'));assert(h.nodes['prayer-next'].textContent.includes('পাওয়া যাচ্ছে না'));h.events.tick();await flush();assert.equal(h.requests.length,1,'outage is throttled');
 h=harness('2026-11-22T05:00:00Z',async(y,m,n)=>n===1?{ok:false}:ok(payload(y,m)));await flush();h.setNow('2026-11-22T05:05:01Z');h.events.tick();await flush();assert.equal(h.requests.length,2);assert.notEqual(h.cards[0].time.textContent,'—','retry recovers');
 let abortSeen=false;h=harness('2026-11-22T05:00:00Z',async(y,m,n,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>{abortSeen=true;reject(Error('aborted'))})));await flush();
 const timeout=[...h.timers.values()].find(t=>t.ms===12000);assert(timeout);timeout.fn();await flush();assert(abortSeen);assert(h.nodes['prayer-next'].textContent.includes('পাওয়া যাচ্ছে না'));
 h=harness('2026-11-22T05:00:00Z',async(y,m,n)=>n===1?ok(payload(y,m)):new Promise(()=>{}));await flush();assert.notEqual(h.cards[0].time.textContent,'—');h.setNow('2026-11-22T11:00:01Z');h.events.focus();assert(h.cards.every(c=>c.time.textContent==='—'),'expired data disappears while refreshing');
 for(const mutate of [data=>data.data[0].meta.timezone='UTC',data=>data.data[0].meta.school='HANAFI',data=>data.data[0].meta.method.id=2,data=>data.data[0].meta.offset.Fajr=1,data=>data.data[0].timings.Fajr='25:00 (+06)',data=>data.data[0].timings.Asr='01:00 (+06)',data=>data.data[0].date.gregorian.date='01-10-2026',data=>data.data.push(clone(data.data[0]))]){
  const data=payload(2026,11);mutate(data);h=harness('2026-11-22T05:00:00Z',async()=>ok(data));await flush();assert(h.cards.every(c=>c.time.textContent==='—'),'invalid source must never display');
 }
 // A slow previous month must not overwrite the new Dhaka day or stay visible.
 let resolveNovember;h=harness('2026-11-30T17:59:59Z',(y,m)=>m===11?new Promise(resolve=>{resolveNovember=()=>resolve(ok(payload(y,m)))}):Promise.resolve(ok(payload(y,m))));await flush();
 h.setNow('2026-11-30T18:00:00.050Z');h.events.focus();assert(h.cards.every(c=>c.time.textContent==='—'));await flush();assert(h.nodes['prayer-date'].textContent.includes('1'));const december=h.cards.map(c=>c.time.dateTime);resolveNovember();await flush();assert.deepEqual(h.cards.map(c=>c.time.dateTime),december,'old response must not overwrite current day');
 console.log('prayer cards: AlAdhan sample, Dhaka time, rollover, validation, errors, retry and races pass');
})().catch(error=>{console.error(error);process.exitCode=1});
