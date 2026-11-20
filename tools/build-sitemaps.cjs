#!/usr/bin/env node
/* Sitemap index: include only existing, indexable pages. Publication dates are not modification dates. */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.join(__dirname,'..');
const SITE=JSON.parse(fs.readFileSync(path.join(__dirname,'site.json'),'utf8')).url.replace(/\/+$/,'/');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const save=(f,s)=>{const p=path.join(ROOT,f);let old='';try{old=fs.readFileSync(p,'utf8')}catch(_){}if(old!==s)fs.writeFileSync(p,s)};
const rootPages=fs.readdirSync(ROOT).filter(f=>/^[a-z0-9-]+\.html$/.test(f)&&!/^google[0-9a-f]+\.html$/.test(f)).sort().filter(f=>!/<meta\b[^>]*\bnoindex/i.test(fs.readFileSync(path.join(ROOT,f),'utf8')));
const xmlHeader='<?xml version="1.0" encoding="UTF-8"?>\n';
// Git's last committed modification date is a reliable lastmod only for unchanged tracked files.
let dates={};try{const log=cp.execFileSync('git',['log','--format=@@%cs','--name-only','--','*.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:30*1024*1024});let date='';for(const line of log.split('\n')){if(line.startsWith('@@'))date=line.slice(2);else if(line&&!dates[line])dates[line]=date}}catch(_){}
let changed=new Set();try{const out=cp.execFileSync('git',['status','--porcelain','--untracked-files=all','--','*.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:30*1024*1024});for(const line of out.split('\n'))if(line.length>3)changed.add(line.slice(3))}catch(_){}
const entry=(loc,date)=>'  <url><loc>'+esc(SITE+loc)+'</loc>'+(date?'<lastmod>'+date+'</lastmod>':'')+'</url>\n';
let stat=xmlHeader+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for(const f of rootPages)stat+=entry(f==='index.html'?'':f,!changed.has(f)?dates[f]:'');
stat+='</urlset>\n';save('sitemap-static.xml',stat);
const dir=path.join(ROOT,'s'),arts=fs.readdirSync(dir).filter(f=>/^[0-9a-f]{14}\.html$/.test(f)).sort().filter(f=>!/<meta\b[^>]*\bnoindex/i.test(fs.readFileSync(path.join(dir,f),'utf8')));
const children=['sitemap-static.xml'];
for(let i=0;i<arts.length;i+=20000){const name='sitemap-articles-'+(Math.floor(i/20000)+1)+'.xml';children.push(name);let xml=xmlHeader+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';for(const f of arts.slice(i,i+20000))xml+=entry('s/'+f,!changed.has('s/'+f)?dates['s/'+f]:'');xml+='</urlset>\n';save(name,xml)}
for(const f of fs.readdirSync(ROOT))if(/^sitemap-articles-\d+\.xml$/.test(f)&&!children.includes(f))fs.unlinkSync(path.join(ROOT,f));
let index=xmlHeader+'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';for(const f of children)index+='  <sitemap><loc>'+esc(SITE+f)+'</loc></sitemap>\n';index+='</sitemapindex>\n';save('sitemap.xml',index);
save('robots.txt','User-agent: *\nAllow: /\n\nSitemap: '+SITE+'sitemap.xml\n');
console.log('sitemaps:',rootPages.length,'root pages,',arts.length,'articles,',children.length,'child sitemaps');
