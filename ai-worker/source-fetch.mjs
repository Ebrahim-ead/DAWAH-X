// The snapshots are public repository commits, not user-provided URLs. They
// are an outage fallback and can lag behind the published sites. Keep them in
// sync with reviewed site/corpus updates; evidence from them is labelled.
export const EAD_SNAPSHOT='c2ade0610877453c854e10db8e80a9c6864bf0f3';
export const SITE_SNAPSHOT='9606abde90c838adcd017a79f94fde23fb46433a';
function mirrorFor(url){
 let u;try{u=new URL(url)}catch(_){return null}
 if(u.origin!=='https://ebrahim-ead.github.io'||u.search||u.hash)return null;
 const ead=u.pathname.match(/^\/ead\/(assets\/(?:search-ayahs\.js|quran\/data\/(?:index\.json|suras\/\d{1,3}\.json)|hadith\/data\/(?:index\.json|(?:bukhari|muslim|abu-dawud|tirmidhi|nasai|ibn-majah|mishkat)\/\d{1,3}\.json)))$/);
 if(ead)return 'https://raw.githubusercontent.com/Ebrahim-ead/ead/'+EAD_SNAPSHOT+'/'+ead[1];
 const site=u.pathname.match(/^\/DAWAH-X\/((?:texts\/[a-f0-9]{3}\.json|hadith-search\/(?:meta|\d{2})\.json|(?:index|questions|fatwa|about|services|contact|policy|islamic-books)\.html|islamic-books-catalog\.js))$/);
 return site?'https://raw.githubusercontent.com/Ebrahim-ead/DAWAH-X/'+SITE_SNAPSHOT+'/'+site[1]:null;
}
// Do not log URLs, questions, exception text, IP addresses or response bodies.
// Fixed codes aid diagnosis in Worker logs without recording user content.
function report(url,kind,reason,trace){const category=url.includes('/ead/assets/quran/')||url.endsWith('/assets/search-ayahs.js')?'quran':url.includes('/hadith')||url.includes('/scripture-hadith-')?'hadith':url.includes('/texts/')?'articles':'pages';console.warn('assistant-source',category,kind,reason);if(trace?.diagnostics&&trace.diagnostics.length<12)trace.diagnostics.push({category,origin:kind,reason})}
export async function sourceText(url,maxBytes,mirrors){
 return new TextDecoder().decode(await sourceBytes(url,maxBytes,mirrors));
}
export async function sourceBytes(url,maxBytes,mirrors){
 const mirror=mirrorFor(url);
 try{const result=await readSource(url,maxBytes,2);mirrors?.delete(url);return result}catch(error){
  if(!mirror)throw error;
  report(url,'published',error?.code||'network',mirrors);
  if(error?.code==='size'||(/^http-4/.test(error?.code||'')&&!['http-403','http-408','http-429'].includes(error.code)))throw error;
  try{const result=await readSource(mirror,maxBytes,1);if(mirrors)mirrors.add(url);return result}
  catch(fallbackError){report(url,'snapshot',fallbackError?.code||'network',mirrors);throw fallbackError}
 }
}
function sourceError(code){const e=Error('Source unavailable');e.code=code;return e}
async function readSource(url,maxBytes,attempts){
 for(let attempt=0;attempt<attempts;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   let response;
   try{response=await fetch(url,{signal:controller.signal,redirect:'manual',headers:{'User-Agent':'DAWAH-X-Assistant/1.0 (+https://ebrahim-ead.github.io/DAWAH-X/)'}})}
   catch(error){if(attempt+1<attempts)continue;throw sourceError(controller.signal.aborted?'timeout':'network')}
   // Workers do not implement redirect: 'error'. Manual mode plus explicit
   // rejection keeps the fixed-source allowlist from following redirects.
   if(response.redirected)throw sourceError('redirect');
   if(!response.ok){
    const transient=response.status===408||response.status>=500;
    if(transient&&attempt+1<attempts){try{await response.body?.cancel()}catch(_){}continue}
    throw sourceError('http-'+response.status);
   }
   if(!response.body)throw sourceError('empty');
   const reader=response.body.getReader(),parts=[];let size=0;
   try{
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
     if(size>maxBytes){try{await reader.cancel()}catch(_){}const error=sourceError('size');error.message='Source too large';throw error}
     parts.push(value);
    }
   }catch(error){if(attempt+1<attempts&&error?.code!=='size')continue;if(error?.code==='size')throw error;throw sourceError(controller.signal.aborted?'timeout':'stream')}
   const bytes=new Uint8Array(size);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.length}
   return bytes;
  }finally{clearTimeout(timer);controller.abort()}
 }
 throw sourceError('network');
}
