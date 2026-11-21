'use strict';
/* Browser regression: check the actual composited card background against every
   rendered text color, in both themes, all rotating cards and screen sizes. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright-core');
const {PNG}=require('pngjs');
const root=path.resolve(__dirname,'..');
const contentTypes={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 const name=fs.existsSync(file)&&fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
 fs.readFile(name,(err,data)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':contentTypes[path.extname(name)]||'application/octet-stream'});res.end(data)});
});
const rgba=s=>{const m=s.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);assert(m,'Unsupported color: '+s);return [+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]};
const over=(front,back)=>front.slice(0,3).map((v,i)=>v*front[3]+back[i]*(1-front[3]));
const luminance=rgb=>{const c=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  const port=server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  for(const width of [320,390,768,1280])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
   await context.addInitScript(theme=>localStorage.setItem('dawahx-theme',theme),theme);
   await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
   const page=await context.newPage();await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});
   assert.equal(await page.getAttribute('html','data-theme'),theme);
   await page.waitForSelector('#daily-reading .guidance-card');
   for(let n=0;n<4;n++){
    await page.evaluate(n=>{const template=document.getElementById('daily-reading-templates');document.getElementById('daily-reading-card').replaceChildren(template.content.querySelectorAll('.guidance-card')[n].cloneNode(true))},n);
    const card=page.locator('#daily-reading .guidance-card');await card.scrollIntoViewIfNeeded();
    const png=PNG.sync.read(await card.screenshot());
    // Inner edges are clear of content; sample both ends of the real painted background.
    const backgrounds=[7,png.width-8].map(x=>{const i=(Math.floor(png.height/2)*png.width+x)*4;return [png.data[i],png.data[i+1],png.data[i+2]]});
    for(const selector of ['h3','.guidance-reference','.guidance-mark','.guidance-arabic','.guidance-translation','.guidance-source']){
     const element=card.locator(selector);const colors=await element.evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
     for(const bg of backgrounds){const under=over(rgba(colors.background),bg),text=over(rgba(colors.color),under),ratio=contrast(text,under);assert(ratio>=4.5,`${theme} ${width}px card ${n+1} ${selector} contrast ${ratio.toFixed(2)}`)}
    }
   }
   await context.close();console.log(`${theme} ${width}px: all four cards readable`);
  }
 }finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
