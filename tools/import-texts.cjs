/* DAWAH X — লাইব্রেরির লেখা আমদানি (GitHub Actions-এ চলে; দেখুন .github/workflows/import-texts.yml)
   প্রকাশকের অনুমতি সাপেক্ষে উৎস সাইট থেকে লেখা এনে texts/<bucket>.json-এ রাখে। প্রতিটি লেখার সাথে উৎসের ঠিকানা থাকে।
   নিয়ন্ত্রণ: tools/import-request.json  {"set":"builtin"|"all","hosts":["ai","ra","at","ia"],"limits":{"at":100},"minutes":300}  (আগে আনা লেখা আবার আনা হয় না) */
const fs=require('fs'),path=require('path'),cheerio=require('cheerio');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'texts');
/* IMPORT_REQUEST দিয়ে স্থানীয়ভাবে চালানো যায়, যেমন শুধু সংশোধনের জন্য: IMPORT_REQUEST='{"set":"none","hosts":[]}' */
const REQ=JSON.parse(process.env.IMPORT_REQUEST||fs.readFileSync(path.join(__dirname,'import-request.json'),'utf8'));
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* app.js-এর textKey()-এর সাথে হুবহু এক হতে হবে */
const keyOfUrl=u=>{try{u=decodeURI(u)}catch(e){}let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<u.length;i++){const c=u.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
 return (4294967296*(2097151&h2)+(h1>>>0)).toString(16).padStart(14,'0')};
const SOURCES={
 ai:{host:'al-itisam.com',delay:350,extract($){const meta=$('.post-footer-meta-info').first().text();
   return{title:$('.section-title h1').first().text(),body:$('.post-cont-wrapper').first(),date:(meta.match(/[\u0980-\u09ff]+\s+[০-৯0-9]{1,2},\s*[০-৯0-9]{4}/)||[''])[0],author:''}}},
 ra:{host:'www.response-to-anti-islam.com',delay:500,extract($){const head=$('h1.post-title').first().parent();
   return{title:$('h1.post-title').first().text(),body:$('.entry-content').first(),date:(head.text().match(/[A-Z][a-z]{2} \d{1,2}, \d{4}/)||[''])[0],author:head.find('a[href*="author_id"]').first().text()}}},
 at:{host:'at-tahreek.com',delay:350,extract($){const body=$('.main_content_area .article-details').first();body.find('.subjects,.fb-comments,#fb-root,.related-articles').remove();
   const crumbs=$('.styled_breadcumb a').toArray().map(a=>$(a).text().replace(/\s+/g,' ').trim()).filter(Boolean);
   return{title:$('.bread-title h1').first().text(),body,date:crumbs.find(t=>/[০-৯0-9]{4}/.test(t))||'',author:''}}},
 ia:{host:'islamicauthors.com',delay:600,extract($){const art=$('article.article-body').first();
   return{title:art.find('.article-header h1').first().text(),body:art.find('.article-content').first(),date:'',
    /* লেখক-কার্ডের লেখা: "<ছবির আদ্যক্ষর> <নাম> <সংখ্যা> আর্টিকেল …" */
    author:(t=>{const m=t.match(/^\S{1,2}\s+(.{2,140}?)\s+[0-9০-৯]+\s*আর্টিকেল/);return m?m[1]:''})(art.find('.author-card').first().text().replace(/\s+/g,' ').trim())}}}
,
 /* insightzonebd.com: রানার থেকে সরাসরি আনা যায় না (Cloudflare)। প্রশ্নোত্তর tools/add-texts.cjs দিয়ে tools/manual/ থেকে যোগ হয়;
    প্রবন্ধ আসে Internet Archive-এ থাকা পুরোনো (WordPress) সংস্করণের কপি থেকে। পুরোনো ঠিকানা একটু আলাদা হতে পারে (fuzzy), তাই শিরোনাম মিলিয়ে নেওয়া হয়। */
 /* izTidy: শিরোনামের পুনরাবৃত্তি, জোড়া <sup>, "URL Copied" বোতামের লেখা বাদ; খোলা লেখা (যেমন "রেফারেন্স") অনুচ্ছেদে */
 iz:{tidy(html,title){const flat=t=>t.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/[\s?!।:;,.\-–—'"‘’“”]+/g,'').normalize('NFC');
   return html.replace(/^\s*<(h[234])>(.*?)<\/\1>\s*/,(m,g,t)=>flat(t)===flat(title)?'':m).replace(/<sup>\s*<sup>([^<]*)<\/sup>\s*<\/sup>/g,'<sup>$1</sup>')
    .replace(/\s*<p>\s*URL Copied\s*<\/p>/g,'').replace(/(<\/(?:p|ol|ul|blockquote|h[234]|table)>)\s*([^<\s][^<]{0,80}?)\s*(<(?:ol|ul)>)/g,'$1<p>$2</p>$3').trim()},
   host:'www.insightzonebd.com',delay:13000,wayback:'insightzonebd.com',fuzzy:true,extract($,base){
   const title=($('meta[property="og:title"]').attr('content')||$('title').first().text()).replace(/\s+/g,' ').replace(/\s*[-–|]\s*Insight Zone\s*$/i,'').trim();
   /* নতুন সাইট (২০২৬, WordPress নয়): main.post-main > h1.post-content-title, .post-meta-left (লেখক, তারিখ, পঠিত), .post-body।
      লেখায় অনুচ্ছেদ-ট্যাগ প্রায়ই নেই — ফাঁকা লাইন = নতুন অনুচ্ছেদ, এক লাইন-ভাঙা = <br>; টীকা লেখার ভেতরে "(( … ))" আকারে (সাইট নিজে এগুলোকে নম্বর দেয়) */
   const nb=$('.post-main .post-body').first();
   if(nb.length){const t2=$('h1.post-content-title').first().text().replace(/\s+/g,' ').trim()||title.replace(/\s*[-–|]\s*ইনসাইট জোন\s*$/,'').trim();
    const meta=$('.post-main .post-meta-left > span').toArray().map(e=>$(e).text().replace(/\s+/g,' ').trim());
    const DM=/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,? (\d{4})\b/,dm=DM.exec(meta.join(' | '));
    const date=dm?dm[3]+'-'+String('JanFebMarAprMayJunJulAugSepOctNovDec'.indexOf(dm[2])/3+1).padStart(2,'0')+'-'+dm[1].padStart(2,'0'):'';
    const author=meta[0]&&!DM.test(meta[0])&&!/বার পঠিত/.test(meta[0])?meta[0]:'';
    nb.find('.post-footnotes-box,.share-box,.post-toc,script,style').remove();
    for(let k=0;k<6&&nb.find('span').length;k++)nb.find('span').each((i,e)=>{$(e).replaceWith($(e).contents())});
    const BL=new Set(['p','h1','h2','h3','h4','h5','h6','ul','ol','blockquote','table','div','figure','hr','pre','section']);
    const autop=c=>{const out=[];let buf=[];
     const flush=()=>{if(!buf.length)return;const h=buf.map(n=>$.html(n)).join('');buf=[];
      for(const part of h.split(/\n[ \t\r]*\n/)){const t=part.replace(/^\s+|\s+$/g,'');if(t.replace(/<[^>]+>|&nbsp;|\s/g,'')||/<img\b/.test(t))out.push('<p>'+t.replace(/[ \t\r]*\n[ \t\r]*/g,'<br>')+'</p>')}};
     for(const n of(c.children||[]).slice()){if(n.type==='tag'&&BL.has(n.tagName.toLowerCase())){flush();out.push($.html(n))}else if(n.type==='text'||n.type==='tag')buf.push(n)}
     flush();$(c).html(out.join('\n'))};
    for(const q of nb.find('blockquote').toArray().reverse())autop(q);
    autop(nb.get(0));
    let html=clean($,nb,base);const notes=[],bal=x=>['b','i','u','a','sup'].every(t=>(x.match(new RegExp('<'+t+'\\b','g'))||[]).length===(x.match(new RegExp('</'+t+'>','g'))||[]).length);
    html=html.replace(/\s*\(\(((?:(?!\(\(|\)\)|<\/?(?:p|blockquote|h[234]|li|ul|ol|table|tr|td|th)\b)[\s\S])*?)\)\)/g,(m,t)=>{const x=t.replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/g,'');
     if(!x.replace(/<[^>]+>/g,'').trim()||!bal(x))return m;notes.push(x);return'<sup>'+notes.length+'</sup>'});
    if(notes.length)html+='<h2>তথ্যসূত্র</h2><ol>'+notes.map(x=>'<li>'+x+'</li>').join('')+'</ol>';
    html=SOURCES.iz.tidy(html,t2);
    const junk=html.replace(/<[^>]+>/g,' ').match(/Leave a Comment|Post Comment|শেয়ার করুন|লিংক কপি|বার পঠিত|সূচিপত্র/);
    if(junk)throw new Error('junk in content: '+junk[0]);
    return{title:t2,html,date,author}}
   let body=$('.elementor-widget-theme-post-content').first();if(!body.length)body=$('.entry-content').first();if(!body.length)body=$('article').first();
   if(!body.length)return{title,html:''};
   body.find('.post-views,#wpd-post-rating,.wpd-rating,#comments,.comments-area,#wpdcom,[id^="wpd"],[class*="wpdiscuz"],[class*="wpd-"],.sharedaddy,.addtoany_share_save_container,#ez-toc-container,.ez-toc-container,.lwptoc,#toc_container,nav,.post-navigation,.elementor-post-navigation,.elementor-widget-share-buttons,.elementor-widget-post-navigation,.elementor-widget-post-comments,.elementor-widget-posts,.elementor-widget-post-info,.jp-relatedposts,.yarpp-related').remove();
   /* টীকা: লেখার ভেতরের নম্বর <sup>; তালিকার "[↩]" ফেরত-লিংক বাদ */
   body.find('a.footnote-back-link,a[href^="#identifier_"]').remove();
   body.find('a.footnote-identifier-link,a[href^="#footnote_"]').each((k,e)=>{$(e).replaceWith('<sup>'+esc($(e).text().replace(/\s+/g,''))+'</sup>')});
   let html=clean($,body,base).replace(/\s*\[\s*\]\s*(?=<\/li>)/g,'');
   html=SOURCES.iz.tidy(html,title);
   const junk=html.replace(/<[^>]+>/g,' ').match(/wpDiscuz|Post Views|Article Rating|Notify of|Inline Feedbacks|Leave a (Reply|Comment)|Skip to content/);
   if(junk)throw new Error('junk in content: '+junk[0]);
   return{title,html,date:($('meta[property="article:published_time"]').attr('content')||'').slice(0,10),author:($('meta[name="author"]').attr('content')||'').trim()}}},
 /* wayback: সাইটটি রানারকে ঢুকতে দেয় না, তাই Internet Archive-এ সংরক্ষিত সর্বশেষ কপি থেকে পড়া হয় */
 fm:{/* লেখা নয় এমন অংশ বাদ: "আরো পড়ুন / Read More" বাক্স, ধারাবাহিকের আগে-পরের লিংক, উদ্ধৃতি-বোতামের লেখা, ফাঁকা তালিকা */
   tidy(html){return html.replace(/<a [^>]*>\s*<p>\s*(?:Read More|আর[োও] প)[\s\S]*?<\/a>/g,'').replace(/<p>\s*Citation (?:style:|is loading\.\.\.)\s*<\/p>/g,'')
    .replace(/Series Navigation\s*(?:<a [^>]*>[^<]*<\/a>\s*)+/g,'').replace(/<table>[^<]+<tbody>/g,'<table><tbody>')
    /* সূচি-বাক্স ("Contents / Hide" ও মূল পাতার ভেতরের লিংকগুলো) */
    .replace(/<p>\s*<b>Contents<\/b>\s*<a [^>]*>(?:Hide|Show)<\/a>\s*<\/p>\s*(?:(?:<p>\s*)?<a href="[^"]*#[^"]*"[^>]*>[^<]*<\/a>(?:\s*<\/p>)?\s*)*/g,'')
    /* ধারাবাহিকের বাক্স: "This entry is part … in the series …" ও পর্বগুলোর ছবি-শিরোনাম-তারিখের তালিকা */
    .replace(/(<p>\s*This entry is part [^<]*<a [^>]*>[^<]*<\/a>\s*<\/p>\s*)<h3>[^<]*<\/h3>\s*(?:(?:<p>\s*<a [^>]*>\s*<img [^>]*>\s*<\/a>\s*<\/p>\s*)?<h4>\s*<a [^>]*>[^<]*<\/a>\s*<\/h4>\s*<p>[^<]{3,30}[0-9০-৯]{4}\s*<\/p>\s*)+/g,'$1')
    .replace(/<p>\s*This entry is part [^<]*<a [^>]*>[^<]*<\/a>\s*<\/p>/g,'')
    /* ভিডিও-প্লেয়ারের বোতামের লেখা বাদ; ভিডিওর ছবির জায়গায় ভিডিওর ঠিকানা */
    .replace(/<img src="https:\/\/i\.ytimg\.com\/vi\/([\w-]{6,20})\/[^"]*" alt="video"[^>]*>/g,'<p><a href="https://www.youtube.com/watch?v=$1" rel="noopener nofollow" target="_blank">https://www.youtube.com/watch?v=$1</a></p>')
    .replace(/<p>\s*<a [^>]*>\s*<b>Embed<\/b>\s*<\/a>\s*<\/p>/g,'').replace(/<p>\s*Copy and paste this HTML code into your webpage to embed\.\s*<\/p>/g,'')
    .replace(/<a href="https?:\/\/www\.intellywp\.com[^"]*"[^>]*>[\s\S]*?<\/a>/g,'')
    /* ধারাবাহিকের অন্য দুই রকম বাক্স: "This is post … in the series …" + পর্বের তালিকা; লেখার একদম শুরুতে ধারাবাহিকের নাম + পর্বের তালিকা */
    .replace(/<p>\s*This is post [^<]*<i>[^<]*<\/i>\s*<\/p>\s*<ol>(?:\s*<li>(?:[^<]*|\s*<a [^>]*>[^<]*<\/a>\s*)<\/li>)+\s*<\/ol>/g,'')
    .replace(/^\s*<p>\s*<br>\s*<a [^>]*>[^<]*<\/a>\s*<\/p>\s*<ul>(?:\s*<li>(?:[^<]*|\s*<a [^>]*>[^<]*<\/a>\s*)<\/li>)+\s*<\/ul>/,'')
    .replace(/<li>\s*<\/li>/g,'').replace(/<(ul|ol)>\s*<\/\1>/g,'').replace(/<p>\s*<\/p>/g,'').trim()},
   /* লেখকের নামের সাথে জুড়ে যাওয়া তারিখ ("… এপ্রিল 3, 2025", "… 1 সপ্তাহ ago", "… Last Updated:") বাদ */
   who(a){return a.replace(/\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|জানু(?:\u09df|\u09af\u09bc)ারি|ফেব্রু(?:\u09df|\u09af\u09bc)ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর)\s+[0-9০-৯]{1,2},\s+[0-9০-৯]{4}.*$/,'')
    .replace(/\s*[0-9০-৯]+\s+\S+\s+ago.*$/,'').replace(/\s*Last Updated.*$/,'').replace(/\s+/g,' ').trim()},
   ver:3, /* নিষ্কাশন-নিয়মের সংস্করণ; নতুন রেকর্ডে v হিসেবে থাকে */
   /* WordPress REST API: এক অনুরোধে ৫০টি লেখা (শুধু সাধারণ লেখা; প্রশ্নোত্তর এতে নেই) */
   api:n=>'https://www.frommuslims.com/wp-json/wp/v2/posts?per_page=50&page='+n+'&_fields=link,date_gmt,title,content,coauthors',
   host:'www.frommuslims.com',delay:13000,wayback:'frommuslims.com',extract($,base){
   /* বসানো ইউটিউব ভিডিওর (iframe) জায়গায় ভিডিওর ঠিকানা, নইলে ভিডিও-নির্ভর লেখা ফাঁকা থেকে যায় */
   $('iframe').each((k,e)=>{const m=/(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([\w-]{6,20})/.exec($(e).attr('data-src')||$(e).attr('data-lazy-src')||$(e).attr('src')||'');if(!m)return;
    const u='https://www.youtube.com/watch?v='+m[1],a='<a class="yt-embed" href="'+u+'">'+u+'</a>';$(e).replaceWith($(e).closest('p').length?a:'<div>'+a+'</div>')});
   const title=$('h1.post-title,h1.entry-title').first().text(),name=(e,word)=>$(e).children('span').first().text().replace(/<img\b[^>]*>/g,' ').replace(/\s+/g,' ').trim().split(' '+word+' ')[0].replace(/\s+Staff$/,'').trim();
   /* প্রশ্নোত্তর পেজ (DW Question & Answer): প্রশ্ন + সব উত্তর; মন্তব্য, ভোট, শেয়ার বাদ */
   if($('.dwqa-questions-archive,.dwqa-questions-list').length&&!$('.dwqa-single-question').length)return{title,html:''}; /* প্রশ্নের তালিকা-পাতা, লেখা নয় */
   if($('.dwqa-single-question').length){const q=$('.dwqa-question-item').first(),ans=$('.dwqa-answer-item').toArray();if(!ans.length)return{title,html:''};
    const by=n=>n&&!/@|\[email/.test(n)?'<p>— '+esc(n)+'</p>':'',names=[]; /* নামের জায়গায় ই-মেইল থাকলে দেখানো হয় না */
    const qh=clean($,q.find('.dwqa-question-content').first(),base);
    let html='<h2>প্রশ্ন</h2>'+(textLen(qh)?qh:'<p>'+esc(title.replace(/\s+/g,' ').trim())+'</p>')+by(name(q.find('.dwqa-question-meta').first(),'asked'));
    for(const a of ans){const n=name($(a).find('.dwqa-answer-meta').first(),'answered');if(n&&!names.includes(n))names.push(n);html+='<h2>উত্তর</h2>'+clean($,$(a).find('.dwqa-answer-content').first(),base)+by(n)}
    return{title,html,date:'',author:names.join(', ')}}
   /* সাধারণ লেখা (Jannah থিম) */
   const body=$('#the-post .entry-content,.entry-content').first();
   body.find('.wp-block-wptelegram-widget-join-channel,.post-bottom-meta,.stream-item,#jp-relatedposts,.sharedaddy,#ez-toc-container,.ez-toc-container,.code-block,.addtoany_share_save_container,.yarpp-related,.share-buttons,.post-shortlink,.footnote_referrer_base,.footnote_reference_container_collapse_button').remove();
   body.find('table caption').remove();
   /* ভিডিও-পোস্ট: ভিডিওটি লেখার ওপরে (featured area) বসানো থাকে, লেখার ভেতরে নয়; তার ঠিকানা লেখার শুরুতে রাখা হয় */
   {const out=$('#the-post a.yt-embed').filter((k,e)=>!$(e).closest('.entry-content').length).first();let u=out.attr('href')||'';
    if(!u){const head=$('#the-post').clone();head.find('.entry-content,#related-posts,.related-posts,#comments,.post-components').remove();const m=/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,20})/.exec($.html(head)||'');if(m)u='https://www.youtube.com/watch?v='+m[1]}
    if(u&&!($.html(body)||'').includes(u.slice(-11)))body.prepend('<p><a href="'+u+'">'+u+'</a></p>')}
   body.find('p,div').filter((k,e)=>/^(Citation is loading\.\.\.|Citation style:)$/.test($(e).text().replace(/\s+/g,' ').trim())).remove();
   body.children('div').filter((k,e)=>{const t=$(e).text().replace(/\s+/g,' ').trim();return t.length<260&&/^(আর[োও] প|Read More\.\.\.)/.test(t)}).remove();
   /* টীকা: পূর্ণ তালিকা থাকলে ভাসমান কপি বাদ; না থাকলে ভাসমান লেখা দিয়ে নিচে তালিকা */
   const refs=$('.footnote_plugin_text');
   if(refs.length){body.find('.footnote_tooltip').remove();const box=$('.footnotes_reference_container').first();if(box.length&&!body.find('.footnote_plugin_text').length)body.append(box)}
   else{const tips=body.find('.footnote_tooltip').toArray();if(tips.length){$(tips).find('.footnote_tooltip_continue').remove();body.append('<ol>'+tips.map(e=>'<li>'+$(e).html()+'</li>').join('')+'</ol>');$(tips).remove()}}
   body.find('.footnote_referrer').each((k,e)=>{$(e).replaceWith('<sup>'+esc($(e).text().replace(/\s+/g,''))+'</sup>')});
   body.find('.footnote_backlink').each((k,e)=>{$(e).replaceWith(esc($(e).text().replace(/[^0-9০-৯]/g,'')))});
   const info=$('#post-extra-info').first().text().replace(/\s+/g,' ').trim();
   return{title,body,date:($('meta[property="article:published_time"]').attr('content')||'').slice(0,10),
    author:SOURCES.fm.who($('#the-post .meta-author a,#the-post a.author-name').first().text()||info)}}}
};
const sourceOf=u=>{try{const h=new URL(u).host;return Object.keys(SOURCES).find(k=>SOURCES[k].host===h)||null}catch(e){return null}};

/* ---- পরিষ্কার HTML: শুধু নিরীহ ট্যাগ, কোনো স্ক্রিপ্ট/স্টাইল/ইভেন্ট নয় ---- */
const INLINE={b:'b',strong:'b',i:'i',em:'i',u:'u',sup:'sup',sub:'sub',br:'br'};
const BLOCK={p:'p',h1:'h2',h2:'h2',h3:'h3',h4:'h4',h5:'h4',h6:'h4',ul:'ul',ol:'ol',li:'li',blockquote:'blockquote',table:'table',thead:'thead',tbody:'tbody',tr:'tr',td:'td',th:'th'};
const DROP=new Set(['script','style','noscript','iframe','object','embed','form','input','button','select','textarea','svg','canvas','video','audio','link','meta','ins']);
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escA=s=>esc(s).replace(/"/g,'&quot;');
function clean($,root,base){
 const kids=n=>(n.children||[]).map(walk).join('');
 function walk(n){
  if(n.type==='text')return esc(n.data.replace(/\u00a0/g,' ').replace(/[ \t\r\n]+/g,' '));
  if(n.type!=='tag')return'';
  const t=n.tagName.toLowerCase();if(DROP.has(t))return'';
  if(t==='br')return'<br>';
  if(t==='img'){let src=n.attribs['data-src']||n.attribs.src||'';try{src=new URL(src,base).href}catch(e){src=''}
   return /^https:\/\//.test(src)?`<img src="${escA(src)}" alt="${escA(n.attribs.alt||'')}" loading="lazy">`:''}
  if(t==='a'){const inner=kids(n);let h=n.attribs.href||'';const id=n.attribs.name||n.attribs.id||'';
   const idA=/^_?(ftn|ftnref|edn|ednref)\d+$/.test(id)?` id="x${escA(id)}"`:'';
   const fn=h.match(/#(_?(?:ftn|ftnref|edn|ednref)\d+)$/);
   let own=h.startsWith('#');try{const U=new URL(h,base);own=own||U.host===new URL(base).host;h=U.href}catch(e){h=''}
   if(fn&&own)return`<a${idA} href="#x${fn[1]}">${inner}</a>`;
   if(/^https?:\/\//.test(h)&&inner.trim())return`<a${idA} href="${escA(h)}" rel="noopener nofollow" target="_blank">${inner}</a>`;
   return idA?`<a${idA}>${inner}</a>`:inner}
  if(INLINE[t]){const inner=kids(n);return inner.trim()?`<${INLINE[t]}>${inner}</${INLINE[t]}>`:inner}
  if(BLOCK[t]){const inner=kids(n);return`<${BLOCK[t]}>${inner}</${BLOCK[t]}>`}
  if(t==='div'||t==='section'||t==='article'||t==='center'||t==='figure'){const inner=kids(n);
   return /<(p|h2|h3|h4|ul|ol|blockquote|table|div)\b/.test(inner)?inner:(inner.trim()?`<p>${inner}</p>`:'')}
  return kids(n)}
 let html=kids(root.get(0));
 html=html.replace(/<(p|h2|h3|h4|li|blockquote|td|th)>\s+/g,'<$1>').replace(/\s+<\/(p|h2|h3|h4|li|blockquote|td|th)>/g,'</$1>')
  .replace(/<(p|h2|h3|h4|b|i|u|blockquote)>(?:\s|<br>)*<\/\1>/g,'').replace(/<(p|h2|h3|h4|b|i|u|blockquote)>(?:\s|<br>)*<\/\1>/g,'')
  .replace(/(?:<br>\s*){3,}/g,'<br><br>').replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/g,'');
 if(!/^<(p|h2|h3|h4|ul|ol|blockquote|table)\b/.test(html))html='<p>'+html+'</p>';
 return html}
const textLen=h=>h.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().length;

/* ---- কোন লেখাগুলো আনতে হবে ---- */
function builtinRows(){const s=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');const grab=n=>{const i=s.indexOf('const '+n+'=['),j=s.indexOf('].map(',i);return (0,eval)(s.slice(i+7+n.length,j+1))};
 const QB=s.match(/const QB="([^"]+)"/)[1],AI=s.match(/AI="([^"]+)"/)[1];
 return[...grab('QS').map(x=>[x[0],x[1],x[2].startsWith('http')?x[2]:encodeURI(QB+x[2])]),...grab('FT').map(x=>[x[0],x[1],String(x[2]).startsWith('http')?x[2]:AI+x[2]])]}
function catalogRows(){const w={};const rows=[];for(const f of fs.readdirSync(ROOT).filter(f=>/-catalog-part-\d+\.js$/.test(f)).sort()){new Function('window',fs.readFileSync(path.join(ROOT,f),'utf8'))(w)}
 for(const k of['DAWAH_QUESTIONS_PARTS','DAWAH_FATWAS_PARTS'])for(const c in(w[k]||{}))for(const r of w[k][c])rows.push(r);return rows}

/* ---- সংরক্ষণ ---- */
const buckets=new Map();
const bucketOf=k=>k.slice(-3); /* app.js-এর সাথে এক */
const bucketFile=b=>path.join(OUT,b+'.json');
const loadBucket=b=>{if(!buckets.has(b))buckets.set(b,{dirty:false,data:fs.existsSync(bucketFile(b))?JSON.parse(fs.readFileSync(bucketFile(b),'utf8')):{}});return buckets.get(b)};
/* index.json: যে উৎসের (প্রায়) সব লেখা আনা হয়েছে সেটি full, শুধু বাদ পড়াগুলো missing-এ; অন্য উৎসের আনা লেখার key তালিকা keys-এ */
let WANT={};
const flush=()=>{for(const[b,o]of buckets)if(o.dirty){fs.writeFileSync(bucketFile(b),JSON.stringify(o.data));o.dirty=false}
 const have={};let n=0;for(const f of fs.readdirSync(OUT))if(/^[0-9a-f]{3}\.json$/.test(f)){const o=JSON.parse(fs.readFileSync(path.join(OUT,f),'utf8'));for(const k in o){(have[o[k].s]=have[o[k].s]||new Set()).add(k);n++}}
 const idx={v:1,n,full:{},missing:[],keys:[]};
 for(const s of Object.keys(SOURCES)){const h=have[s]||new Set(),w=WANT[s]||new Set(),miss=[...w].filter(k=>!h.has(k));
  if(w.size&&h.size&&miss.length<=w.size*0.05){idx.full[s]=SOURCES[s].host;idx.missing.push(...miss)}else idx.keys.push(...h)}
 idx.missing.sort();idx.keys.sort();fs.writeFileSync(path.join(OUT,'index.json'),JSON.stringify(idx));return n};

/* ---- Internet Archive (Wayback Machine) ---- */
const wbNorm=u=>{try{let p=new URL(u).pathname;try{p=decodeURIComponent(p)}catch(e){}return p.replace(/\/+$/,'').normalize('NFC')}catch(e){return''}};
/* শিরোনাম/ঠিকানার শব্দ মিলিয়ে দেখা */
const words=t=>[...new Set(String(t).normalize('NFC').split(/[^\u0980-\u09ffA-Za-z0-9]+/).filter(w=>w.length>1))];
/* ঠিকানা মিলিয়ে পাওয়া পাতাটি আসলে প্রবন্ধ নয় (যেমন বইয়ের PDF নামানোর পাতা) */
const notArticle=(title,html)=>/\bpdf\s*$/i.test(title)||html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().length<800;
const sameTitle=(a,b)=>{const A=words(a),B=words(b),n=A.filter(w=>B.includes(w)).length;return n>=Math.min(3,A.length,B.length)&&n>=0.75*Math.min(A.length,B.length)};
/* পুরোনো ঠিকানার সাথে আংশিক মিল: শব্দ এক, বা একটি অন্যটির শুরু (কাটা পড়া স্লাগ) */
const slugLike=(a,b)=>{const A=words(a),B=words(b),hit=A.filter(w=>B.some(v=>v===w||(Math.min(v.length,w.length)>=4&&(v.startsWith(w)||w.startsWith(v))))).length;return hit>=2&&hit>=0.6*Math.min(A.length,B.length)?hit/Math.max(A.length,B.length):0};
/* প্রতিটি পেজের সর্বশেষ সফল (200) কপি: path → {ts,orig} */
async function waybackMap(domain){const map=new Map(),info={rows:0,pages:0};let resume='';
 for(let i=0;i<60;i++){const r=await getSlow('https://web.archive.org/cdx/search/cdx?url='+domain+'&matchType=domain&output=json&fl=timestamp,original&filter=statuscode:200&filter=mimetype:text/html&limit=15000&showResumeKey=true'+(resume?'&resumeKey='+encodeURIComponent(resume):''),180000);
  if(r.status!==200){info.err=r.err||('HTTP '+r.status);break}
  let j;try{j=JSON.parse(r.html)}catch(e){info.err='bad CDX json: '+r.html.slice(0,80);break}
  info.pages++;resume='';
  for(let k=0;k<j.length;k++){const row=j[k];if(!row.length){resume=(j[k+1]||[])[0]||'';break}
   if(row[0]==='timestamp')continue;info.rows++;
   let U;try{U=new URL(row[1])}catch(e){continue}
   if(/\/(amp|feed)\/?$/.test(U.pathname))continue;
   const key=wbNorm(row[1]),q=U.search?1:0,old=map.get(key);
   if(!old||q<old.q||(q===old.q&&row[0]>old.ts))map.set(key,{ts:row[0],orig:row[1],q})}
  if(!resume)break;await sleep(1500)}
 info.urls=map.size;return{map,info}}

/* Internet Archive ধীর এবং বেশি অনুরোধে 429 দেয় বা সংযোগ বন্ধ রাখে: তখন লম্বা বিরতি (Retry-After মেনে) */
async function getSlow(u,ms=90000){let last;for(let a=0;a<3;a++){try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),ms);
   const res=await fetch(u,{headers:{'user-agent':UA},redirect:'follow',signal:ac.signal});const html=await res.text();clearTimeout(tm);
   if(res.status>=500||res.status===429){last='HTTP '+res.status;const ra=parseInt(res.headers.get('retry-after')||'',10);if(a<2)await sleep(1000*Math.min(600,Math.max(ra||0,120*(a+1))));continue}
   return{status:res.status,html,final:res.url}}catch(e){last=(String(e)+' '+String(e&&e.cause||'')).slice(0,120);if(a<2)await sleep(120000*(a+1))}}
 return{status:0,html:'',err:last}}
/* লেখকের নামের জায়গায় ই-মেইল ঠিকানা থাকলে তা দেখানো হয় না (প্রশ্নোত্তরের মতোই) */
const noMail=a=>String(a||'').split(/\s*,\s*/).filter(n=>n&&!/\S+@\S+\.\S+|\[email/.test(n)).join(', ');
/* এক চেষ্টা; 429/5xx/সংযোগ-ব্যর্থতা = busy (পরে আবার চেষ্টা) */
const UA_BOT='DAWAH-X text importer (+https://github.com/Ebrahim-ead/DAWAH-X)';
async function getOnce(u,ms=60000){try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),ms);
  const res=await fetch(u,{headers:{'user-agent':UA_BOT},redirect:'follow',signal:ac.signal});const html=await res.text();clearTimeout(tm);
  if(res.status===429||res.status>=500)return{status:res.status,html:'',busy:true,ra:parseInt(res.headers.get('retry-after')||'',10)||0,err:'HTTP '+res.status};
  return{status:res.status,html,final:res.url}}catch(e){return{status:0,html:'',busy:true,err:(String(e)+' '+String(e&&e.cause||'')).slice(0,100)}}}
/* আগের রানে রাখা From Muslims প্রশ্নোত্তরের ছোট সংশোধন (বারবার চালালেও ফল একই) */
function migrate(){for(const f of fs.readdirSync(OUT)){if(!/^[0-9a-f]{3}\.json$/.test(f))continue;if(!/"s":"(fm|iz)"/.test(fs.readFileSync(path.join(OUT,f),'utf8')))continue;
  const b=loadBucket(f.slice(0,3));for(const k in b.data){const x=b.data[k];
   if(x.s==='iz'&&x.w){if(notArticle(x.t,x.h)){delete b.data[k];b.dirty=true;continue}const h=SOURCES.iz.tidy(x.h,x.t);if(h!==x.h){x.h=h;b.dirty=true}continue}
   if(x.s!=='fm')continue;
   if(/^<p>Filter:<a /.test(x.h)){delete b.data[k];b.dirty=true;continue} /* প্রশ্নের তালিকা-পাতা */
   if(!/\/qna\//.test(x.u)){const h=SOURCES.fm.tidy(x.h),a=SOURCES.fm.who(x.a);
    /* পুরোনো নিয়মে আনা ভিডিও-নির্ভর বা প্রায় ফাঁকা লেখা মুছে আবার আনা হয় (ভিডিওর ঠিকানা তখন বাদ পড়ত) */
    if((x.v||1)<3&&(textLen(h)<600||(/ভিডিও|video/i.test(h)&&!/youtu/.test(h)))){delete b.data[k];b.dirty=true;continue}if(h!==x.h||a!==x.a){x.h=h;x.a=a;b.dirty=true}continue}
   const h=x.h.replace(/^<h3>প্রশ্ন<\/h3>/,'<h2>প্রশ্ন</h2>').replace(/<h3>উত্তর<\/h3>/g,'<h2>উত্তর</h2>').replace(/&lt;img\b[^<]*?&gt;/g,'').replace(/<p>— [^<]*(@|\[email)[^<]*<\/p>/g,'').replace(/^<h2>প্রশ্ন<\/h2><p><\/p>/,'<h2>প্রশ্ন</h2><p>'+esc(x.t)+'</p>');
   const a=[...new Set(x.a.replace(/<img\b[^>]*>/g,' ').split(',').map(v=>v.replace(/\s+/g,' ').trim()).filter(Boolean))].join(', ');
   if(h!==x.h||a!==x.a){x.h=h;x.a=a;b.dirty=true}}}}
async function get(u,ms=30000){let last;for(let a=0;a<3;a++){try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),ms);
   const res=await fetch(u,{headers:{'user-agent':UA,'accept-language':'bn,en;q=0.8'},redirect:'follow',signal:ac.signal});const html=await res.text();clearTimeout(tm);
   if(res.status>=500||res.status===429){last='HTTP '+res.status;await sleep(4000*(a+1));continue}return{status:res.status,html,final:res.url}}catch(e){last=(String(e)+' '+String(e&&e.cause||'')).slice(0,120);await sleep(3000*(a+1))}}
 return{status:0,html:'',err:last}}

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 /* স্থানীয় পরীক্ষা: IMPORT_TEST="<উৎস>,<html ফাইল>,<ঠিকানা>" দিলে শুধু সেই ফাইল থেকে লেখা বের করে দেখায় */
 if(process.env.IMPORT_TEST){const[ts,tf,tu]=process.env.IMPORT_TEST.split(',');const $=cheerio.load(fs.readFileSync(tf,'utf8'));const x=SOURCES[ts].extract($,tu);
  console.log(JSON.stringify({title:x.title,date:x.date,author:x.author,html:x.html!==undefined?x.html:clean($,x.body,tu)},null,1));return}
 const report={at:new Date().toISOString(),request:REQ,done:0,skipped:0,failed:[],bySource:{}};
 /* ping: কোনো ঠিকানা (ফিড/API/সাইটম্যাপ) এই সার্ভার থেকে খোলে কি না দেখার জন্য */
 if(REQ.ping)report.ping=[];
 for(const u of REQ.ping||[]){const r=await get(u);const o={u,status:r.status,len:r.html.length,err:r.err};
  try{const j=JSON.parse(r.html);o.json=Array.isArray(j)?{array:j.length,keys:j[0]&&typeof j[0]==='object'?Object.keys(j[0]).slice(0,30):[]}:{keys:Object.keys(j).slice(0,60)}}
  catch(e){o.head=r.html.replace(/\s+/g,' ').slice(0,160);o.locs=(r.html.match(/<loc>[^<]{0,120}/g)||[]).slice(0,6)}
  report.ping.push(o);await sleep(400)}
 if(REQ.probe)report.probe=[];
 /* probe: অচেনা সাইটের পেজের গঠন দেখার জন্য (texts/_report.json-এ যায়) */
 let WBP=null;
 for(let u of REQ.probe||[]){ /* "wb:<ঠিকানা>" = Internet Archive-এর সর্বশেষ সফল কপি */
  if(u.startsWith('wb:')){const dom=new URL(u.slice(3)).host.replace(/^www\./,'');WBP=WBP||{};WBP[dom]=WBP[dom]||(await waybackMap(dom)).map;const w=WBP[dom].get(wbNorm(u.slice(3)));if(!w){report.probe.push({u,status:'not archived'});continue}u='https://web.archive.org/web/'+w.ts+'id_/'+w.orig}
  let r={};for(let a=0;a<(REQ.probeTries||10);a++){r=await getOnce(u,120000);if(!r.busy)break;await sleep(Math.max(45000,1000*Math.min(r.ra||0,180)))}
  r.html=r.html||'';const $=cheerio.load(r.html);
  /* ভিডিওর খোঁজ (iframe মুছে ফেলার আগে): কোন উপাদানে, কোন বৈশিষ্ট্যে ভিডিওর ঠিকানা আছে */
  const vids={ids:[...new Set(r.html.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)[\w-]{6,20}/g)||[])].slice(0,8),
   at:$('iframe,[data-video],[data-video-id],[data-src*="youtu"],[data-lazy-src*="youtu"],a[href*="youtu"],meta[property^="og:video"]').toArray().slice(0,8).map(e=>e.tagName+'.'+(e.attribs.class||'')+' '+JSON.stringify(Object.fromEntries(Object.entries(e.attribs).filter(([k])=>/^(src|href|content|data-)/.test(k)).map(([k,v])=>[k,v.slice(0,100)])))+' < '+$(e).parents().toArray().slice(0,5).map(p=>p.tagName+(p.attribs.id?'#'+p.attribs.id:'')+(p.attribs.class?'.'+p.attribs.class.trim().split(/\s+/).slice(0,3).join('.'):'')).join(' < '))};
  $('script,style,noscript,svg,iframe').remove();
  const sig=e=>e.tagName+(e.attribs.id?'#'+e.attribs.id:'')+(e.attribs.class?'.'+e.attribs.class.trim().split(/\s+/).slice(0,4).join('.'):'');
  const walk=(e,d)=>$(e).children().toArray().slice(0,REQ.probeKids||22).map(c=>{const t=$(c).text().replace(/\s+/g,' ').trim();const o={s:sig(c),n:t.length,t:t.slice(0,40)};if(d<(REQ.probeDepth||4)&&t.length>200&&$(c).children().length)o.c=walk(c,d+1);return o});
  const o={u,status:r.status,err:r.err,final:r.final,len:r.html.length,title:$('title').text().trim().slice(0,80),h1:$('h1').toArray().slice(0,3).map(h=>({t:$(h).text().trim().slice(0,50),path:$(h).parents().toArray().slice(0,6).map(sig)}))};
  let best=null;$('h1').first().parents().each((i,p)=>{if(!best&&$(p).text().replace(/\s+/g,' ').length>800)best=p});
  if(!best)best=$('main,article,body').first().get(0);if(best){o.best=sig(best);o.tree=walk(best,0)}
  o.time=$('time').toArray().slice(0,3).map(t=>sig(t)+' '+$(t).text().trim().slice(0,30)+' '+(t.attribs.datetime||''));
  o.meta=['og:title','article:published_time','author','og:site_name'].map(n=>n+'='+($('meta[property="'+n+'"],meta[name="'+n+'"]').attr('content')||'').slice(0,50));
  o.vids=vids;
  if(REQ.sel)o.sel=REQ.sel.map(q=>[q,$(q).length,...$(q).toArray().slice(0,2).map(e=>sig(e)+' > '+$(e).children().toArray().slice(0,6).map(sig).join(' , ')+' :: '+$(e).text().replace(/\s+/g,' ').trim().slice(0,110))]);
  /* probeHtml: সবচেয়ে উপযুক্ত অংশের (বা দেওয়া সিলেক্টরের) HTML-কাঠামো — লেখা ছেঁটে, শুধু class/id/href রেখে */
  if(REQ.probeHtml){const root=typeof REQ.probeHtml==='string'?$(REQ.probeHtml).first().get(0):best;const cut=REQ.probeText||24;
   const sk=n=>{if(n.type==='text'){const t=n.data.replace(/\s+/g,' ').trim();return t?(t.length>cut?t.slice(0,cut)+'…('+t.length+')':t):''}if(n.type!=='tag')return'';
    const at=['id','class','href','datetime','itemprop','rel'].filter(k=>n.attribs[k]).map(k=>' '+k+'="'+n.attribs[k].slice(0,k==='href'?40:90)+'"').join('');
    return'<'+n.tagName+at+'>'+(n.children||[]).map(sk).join('')+'</'+n.tagName+'>'};
   const all=root?sk(root):'',lim=REQ.probeLen||40000;o.html=all.length>lim?all.slice(0,lim*0.6)+' ⋯⋯ '+all.slice(-lim*0.4):all;o.htmlLen=all.length}
  /* probeRaw: ["<সিলেক্টর>",শুরু,দৈর্ঘ্য] — মূল HTML-এর একটি টুকরো হুবহু (ফাঁকা জায়গা, লাইন-ভাঙা সহ) */
  if(Array.isArray(REQ.probeRaw)){const raw=cheerio.load(r.html)(REQ.probeRaw[0]).first();const h=raw.length?cheerio.load(r.html).html(raw):'';o.rawLen=h.length;o.raw=h.slice(REQ.probeRaw[1]||0,(REQ.probeRaw[1]||0)+(REQ.probeRaw[2]||6000));
   o.css=(r.html.match(/[^{}]*\.post-body[^{}]*\{[^}]*\}/g)||[]).slice(0,30).map(x=>x.replace(/\s+/g,' ').trim().slice(0,200));o.links=[...r.html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/g)].map(m=>m[0].slice(0,200)).slice(0,12)}
  report.probe.push(o)}
 migrate(); /* তালিকা তৈরির আগে, যাতে মুছে দেওয়া রেকর্ড এই রানেই আবার আনা হয় */
 const want=new Set(REQ.hosts||Object.keys(SOURCES)),seen=new Set(),queue={};
 const rows=REQ.set==='all'?[...builtinRows(),...catalogRows()]:REQ.set==='builtin'?builtinRows():[];
 for(const r of[...builtinRows(),...catalogRows()]){const s=sourceOf(r[2]);if(s)(WANT[s]=WANT[s]||new Set()).add(keyOfUrl(r[2]))}
 for(const r of rows){const s=sourceOf(r[2]);if(!s||!want.has(s)||SOURCES[s].manual)continue;const k=keyOfUrl(r[2]);if(seen.has(k))continue;seen.add(k);
  if(loadBucket(bucketOf(k)).data[k]){report.skipped++;continue}(queue[s]=queue[s]||[]).push({k,s,c:r[0],t:r[1],u:r[2]})}
 const WB={};
 for(const s of Object.keys(SOURCES))if(SOURCES[s].wayback&&(queue[s]||REQ.wayback)){const cf=path.join(OUT,'_wayback-'+s+'.json');
  if(fs.existsSync(cf)&&!REQ.wayback){WB[s]=new Map(Object.entries(JSON.parse(fs.readFileSync(cf,'utf8'))).map(([k,v])=>[k.normalize('NFC'),{ts:v[0],orig:v[1]}]));(report.wayback=report.wayback||{})[s]={cached:WB[s].size};continue}
  const w=await waybackMap(SOURCES[s].wayback);WB[s]=w.map;
  const all=[...new Set([...builtinRows(),...catalogRows()].map(r=>r[2]).filter(u=>sourceOf(u)===s))];
  if(SOURCES[s].fuzzy){const paths=[...w.map.keys()];w.info.fuzzy=[];for(const u of all){const k=wbNorm(u);if(/\?/.test(u)||w.map.has(k)||/^\/question\//.test(k))continue;
    let best='',sc=0;for(const p2 of paths){if((p2.match(/\//g)||[]).length!==1)continue;const v=slugLike(k,p2);if(v>sc){sc=v;best=p2}}
    if(best){w.map.set(k,w.map.get(best));w.info.fuzzy.push([k,best])}}}
  const hit=all.filter(u=>!/\?/.test(u)&&w.map.has(wbNorm(u)));
  w.info.catalog=all.length;w.info.matched=hit.length;w.info.newest=hit.map(u=>w.map.get(wbNorm(u)).ts.slice(0,4)).reduce((o,y)=>(o[y]=(o[y]||0)+1,o),{});
  w.info.qna=[all.filter(u=>/\/qna\/./.test(u)).length,hit.filter(u=>/\/qna\/./.test(u)).length];w.info.unmatched=all.filter(u=>!hit.includes(u)).slice(0,8).map(u=>{try{return decodeURI(u)}catch(e){return u}});(report.wayback=report.wayback||{})[s]=w.info;
  if(!w.info.err&&hit.length)fs.writeFileSync(cf,JSON.stringify(Object.fromEntries(hit.map(u=>{const k=wbNorm(u),v=w.map.get(k);return[k,[v.ts,v.orig]]}))))}
 /* ts: {"<পাতার ঠিকানা>":"<১৪ অঙ্কের সময়>"} — CDX সূচিতে এখনো ওঠেনি এমন নতুন কপি সরাসরি ধরিয়ে দেওয়া যায় */
 if(REQ.ts)for(const u of Object.keys(REQ.ts)){const s=sourceOf(u);if(s&&WB[s]&&/^\d{14}$/.test(REQ.ts[u]))WB[s].set(wbNorm(u),{ts:REQ.ts[u],orig:u,pin:true})}
 /* api: {"fm":[1,2,[3,"<সময়>"]]} — সাইটের REST API-র পাতাগুলোর Internet Archive কপি থেকে লেখা নেওয়া (এক কপিতে অনেক লেখা)।
    আগে থেকে রাখা লেখার সাথে দৈর্ঘ্য মিলিয়ে দেখা হয়; না মিললে এ পথে কিছুই নেওয়া হয় না। লেখকের নাম: API শুধু লেখকের নম্বর দেয়,
    তাই আগে আনা (এক লেখকের) লেখা থেকে নম্বর→নাম জেনে নেওয়া হয়; কোনো নম্বরের নাম জানা না থাকলে লেখাটি সাধারণ পথের জন্য থেকে যায় */
 if(REQ.api)for(const s of Object.keys(REQ.api)){const src=SOURCES[s];if(!src||!src.api||!queue[s])continue;
  const info=(report.api=report.api||{})[s]={pages:0,posts:0,done:0,errs:[]},posts=new Map();
  for(const pg of REQ.api[s]){const n=Array.isArray(pg)?pg[0]:pg,ts=Array.isArray(pg)?pg[1]:'';let r={};
   for(let a=0;a<8;a++){r=await getOnce('https://web.archive.org/web/'+(ts||'20301231235959')+'id_/'+src.api(n),240000);if(!r.busy)break;await sleep(30000)}
   const m=/\/web\/(\d{14})id_\//.exec(r.final||'');let arr=null;if(r.status===200&&m)try{arr=JSON.parse(r.html)}catch(e){}
   if(!Array.isArray(arr)){info.errs.push([n,r.status||0,(r.err||'').slice(0,60)]);await sleep(src.delay);continue}
   info.pages++;for(const p of arr)if(p&&p.link&&p.content)posts.set(wbNorm(p.link),{p,w:m[1]});await sleep(src.delay)}
  info.posts=posts.size;
  /* ঠিকানা বদলে যাওয়া লেখা: ক্যাটালগের শিরোনাম হুবহু মিললে (এবং একটিই মিললে) সেটিই ধরা হয়; প্রশ্নোত্তরের ঠিকানায় নয় */
  const nt=t=>String(t||'').normalize('NFC').replace(/[^\p{L}\p{N}]+/gu,'').toLowerCase(),byTitle=new Map();
  for(const o of posts.values()){const k=nt(cheerio.load('<i>'+((o.p.title&&o.p.title.rendered)||'')+'</i>')('i').text());if(k.length>=8)byTitle.set(k,byTitle.has(k)?null:o)}
  const find=it=>posts.get(wbNorm(it.u))||(/\/qna\//.test(it.u)?null:(byTitle.get(nt(it.t))||null));
  const make=o=>{const p=o.p,$=cheerio.load('<html><head><meta property="article:published_time" content="'+esc(String(p.date_gmt||p.date||''))+'"></head><body><div id="the-post"><h1 class="post-title entry-title">'+((p.title&&p.title.rendered)||'')+'</h1><div class="entry-content">'+((p.content&&p.content.rendered)||'')+'</div></div></body></html>');
   const x=src.extract($,p.link);let html=x.body&&x.body.length?clean($,x.body,p.link):'';if(src.tidy)html=src.tidy(html);return{title:(x.title||'').replace(/\s+/g,' ').trim(),html,date:(x.date||'').trim()}};
  const cat=new Map();for(const r of[...builtinRows(),...catalogRows()])if(sourceOf(r[2])===s)cat.set(wbNorm(r[2]),keyOfUrl(r[2]));
  const names={},ratios=[];let stored=0;
  for(const[pth,o]of posts){const k=cat.get(pth);if(!k)continue;const rec=loadBucket(bucketOf(k)).data[k];if(!rec)continue;stored++;
   const ids=o.p.coauthors||[];if(ids.length===1&&rec.a){const c=(names[ids[0]]=names[ids[0]]||{});c[rec.a]=(c[rec.a]||0)+1}
   if(ratios.length<80){try{ratios.push(+(textLen(make(o).html)/Math.max(1,textLen(rec.h))).toFixed(3))}catch(e){ratios.push(0)}}}
  const given=REQ.apiNames||{},who=id=>{if(given[id])return given[id];const c=names[id];return c?Object.keys(c).sort((a,b)=>c[b]-c[a])[0]:''};
  const sorted=ratios.slice().sort((a,b)=>a-b),med=sorted[sorted.length>>1]||0,near=ratios.filter(v=>v>0.9&&v<1.1).length;
  info.stored=stored;info.authors=Object.keys(names).length;info.check={n:ratios.length,median:med,near,min:sorted[0],max:sorted[sorted.length-1]};
  info.ok=!!REQ.apiForce||(ratios.length>=10&&med>0.97&&med<1.03&&near>=0.7*ratios.length);
  if(info.ok)queue[s]=queue[s].filter(it=>{const o=find(it);if(!o)return true;if(!posts.get(wbNorm(it.u)))info.byTitle=(info.byTitle||0)+1;
   const ids=o.p.coauthors||[],au=ids.map(who);if(!ids.length||au.some(a=>!a)){info.noAuthor=(info.noAuthor||0)+1;(info.unknown=info.unknown||{})[ids.filter(i=>!who(i)).join('+')||'none']=o.p.link;return true}
   try{const y=make(o);if(!y.title||textLen(y.html)<40)return true;
    const b=loadBucket(bucketOf(it.k));b.data[it.k]={u:it.u,s,c:it.c,t:y.title,l:it.t,d:y.date.slice(0,10),a:noMail([...new Set(au)].join(', ')),h:y.html,w:o.w};if(src.ver)b.data[it.k].v=src.ver;b.dirty=true;info.done++;report.done++;return false}
   catch(e){info.errs.push([it.u.slice(-40),String(e).slice(0,60)]);return true}});
  flush()}
 const deadline=Date.now()+(REQ.minutes||300)*60000,limit=REQ.limit||Infinity;let lastFlush=Date.now();
 /* প্রতি ২ মিনিটে ফাইলে লেখা; প্রতি REQ.push (ডিফল্ট ৩০) মিনিটে শাখায় জমা, যাতে লম্বা রানের মাঝপথের ফল হারিয়ে না যায় */
 let lastPush=Date.now();
 const tick=()=>{if(Date.now()-lastFlush>120000){lastFlush=Date.now();flush()}
  if(Date.now()-lastPush>(REQ.push||30)*60000){lastPush=Date.now();if(!process.env.GITHUB_ACTIONS||!process.env.GITHUB_REF_NAME)return;
   try{report.total=flush();report.partial=new Date().toISOString();fs.writeFileSync(path.join(OUT,'_report.json'),JSON.stringify(report,null,1));
    /* rebase-এর জন্যও পরিচয় লাগে, তাই আগে config; rebase আটকে গেলে বাতিল করে পরের বার আবার চেষ্টা */
    require('child_process').execSync('git config user.name "github-actions[bot]" && git config user.email "41898282+github-actions[bot]@users.noreply.github.com" && git add texts && (git diff --cached --quiet || git commit -q -m "Import library texts (automated, partial)") && (git pull -q --rebase -X theirs origin "$GITHUB_REF_NAME" || (git rebase --abort; exit 1)) && git push -q origin "HEAD:$GITHUB_REF_NAME"',{cwd:ROOT,stdio:'ignore',timeout:300000})}
   catch(e){report.checkpointErr=String(e).slice(0,160)}}};
 await Promise.all(Object.keys(queue).map(async s=>{const src=SOURCES[s],st=report.bySource[s]={queued:queue[s].length,done:0,failed:0};let streak=0;
  let list=queue[s].slice(0,(REQ.limits&&REQ.limits[s])||limit);
  /* wayback উৎসে আর্কাইভ ব্যস্ত (429/সংযোগ নেই) থাকলে লেখাটি পরের পাকে আবার চেষ্টা হয়; গতি সবসময় ধীর (delay) */
  for(let pass=0;list.length&&pass<500;pass++){const again=[];let stop=false;st.passes=pass+1;
   for(let n=0;n<list.length;n++){const it=list[n];if(Date.now()>deadline||streak>=25){again.push(...list.slice(n));stop=true;break}
    tick();
    let r,fail='';
    if(src.wayback){const w=!/\?/.test(it.u)&&WB[s].get(wbNorm(it.u));const busyWait=x=>sleep(Math.max(src.delay,1000*Math.min(x.ra||0,180)));const SAVE=REQ.save===true||(Array.isArray(REQ.save)&&REQ.save.includes(s));
     /* save: যে পাতার কপি নেই (বা কপিটি অকেজো), তার সর্বশেষ কপি চাওয়া হয়; না থাকলে Internet Archive-কে পাতাটি সংরক্ষণ করতে বলা হয় ("Save Page Now") এবং পরের পাকে সেই নতুন কপি পড়া হয় */
     if(SAVE&&!/\?/.test(it.u)&&(!w||it.fresh)){
      const L=await getOnce('https://web.archive.org/web/20301231235959id_/'+it.u,90000),m=/\/web\/(\d{14})id_\//.exec(L.final||'');
      if(L.busy){st.busy=(st.busy||0)+1;if(L.err)st.lastErr=L.err;again.push(it);await busyWait(L);continue}
      if(L.status===200&&m&&!(it.fresh&&m[1]<=it.fresh)){r=L;r.final=it.u;r.w=m[1]}
      else if((it.saves||0)>=3){st.failed++;st.unarchived=(st.unarchived||0)+1;if(report.failed.length<400)report.failed.push([it.u,'not archived (save: '+(it.lastSave||'')+')']);await sleep(src.delay);continue}
      else{it.saves=(it.saves||0)+1;await sleep(src.delay);const S=await getOnce('https://web.archive.org/save/'+it.u,180000);it.lastSave=String(S.status)+(S.err?' '+S.err.slice(0,40):'');st.saves=(st.saves||0)+1;st.lastSave=it.lastSave;
       if(S.status===429)it.saves--;again.push(it);await busyWait(S);continue}}
     else if(!w){st.failed++;st.unarchived=(st.unarchived||0)+1;if(report.failed.length<400)report.failed.push([it.u,'not archived']);continue}
     else r=await getOnce('https://web.archive.org/web/'+w.ts+'id_/'+w.orig);
     if(SAVE&&w&&!it.fresh&&r.status===404){it.fresh=w.ts;again.push(it);await sleep(src.delay);continue} /* সংরক্ষিত কপিটি নিজেই "পাওয়া যায়নি" পাতা: নতুন কপি চাওয়া হবে */
     if(r.busy){st.busy=(st.busy||0)+1;if(r.ra)st.retryAfter=Math.max(st.retryAfter||0,r.ra);if(r.err)st.lastErr=r.err;again.push(it);await sleep(Math.max(src.delay,1000*Math.min(r.ra||0,180)));continue}
     if(r.status===200&&/<title>\s*(Just a moment|Attention Required)/i.test(r.html.slice(0,3000)))r={status:0,html:'',err:'challenge page in archive'};
     else if(r.status===200){r.final=it.u;r.w=r.w||w.ts;r.pin=!!(w&&w.pin)}}
    else r=await get(it.u);
    if(r.status!==200)fail=r.err||('HTTP '+r.status);
    else{try{const $=cheerio.load(r.html);const x=src.extract($,r.final||it.u);let html=x.html!==undefined?x.html:(x.body&&x.body.length?clean($,x.body,r.final||it.u):'');if(src.tidy)html=src.tidy(html,(x.title||'').replace(/\s+/g,' ').trim());const title=(x.title||'').replace(/\s+/g,' ').trim();
      if(!title||textLen(html)<40)fail='no content';
      else if(src.fuzzy&&!r.pin&&!sameTitle(title,it.t))fail='title mismatch: '+title.slice(0,70);
      else if(src.fuzzy&&notArticle(title,html))fail='not the article (download page): '+title.slice(0,70);
      else{const b=loadBucket(bucketOf(it.k));b.data[it.k]={u:it.u,s,c:it.c,t:title,l:it.t,d:(x.date||'').trim(),a:noMail((x.author||'').replace(/\s+/g,' ').trim()),h:html};if(r.w)b.data[it.k].w=r.w;if(src.ver)b.data[it.k].v=src.ver;b.dirty=true;st.done++;report.done++;streak=0}}catch(e){fail='parse: '+String(e).slice(0,80)}}
    if(fail){st.failed++;if(!src.wayback)streak++;if(report.failed.length<400)report.failed.push([it.u,fail])}
    await sleep(src.delay)}
   list=again;if(stop||!src.wayback)break}
  if(src.wayback)st.left=list.length;
  if(streak>=25)st.stopped='25 failures in a row'}));
 delete report.partial;report.total=flush();fs.writeFileSync(path.join(OUT,'_report.json'),JSON.stringify(report,null,1));
 if(fs.existsSync(path.join(OUT,'_probe.json')))fs.unlinkSync(path.join(OUT,'_probe.json'));
 console.log(JSON.stringify({done:report.done,failed:report.failed.length,total:report.total,bySource:report.bySource}))})();
