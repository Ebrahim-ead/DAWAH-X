'use strict';
// Parse iHadis's public rendered text; placeholders are never treated as data.
const cheerio=require('cheerio'),crypto=require('node:crypto');
const ascii=s=>String(s||'').replace(/[০-৯]/g,c=>String(c.charCodeAt(0)-0x9e6));
const tidy=s=>String(s||'').trim();
function paragraphs($,el){const spans=$(el).children('span');return spans.length?spans.map((_,s)=>tidy($(s).text())).get().filter(Boolean).join('\n\n'):tidy($(el).text())}
function index(html,slug){
 const $=cheerio.load(html), title=tidy($('main h1').first().text()), head=ascii($('main h1').first().parent().text());
 const m=head.match(/মোট অধ্যায়\s*(\d+).*?মোট হাদিস\s*(\d+)/u);
 if(!title||!m)throw Error('Missing book metadata '+slug);
 const chapters=new Map();$('main a[href]').each((_,a)=>{const link=$(a).attr('href'),match=link.match(new RegExp('^/'+slug+'/(\\d+)$'));if(!match)return;
  const id=+match[1], name=tidy($(a).find('p.line-clamp-1').first().text());if(!name)throw Error('Missing chapter title '+link);if(chapters.has(id)&&chapters.get(id).name!==name)throw Error('Conflicting chapter '+link);chapters.set(id,{id,name});});
 if(chapters.size!==+m[1])throw Error('Chapter count mismatch '+slug+' '+chapters.size+'/'+m[1]);
 return {slug,title,expected:+m[2],chapters:[...chapters.values()].sort((a,b)=>a.id-b.id)};
}
function extractCard($,card,slug,expectedId){
 const header=tidy(card.find('h3 a[href]').first().text() || card.find('h2,h3').first().text()), n=ascii(header).match(/:\s*(?:(\d+)\s*\/\s*)?(\d+)(?:\s*[-–]\s*(?:(\d+)\s*\/\s*)?(\d+))?\s*$/);if(!n)throw Error('Missing displayed number '+slug+':'+expectedId);
 const grade=tidy(card.find('button[style] span').first().text()), narr=tidy(card.find('h4').first().text());
 const ar=card.find('p[dir="rtl"]').map((_,p)=>paragraphs($,p)).get().filter(Boolean).join('\n\n');
 const bnp=card.find('h4').length ? card.find('h4').first().parent().find('p').first() : card.find('p.font-normal').first(),bn=bnp.length?paragraphs($,bnp):'';
 const notes=[];card.find('p').each((_,p)=>{const q=$(p);if(q.attr('dir')==='rtl'||p===bnp[0]||q.closest('h3').length||q.attr('class')?.includes('tablet:hidden')||q.closest('button').length||q.closest('a').length)return;const t=paragraphs($,p);if(t)notes.push(t)});
 if(!bn||!grade)throw Error('Missing translation or grade '+slug+':'+expectedId);
 const row={id:expectedId,number:+n[2],bn,ar,narrator:narr,grade,notes:notes.join('\n\n')};
 if(n[1]||n[4])row.sourceRef=tidy(header);
 if(n[4]){if(+n[2]!==expectedId || +n[4]<=expectedId || +n[4]-expectedId>20)throw Error('Ambiguous displayed range '+slug+':'+header);row.rangeEnd=+n[4]}
 return row;
}
function chapter(html,slug,id){
 const $=cheerio.load(html), rows=[], missing=[];
 $('[id^="hadith-"]').each((_,el)=>{const card=$(el),url=card.find('h3 a[href]').first().attr('href');const match=(url||'').match(new RegExp('^/'+slug+'/hadith/(\\d+)$'));if(!match)throw Error('Invalid hadith link '+slug+'/'+id+' '+url);const n=+match[1];
  const header=ascii(tidy(card.find('h3 a[href]').first().text())),range=header.match(/:\s*(?:(\d+)\s*\/\s*)?(\d+)\s*[-–]\s*(?:(\d+)\s*\/\s*)?(\d+)\s*$/);
  if(range){if(+range[2]!==n||+range[4]<=n||+range[4]-n>20)throw Error('Ambiguous displayed range '+slug+':'+header);for(let v=n+1;v<=+range[4];v++)missing.push(v)}
  if(!card.find('p.font-normal').length)missing.push(n);else rows.push(extractCard($,card,slug,n));
 });
 if(!rows.length&&!missing.length)throw Error('No hadith cards '+slug+'/'+id);
 return {rows,missing,sha256:crypto.createHash('sha256').update(html).digest('hex')};
}
function single(html,slug,id){
 const $=cheerio.load(html), cards=$('[id^="hadith-"]');if(cards.length!==1)throw Error('Unexpected single card '+slug+':'+id);
 const got=tidy($('main h1').first().text());if(!new RegExp('হাদিস\\s+(?:\\d+\\s*/\\s*)?'+id+'(?:\\s|$)').test(ascii(got)))throw Error('Wrong single page '+slug+':'+id+' '+got);
 return extractCard($,cards.first(),slug,id);
}
module.exports={index,chapter,single};
