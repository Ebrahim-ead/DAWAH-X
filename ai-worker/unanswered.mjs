// No IP, history, user ID, answer, sources, or exact timestamp is written.
// Text can still identify a person: masking is best effort, not anonymization.
const RETENTION_SECONDS=30*24*60*60;
function redact(question){
 return [...String(question).replace(/[\u0000-\u001f\u007f]/g,' ')
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[ইমেইল সরানো হয়েছে]')
  .replace(/(?:https?:\/\/|www\.)[^\s]+/gi,'[লিংক সরানো হয়েছে]')
  .replace(/\+?[0-9০-৯][0-9০-৯\s().-]{7,}[0-9০-৯]/g,m=>(m.match(/[0-9০-৯]/g)||[]).length>=9?'[নম্বর সরানো হয়েছে]':m)
  .replace(/\s+/g,' ').trim()].slice(0,1000).join('');
}
// Only called after a complete search (not an outage), never for a follow-up,
// normal chat, explicit number mismatch, verification failure, or model error.
export function queueUnanswered(env,ctx,question,reason,ip){
 if(!env?.UNANSWERED_QUESTIONS||typeof env.UNANSWERED_QUESTIONS.put!=='function'||typeof env.UNANSWERED_LIMITER?.limit!=='function'||typeof ctx?.waitUntil!=='function'||!ip)return;
 if(!['no_candidates','model_abstained'].includes(reason))return;
 const text=redact(question);if(!text)return;
 try{
  const day=new Date().toISOString().slice(0,10),key='unanswered/'+day+'/'+crypto.randomUUID();
  const record=JSON.stringify({version:1,day,reason,question:text,search:'bounded'});
  const task=Promise.resolve().then(async()=>{const decision=await env.UNANSWERED_LIMITER.limit({key:ip});if(decision?.success)await env.UNANSWERED_QUESTIONS.put(key,record,{expirationTtl:RETENTION_SECONDS})}).catch(()=>console.warn('unanswered-storage-failed')); 
  ctx.waitUntil(task);
 }catch(_){console.warn('unanswered-storage-failed')}
}
