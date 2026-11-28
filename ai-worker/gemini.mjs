// Gemini is opt-in at deployment and uses one server-side secret. Never log
// requests, responses, provider error bodies, or credentials.
export const GEMINI_MODEL='gemini-2.5-flash-lite';
const URL='https://generativelanguage.googleapis.com/v1beta/models/'+GEMINI_MODEL+':generateContent';
const UNAVAILABLE=()=>new Error('Gemini unavailable');
const BLOCKED=()=>Object.assign(new Error('Gemini declined request'),{safetyBlocked:true});

export function answerAI(env,primary){
 if(env.GEMINI_ENABLED!=='true'||typeof env.gem!=='string'||!env.gem.trim())return env.AI;
 return {async run(model,args){
  if(model!==primary)return env.AI.run(model,args);
  const system=[],contents=[];
  for(const message of args.messages){
   if(message.role==='system'){system.push(message.content);continue}
   const role=message.role==='assistant'?'model':'user',last=contents.at(-1);
   // Gemini expects consecutive turns with different roles.
   if(last?.role===role)last.parts[0].text+='\n\n'+message.content;
   else contents.push({role,parts:[{text:message.content}]});
  }
  const body={systemInstruction:{parts:[{text:system.join('\n\n')}]},contents,generationConfig:{maxOutputTokens:args.max_tokens}};
  let response,data;
  try{
   response=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.gem},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw UNAVAILABLE();
   // Bound the JSON response before parsing. Do not print provider content.
   const reader=response.body?.getReader();if(!reader)throw UNAVAILABLE();
   const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw UNAVAILABLE()}chunks.push(value)}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}data=JSON.parse(new TextDecoder().decode(bytes));
  }catch(_){throw UNAVAILABLE()}
  if(data?.promptFeedback?.blockReason)throw BLOCKED();
  const candidate=data?.candidates?.[0],reason=candidate?.finishReason;
  if(reason&&!['STOP','MAX_TOKENS'].includes(reason))throw BLOCKED();
  const parts=candidate?.content?.parts;
  if(!Array.isArray(parts))throw UNAVAILABLE();
  const text=parts.filter(p=>p&&p.thought!==true&&typeof p.text==='string').map(p=>p.text).join('');
  if(!text.trim())throw UNAVAILABLE();
  return {response:text,...(reason==='MAX_TOKENS'?{finish_reason:'length'}:{}),usage:{completion_tokens:data?.usageMetadata?.candidatesTokenCount}};
 }};
}
