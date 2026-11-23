// Read only trusted fixed URLs, with bounded memory/time and one retry for
// transient failures. Parsing and content-validation errors are never retried.
export async function sourceText(url,maxBytes){
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   let response;
   try{response=await fetch(url,{signal:controller.signal,redirect:'error'})}
   catch(error){if(attempt===0)continue;throw error}
   if(!response.ok){
    const transient=response.status===408||response.status>=500;
    if(transient&&attempt===0){try{await response.body?.cancel()}catch(_){}continue}
    throw Error('Source unavailable');
   }
   if(!response.body)throw Error('Source unavailable');
   const reader=response.body.getReader(),parts=[];let size=0;
   try{
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
     if(size>maxBytes){try{await reader.cancel()}catch(_){}const error=Error('Source too large');error.name='SourceTooLarge';throw error}
     parts.push(value);
    }
   }catch(error){if(attempt===0&&error?.name!=='SourceTooLarge')continue;throw error}
   const bytes=new Uint8Array(size);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.length}
   return new TextDecoder().decode(bytes);
  }finally{clearTimeout(timer);controller.abort()}
 }
 throw Error('Source unavailable');
}
