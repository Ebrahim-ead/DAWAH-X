/* Shared HTML shell for generated root-level pages. Keep page-specific copy in Bengali. */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const SITE=JSON.parse(fs.readFileSync(path.join(__dirname,'site.json'),'utf8')).url.replace(/\/*$/,'/');
const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const setMeta=(html,attr,key,value)=>html.replace(/<meta\b[^>]*>/gi,tag=>{
 if(!tag.includes(attr+'="'+key+'"'))return tag;
 return tag.replace(/\bcontent="[^"]*"/i,'content="'+esc(value)+'"');
});
function fromQuestions({sectionId,section,title,description,url,pageId,structuredData}){
 let html=fs.readFileSync(path.join(ROOT,'questions.html'),'utf8');
 const a=html.indexOf('<section id="qa"'),b=html.indexOf('</main>',a);
 if(a<0||b<0)throw new Error('questions.html-এর পৃষ্ঠা-কাঠামো পাওয়া যায়নি');
 html=html.slice(0,a)+section+'\n'+html.slice(b);
 html=html.replace(/<title>[^<]*<\/title>/i,'<title>'+esc(title)+'</title>');
 html=setMeta(html,'name','description',description);
 html=setMeta(html,'property','og:title',title);html=setMeta(html,'property','og:description',description);
 html=setMeta(html,'property','og:url',url);html=setMeta(html,'name','twitter:title',title);html=setMeta(html,'name','twitter:description',description);
 html=html.replace(/<link\b[^>]*\brel="canonical"[^>]*>/i,tag=>tag.replace(/\bhref="[^"]*"/i,'href="'+esc(url)+'"'));
 html=html.replaceAll(SITE+'questions.html',url);
 html=html.replace('<body data-page="qa">','<body data-page="'+esc(pageId||sectionId)+'">');
 html=html.replace('<a aria-current="page" class="on" href="questions.html">প্রশ্নোত্তর</a>','<a href="questions.html">প্রশ্নোত্তর</a>');
 if(structuredData){
  const json=JSON.stringify(structuredData).replace(/</g,'\\u003c');
  const script='<script type="application/ld+json">'+json+'</script>';
  if(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i.test(html))html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i,script);
  else html=html.replace('</head>',script+'\n</head>');
 }
 return html;
}
module.exports={ROOT,SITE,esc,fromQuestions};
