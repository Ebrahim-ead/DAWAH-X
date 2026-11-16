#!/usr/bin/env node
/* DAWAH X — নিজস্ব ডোমেইন বসানো।
   চালানো:  node tools/set-domain.cjs dawahx.com
   যা করে: ১) সব পাতার canonical / og:url / og:image, sitemap.xml ইত্যাদিতে পুরোনো ঠিকানার জায়গায় নতুন ঠিকানা বসায়
           ২) CNAME ফাইল লেখে (GitHub Pages এটি দেখে ডোমেইন চেনে)   ৩) robots.txt লেখে   ৪) tools/site.json হালনাগাদ করে
   এরপর:  node tools/build-site-data.cjs share   (শেয়ার-পাতাগুলোতে নতুন ঠিকানা বসে)
   আগের অবস্থায় ফিরতে:  node tools/set-domain.cjs --github */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),CFG=path.join(__dirname,'site.json');
const GITHUB='https://ebrahim-ead.github.io/DAWAH-X/';
const arg=(process.argv[2]||'').trim().toLowerCase();
if(!arg){console.error('ডোমেইনের নাম দিন, যেমন: node tools/set-domain.cjs dawahx.com');process.exit(1)}
const back=arg==='--github',domain=arg.replace(/^https?:\/\//,'').replace(/\/.*$/,'');
if(!back&&!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)){console.error('ডোমেইনের নামটি ঠিক নয়: '+domain);process.exit(1)}
const oldUrl=JSON.parse(fs.readFileSync(CFG,'utf8')).url.replace(/\/*$/,'/'),newUrl=back?GITHUB:'https://'+domain+'/';
let files=0,hits=0;
for(const f of fs.readdirSync(ROOT)){if(!/\.(html|xml|webmanifest|js|txt)$/.test(f))continue;const p=path.join(ROOT,f),s=fs.readFileSync(p,'utf8'),n=s.split(oldUrl).length-1;
 if(n){fs.writeFileSync(p,s.split(oldUrl).join(newUrl));files++;hits+=n}}
fs.writeFileSync(CFG,JSON.stringify({url:newUrl})+'\n');
if(back){for(const f of['CNAME','robots.txt'])fs.rmSync(path.join(ROOT,f),{force:true})}
else{fs.writeFileSync(path.join(ROOT,'CNAME'),domain+'\n');fs.writeFileSync(path.join(ROOT,'robots.txt'),'User-agent: *\nAllow: /\n\nSitemap: '+newUrl+'sitemap.xml\n')}
console.log(`${oldUrl} → ${newUrl}: ${files}টি ফাইলে ${hits}টি জায়গায় বদলানো হয়েছে।`+(back?'':' CNAME ও robots.txt লেখা হয়েছে।')+'\nএখন চালান: node tools/build-site-data.cjs share');
