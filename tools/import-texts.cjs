/* probe: describe the DOM around the article of one sample page per source */
const fs=require('fs'),cheerio=require('cheerio');
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const S=['https://at-tahreek.com/article_details/922193','https://al-itisam.com/article_details/7034','https://al-itisam.com/view_question_answer/7417',
 'https://www.response-to-anti-islam.com/show/'+encodeURI('আল্লাহ-কেন-শয়তান-সৃষ্টি-করলেন--')+'/133','https://www.frommuslims.com/qna/','https://www.frommuslims.com/all-posts/'];
const sig=e=>e.tagName+(e.attribs.id?'#'+e.attribs.id:'')+(e.attribs.class?'.'+e.attribs.class.trim().split(/\s+/).slice(0,4).join('.'):'');
(async()=>{const out=[];
 for(const u of S){const r={u};try{const res=await fetch(u,{headers:{'user-agent':UA,'accept-language':'bn,en;q=0.8'},redirect:'follow'});r.status=res.status;r.final=res.url;const html=await res.text();r.len=html.length;
   const $=cheerio.load(html);$('script,style,noscript,svg,iframe').remove();r.title=$('title').text().trim().slice(0,120);
   r.h1=$('h1').toArray().map(h=>({t:$(h).text().trim().slice(0,60),path:$(h).parents().toArray().slice(0,7).map(sig)}));
   const h=$('h1').last();let best=null;h.parents().each((i,p)=>{const L=$(p).text().replace(/\s+/g,' ').length;if(!best&&L>600)best=p});
   if(best){r.best=sig(best);const walk=(e,d)=>$(e).children().toArray().slice(0,30).map(c=>{const t=$(c).text().replace(/\s+/g,' ').trim();const o={s:sig(c),n:t.length,t:t.slice(0,50)};if(d<3&&t.length>300&&$(c).children().length)o.c=walk(c,d+1);return o});r.tree=walk(best,0)}
   r.links=$('a[href]').toArray().map(a=>a.attribs.href).filter(h=>/frommuslims\.com\/(qna|question)/.test(h)).slice(0,12);
  }catch(e){r.err=String(e)}out.push(r)}
 fs.mkdirSync('texts',{recursive:true});fs.writeFileSync('texts/_probe.json',JSON.stringify(out,null,1))})();
