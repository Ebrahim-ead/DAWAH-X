#!/usr/bin/env node
/* নতুন ভিডিও স্বয়ংক্রিয়ভাবে যোগ করা — .github/workflows/update-videos.yml এটি নির্দিষ্ট সময় পরপর চালায়।

   কী করে: tools/video-channels.json-এর প্রতিটি চ্যানেলের পাবলিক আপলোড-ফিড
   (https://www.youtube.com/feeds/videos.xml?channel_id=…, সর্বশেষ ১৫টি ভিডিও; API key লাগে না) পড়ে,
   যে ভিডিও youtube-videos.json-এ নেই সেগুলো তালিকার শুরুতে (নতুনটি আগে) যোগ করে।

   - চ্যানেলের channelId ফাঁকা থাকলে চ্যানেলের পাতা (ও তালিকার একটি পুরনো ভিডিওর পাতা) থেকে বের করে
     video-channels.json-এ লিখে রাখে; পরের বার আর খুঁজতে হয় না।
   - addSince-এর আগের ভিডিও যোগ হয় না (স্থির সংগ্রহে ইচ্ছা করে বাদ রাখা পুরনো ভিডিও যেন ঢুকে না পড়ে)।
   - সরাসরি ভিডিও মুছে ফেলে না; আলাদা audit-videos.cjs অনুপলভ্যতা যাচাই করে। কোনো চ্যানেলের ফিড না পেলে সেটি বাদ দিয়ে বাকিগুলো দেখে;
     ব্যর্থতায় রান "failed" হয় না (প্রতি আধা ঘণ্টায় ইমেইল না আসার জন্য), লগে ::warning:: থাকে।

   চালানো:  node tools/update-videos.cjs          (ফাইল বদলায়)
            node tools/update-videos.cjs --dry    (শুধু দেখায়)
   পরীক্ষা: VIDEO_FIXTURES=<ফোল্ডার> দিলে নেটওয়ার্কের বদলে সেই ফোল্ডারের ফাইল পড়ে (নাম = encodeURIComponent(url))। */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const LIST=path.join(ROOT,'youtube-videos.json');
const CONFIG=path.join(__dirname,'video-channels.json');
const STATS=path.join(ROOT,'stats.json'); // হোমপেজের পরিসংখ্যান (ভিডিওর সংখ্যাটুকু এই স্ক্রিপ্টই হালনাগাদ করে)
const DRY=process.argv.includes('--dry');
const FIXTURES=process.env.VIDEO_FIXTURES||'';
const MAX_NEW=80; // এক রানে এর বেশি নতুন ভিডিও এলে কিছু একটা ভুল — কিছুই যোগ হয় না
const HEADERS={
  'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language':'en-US,en;q=0.9',
  'Cookie':'CONSENT=YES+cb; SOCS=CAI' // ইউরোপের সার্ভার থেকে সম্মতির পাতায় না পাঠানোর জন্য
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const warn=msg=>console.log('::warning::'+String(msg).replace(/\r?\n/g,' '));
const ID_RE=/^[\w-]{11}$/,CH_RE=/^UC[\w-]{22}$/;

async function get(url,tries=3){
  if(FIXTURES){
    const f=path.join(FIXTURES,encodeURIComponent(url));
    if(!fs.existsSync(f))throw new Error('fixture missing: '+url);
    return fs.readFileSync(f,'utf8');
  }
  let last;
  for(let i=0;i<tries;i++){
    if(i)await sleep(1500*i);
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),20000);
    try{
      const r=await fetch(url,{headers:HEADERS,redirect:'follow',signal:ctl.signal});
      if(!r.ok)throw new Error('HTTP '+r.status);
      return await r.text();
    }catch(e){last=e;}finally{clearTimeout(timer);}
  }
  throw new Error(url+' → '+(last&&last.message||last));
}

const first=(text,patterns)=>{for(const re of patterns){const m=re.exec(text);if(m&&CH_RE.test(m[1]))return m[1];}return '';};
/* চ্যানেলের পাতা থেকে channelId */
async function idFromHandle(handle){
  if(!handle)return '';
  const html=await get('https://www.youtube.com/'+handle);
  return first(html,[
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /<meta itemprop="(?:identifier|channelId)" content="(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /"channelUrl":"https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/
  ]);
}
/* তালিকায় থাকা সেই চ্যানেলের একটি ভিডিওর পাতা থেকে channelId (চ্যানেলের পাতা না পেলে, বা মিলিয়ে দেখতে) */
async function idFromVideo(videoId){
  if(!videoId)return '';
  const html=await get('https://www.youtube.com/watch?v='+videoId);
  return first(html,[
    /"videoDetails":\{[^}]*?"channelId":"(UC[\w-]{22})"/,
    /<meta itemprop="channelId" content="(UC[\w-]{22})"/,
    /<meta itemprop="identifier" content="(UC[\w-]{22})"/
  ]);
}
async function resolveChannelId(channel,videos){
  let byHandle='',byVideo='';
  try{byHandle=await idFromHandle(channel.handle);}catch(e){console.log('  চ্যানেলের পাতা পাওয়া যায়নি: '+e.message);}
  const sample=videos.find(v=>v.channelTitle===channel.title);
  try{byVideo=await idFromVideo(sample&&sample.id);}catch(e){console.log('  ভিডিওর পাতা পাওয়া যায়নি: '+e.message);}
  if(byHandle&&byVideo&&byHandle!==byVideo){
    /* দুই পথে দুই রকম উত্তর — ভুল চ্যানেলের ভিডিও ঢোকার চেয়ে এই চ্যানেলটি এবার বাদ দেওয়া ভালো */
    throw new Error('channelId মিলছে না (চ্যানেলের পাতা '+byHandle+', ভিডিওর পাতা '+byVideo+')');
  }
  const id=byHandle||byVideo;
  if(!id)throw new Error('channelId বের করা যায়নি');
  return id;
}

const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
  .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(+d))
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&')
  .replace(/\s+/g,' ').trim();
const tag=(xml,name)=>{const m=new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+name+'>').exec(xml);return m?decode(m[1]):'';};
/* ফিডের <entry>-গুলো → [{id,title,publishedAt,channelId}] */
function parseFeed(xml){
  if(!/<feed[\s>]/.test(xml))throw new Error('ফিড নয়');
  const out=[];
  for(const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)){
    const e=m[1],id=tag(e,'yt:videoId'),title=tag(e,'title'),published=tag(e,'published');
    if(!ID_RE.test(id)||!title)continue;
    const t=Date.parse(published);
    out.push({id,title,publishedAt:Number.isNaN(t)?'':published,time:Number.isNaN(t)?0:t,channelId:tag(e,'yt:channelId')});
  }
  return out;
}
async function fetchFeed(channelId){
  const urls=['https://www.youtube.com/feeds/videos.xml?channel_id='+channelId,
              'https://www.youtube.com/feeds/videos.xml?playlist_id=UU'+channelId.slice(2)]; // একই তালিকা, আরেক ঠিকানা
  let last;
  for(const url of urls){try{return parseFeed(await get(url));}catch(e){last=e;}}
  throw last;
}

(async()=>{
  const config=JSON.parse(fs.readFileSync(CONFIG,'utf8'));
  const videos=JSON.parse(fs.readFileSync(LIST,'utf8'));
  if(!Array.isArray(videos)||videos.length<1000)throw new Error('youtube-videos.json ঠিক নেই');
  const since=Date.parse(config.addSince||'')||0;
  let blocked={};try{blocked=JSON.parse(fs.readFileSync(path.join(__dirname,'video-audit-state.json'),'utf8')).blocked||{}}catch(e){if(e.code!=='ENOENT')throw e}
  const known=new Set([...videos.map(v=>v.id),...Object.keys(blocked)]);
  const byId=new Map(videos.map(v=>[v.id,v]));
  const fresh=[];let configChanged=false,okChannels=0,patched=0;

  for(const channel of config.channels){
    if(!channel.title){
      /* নাম এখনো অজানা (নতুন চ্যানেল): খালি channelTitle নিয়ে সারি ঢোকানোর চেয়ে বাদ দেওয়া ভালো।
         tools/backfill-videos.cjs একবার চালালেই নাম বসে যায়। */
      warn((channel.handle||channel.channelId||'?')+': নাম এখনো অজানা — backfill-videos.cjs একবার চালান, ততক্ষণ বাদ।');
      continue;
    }
    console.log('\n'+channel.title);
    try{
      if(!CH_RE.test(channel.channelId||'')){
        channel.channelId=await resolveChannelId(channel,videos);configChanged=true;
        console.log('  channelId: '+channel.channelId);
      }
      const entries=await fetchFeed(channel.channelId);
      okChannels++;
      let added=0,old=0;
      for(const e of entries){
        if(e.channelId&&e.channelId!==channel.channelId)continue; // অন্য চ্যানেলের সারি (হওয়ার কথা নয়)
        if(known.has(e.id)){
          /* তালিকায় আছে কিন্তু তারিখ ফাঁকা — ফিডের নির্ভুল তারিখ বসিয়ে দেওয়া */
          const row=byId.get(e.id);
          if(row&&!row.publishedAt&&e.publishedAt){row.publishedAt=e.publishedAt;patched++;}
          continue;
        }
        if(!e.time||e.time<since){old++;continue;}
        known.add(e.id);added++;
        fresh.push({id:e.id,title:e.title,channelTitle:channel.title,publishedAt:e.publishedAt,time:e.time});
      }
      console.log('  ফিডে '+entries.length+'টি · নতুন '+added+'টি'+(old?' · পুরনো বলে বাদ '+old+'টি':''));
    }catch(e){warn(channel.title+': '+e.message);}
  }

  if(!okChannels)warn('কোনো চ্যানেলের ফিড পাওয়া যায়নি — এবার কিছু বদলায়নি।');
  if(fresh.length>MAX_NEW){warn('এক রানে '+fresh.length+'টি নতুন ভিডিও — অস্বাভাবিক, তাই কিছু যোগ করা হয়নি।');fresh.length=0;}
  fresh.sort((a,b)=>b.time-a.time);
  for(const v of fresh)console.log('  + '+v.publishedAt+'  '+v.channelTitle.slice(0,24)+'  '+v.id+'  '+v.title.slice(0,70));
  console.log('\nনতুন ভিডিও: '+fresh.length+'টি · মোট হবে '+(videos.length+fresh.length)+'টি'+
    (patched?' · পুরোনো '+patched+'টির ফাঁকা তারিখ পূরণ হলো':'')+(DRY?' (dry run — কিছু লেখা হয়নি)':''));
  if(DRY)return;
  if(fresh.length||patched){
    /* নতুনগুলো তালিকার শুরুতে, তারিখ অনুযায়ী পুরনো সারিগুলোর মাঝে ঠিক জায়গায় (তালিকার শুরুটা নতুন-থেকে-পুরনো সাজানো) */
    for(const v of fresh.reverse()){
      const record={id:v.id,title:v.title,channelTitle:v.channelTitle,publishedAt:v.publishedAt};
      let at=0;
      while(at<videos.length&&videos[at].publishedAt&&Date.parse(videos[at].publishedAt)>v.time)at++;
      videos.splice(at,0,record);
    }
    /* thumbnail id থেকেই তৈরি হয় — বাড়তি ঘরগুলো মুছে ফেলা (ফাইল হালকা থাকে) */
    for(const v of videos)if(v.thumbnail==='https://i.ytimg.com/vi/'+v.id+'/hqdefault.jpg')delete v.thumbnail;
    fs.writeFileSync(LIST,JSON.stringify(videos));
  }
  /* হোমপেজের পরিসংখ্যান: ভিডিওর সংখ্যা বদলালে stats.json-এ লেখা হয় (বাকি সংখ্যা tools/build-stats.cjs-এর) */
  let stats=null;try{stats=JSON.parse(fs.readFileSync(STATS,'utf8'))}catch(e){}
  if(!stats||stats.videos!==videos.length){stats=Object.assign({},stats,{videos:videos.length});fs.writeFileSync(STATS,JSON.stringify(stats)+'\n');}
  if(configChanged)fs.writeFileSync(CONFIG,JSON.stringify(config,null,2)+'\n');
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'added='+fresh.length+'\n');
})().catch(e=>{console.error(e);process.exit(1);});
