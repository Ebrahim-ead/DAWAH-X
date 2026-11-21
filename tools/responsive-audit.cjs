'use strict';
const {chromium}=require('playwright-core'),fs=require('fs');
const pages=['index.html','about.html','services.html','questions.html','fatwa.html','videos.html','ask.html','contact.html','sources.html','recent.html','topics.html','topic-quran.html','series.html','series-006e78617b.html','faq.html','saved.html','policy.html','404.html','read.html?k=1505f35ad3d6f0'];
const widths=[320,390,768,1024,1100,1366];
const result={cases:0,issues:[],axe:[],screens:[]};
(async()=>{let browser;try{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const width of widths){for(const theme of ['dark','light']){
  const ctx=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce',serviceWorkers:'block'});
  await ctx.addInitScript(theme=>localStorage.setItem('dawahx-theme',theme),theme);
  await ctx.route('**/*',r=>{let url=new URL(r.request().url());return url.hostname==='127.0.0.1'?r.continue():r.abort()});
  for(const name of pages){const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
   try{
    await p.goto('http://127.0.0.1:4173/'+name,{waitUntil:'domcontentloaded',timeout:25000});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);
    if(name!=='404.html'&&await p.getAttribute('html','data-theme')!==theme)throw new Error('incorrect site theme');
    if(name.startsWith('read.html'))await p.waitForFunction(()=>document.querySelector('#read-body')?.textContent.trim().length>30,null,{timeout:12000});
    if(name==='videos.html')await p.waitForSelector('.video-card',{timeout:15000});
    result.cases++;
    const info=await p.evaluate(()=>{
     const vp=document.documentElement.clientWidth, root=document.documentElement, offenders=[];
     if(root.scrollWidth>vp+1)for(const e of document.querySelectorAll('body *')){const r=e.getBoundingClientRect(),c=getComputedStyle(e);if(r.width&&r.height&&c.position!=='fixed'&&c.visibility!=='hidden'&&(r.right>vp+2||r.left < -2))offenders.push({tag:e.tagName,id:e.id,cls:String(e.className).slice(0,90),right:Math.round(r.right),left:Math.round(r.left)});if(offenders.length===6)break}
     const header=document.querySelector('.bar'), menu=document.querySelector('#menu'),act=document.querySelector('.acts');let overlap=false;
     if(innerWidth>=1100&&menu&&act){const m=menu.getBoundingClientRect(),a=act.getBoundingClientRect();overlap=m.right>a.left+1}
     const clipped=[];for(const e of document.querySelectorAll('h1,.prayer-card time,.video-card h2,.library-link b,#menu a,.qcard b')){const r=e.getBoundingClientRect(),c=getComputedStyle(e);if(r.width&&r.height&&e.clientWidth&&e.scrollWidth>e.clientWidth+2&&!['auto','scroll'].includes(c.overflowX))clipped.push({tag:e.tagName,cls:e.className,text:(e.textContent||'').trim().slice(0,45),scroll:e.scrollWidth,client:e.clientWidth});if(clipped.length>=5)break}
     return {overflow:root.scrollWidth-vp,offenders,overlap,clipped,header:header?.getBoundingClientRect().height};
    });
    if(info.overflow>1||info.overlap||info.clipped.length||errors.length)result.issues.push({width,theme,page:name,...info,errors});
    if(['index.html','questions.html','videos.html','read.html?k=1505f35ad3d6f0'].includes(name)&&[390,1366].includes(width)&&theme==='dark'){
     const label=name.split('?')[0].replace('.html','');await p.screenshot({path:`tools/responsive-shot-${label}-${width}.png`,fullPage:false});result.screens.push(label+'-'+width);
    }
    if(['index.html','questions.html','ask.html','videos.html','read.html?k=1505f35ad3d6f0'].includes(name)&&[390,1366].includes(width)){
     await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const axe=await p.evaluate(async()=>await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
     for(const v of axe.violations)result.axe.push({width,theme,page:name,id:v.id,impact:v.impact,targets:v.nodes.slice(0,4).map(n=>n.target.join(' '))});
    }
   }catch(e){result.issues.push({width,theme,page:name,error:String(e).slice(0,500)});}finally{await p.close()}
  }
  await ctx.close();
 }}
 }catch(e){result.error=String(e.stack||e)}finally{await browser?.close();fs.writeFileSync('tools/responsive-audit-result.json',JSON.stringify(result,null,2));console.log('Cases',result.cases,'issues',result.issues.length,'axe',result.axe.length);if(result.error||result.issues.length||result.axe.length)process.exitCode=1}
})();
