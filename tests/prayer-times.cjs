'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('prayer-times.js','utf8');
const vendor=fs.readFileSync('adhan.min.js','utf8');
const source='https://www.islamicfinder.org/prayer-widget/1185241/shafi/3/0/18/18/';
const keys=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
assert.equal((html.match(/class="prayer-icon" aria-hidden="true"/g)||[]).length,6,'each time card needs an accessible decorative icon');
assert(html.includes(`data-src="${source}"`));assert(html.includes('এই সময় IslamicFinder থেকে সরাসরি নেওয়া নয়'));
assert(html.includes('হানাফী আসরের সময় ভিন্ন'));assert(html.indexOf('src="adhan.min.js"')<html.indexOf('src="prayer-times.js"'));
let now='2026-11-15T05:00:00Z',frameSrc='',frameWrites=0,timeoutFn,timeoutDelay,timeoutId=0;const events={},docEvents={};
const sourceFrame={dataset:{src:source},set src(v){frameSrc=v;frameWrites++}};
const node=()=>({textContent:'',dateTime:'',removeAttribute(){this.dateTime=''}});
const cards=keys.map(key=>{const time=node(),state=node(),classes=new Set();return {key,time,state,classes,querySelector:s=>s==='time'?time:state,classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name),remove:(...names)=>names.forEach(name=>classes.delete(name))}}});
const nodes={'prayer-date':node(),'prayer-next':node(),'prayer-frame':sourceFrame,'prayer-reference':{open:false,addEventListener:(name,fn)=>events[name]=fn}};
class FakeDate extends Date{constructor(...args){super(...(args.length?args:[now]))}}
const document={hidden:false,getElementById:id=>nodes[id]||null,querySelector:s=>cards.find(c=>s.includes('"'+c.key+'"')),addEventListener:(key,fn)=>docEvents[key]=fn};
const window={addEventListener:(key,fn)=>events[key]=fn,setInterval:(fn,ms)=>{assert.equal(ms,60000);events.tick=fn},setTimeout:(fn,ms)=>{timeoutFn=fn;timeoutDelay=ms;return ++timeoutId},clearTimeout:()=>{}};
const context=vm.createContext({window,document,Intl,Date:FakeDate,URL});vm.runInContext(vendor,context);vm.runInContext(js,context);
assert.equal(frameWrites,0,'widget must not load until opened');
const toMinutes=t=>{const m=t.match(/(\d+):(\d+)\s*([AP]M)/);assert(m,t);return (+m[1]%12+(m[3]==='PM'?12:0))*60+(+m[2])};
// IslamicFinder November 2026 Dhaka timetable, checked samples: approximate, not asserted to be identical.
const reference={1:['04:48 AM','06:04 AM','11:43 AM','02:56 PM','05:21 PM','06:37 PM'],10:['04:53 AM','06:09 AM','11:44 AM','02:53 PM','05:16 PM','06:33 PM'],15:['04:55 AM','06:12 AM','11:44 AM','02:51 PM','05:14 PM','06:31 PM'],21:['04:59 AM','06:16 AM','11:46 AM','02:50 PM','05:13 PM','06:31 PM'],30:['05:04 AM','06:22 AM','11:48 AM','02:50 PM','05:12 PM','06:31 PM']};
for(const day of Object.keys(reference)){
 now=`2026-11-${day.padStart(2,'0')}T05:00:00Z`;events.tick();
 cards.forEach((card,i)=>{assert(Math.abs(toMinutes(card.time.textContent)-toMinutes(reference[day][i]))<=2,`${day} ${card.key}: ${card.time.textContent} vs ${reference[day][i]}`);assert(card.time.dateTime)});
 assert(cards[1].classes.has('is-current'));assert(cards[2].classes.has('is-next'));
}
// The cards are recalculated from the Dhaka calendar date rather than a cached timetable.
now='2026-11-22T17:59:59Z';events.tick();const before=cards.map(c=>c.time.dateTime);assert.equal(timeoutDelay,1050);assert(nodes['prayer-date'].textContent.includes('22'));
now='2026-11-22T18:00:00.050Z';timeoutFn();assert(nodes['prayer-date'].textContent.includes('23'));assert(cards.every((c,i)=>c.time.dateTime!==before[i]),'all six absolute times must belong to the new day');
const previous=cards.map(c=>c.time.dateTime);now='2026-11-25T04:00:00Z';events.focus();assert(nodes['prayer-date'].textContent.includes('25'));assert(cards.every((c,i)=>c.time.dateTime!==previous[i]),'resuming after several days must refresh the cards');
now='2026-11-15T16:00:00Z';events.tick();assert(cards[5].classes.has('is-current'));assert(nodes['prayer-next'].textContent.includes('আগামীকাল'));assert(!cards.some(c=>c.classes.has('is-next')));
now='2026-12-31T17:59:00Z';nodes['prayer-reference'].open=true;events.toggle();assert.equal(new URL(frameSrc).searchParams.get('dawahx_day'),'2026-12-31');assert.equal(frameWrites,1);
events.tick();assert.equal(frameWrites,1);now='2026-12-31T18:00:00Z';events.tick();assert.equal(new URL(frameSrc).searchParams.get('dawahx_day'),'2027-01-01');assert.equal(frameWrites,2);
now='2027-01-01T18:00:00Z';document.hidden=true;docEvents.visibilitychange();assert.equal(frameWrites,2);document.hidden=false;docEvents.visibilitychange();assert.equal(new URL(frameSrc).searchParams.get('dawahx_day'),'2027-01-02');assert.equal(frameWrites,3);
context.DawahAdhan=undefined;events.tick();assert(cards.every(c=>c.time.textContent==='—'));assert(nodes['prayer-next'].textContent.includes('গণনা করা যাচ্ছে না'));
assert(fs.readFileSync('policy.html','utf8').includes('সরাসরি নেওয়া নয়'));
console.log('prayer cards: approximate reference, Dhaka midnight, next day, blocked/failure and timezones pass');
