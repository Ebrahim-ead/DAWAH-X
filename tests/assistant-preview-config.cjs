'use strict';
// Lightweight structural checks; the real Cloudflare preview build validates
// Wrangler's complete schema and deployment. The preview must fail closed if a
// required binding is missing, rather than silently sharing production limits.
const assert=require('node:assert/strict'),fs=require('node:fs');
const config=fs.readFileSync('ai-worker/wrangler.toml','utf8');
const rootConfig=fs.readFileSync('wrangler.toml','utf8');
assert.equal(rootConfig.replace('main = "ai-worker/worker.mjs"','main = "worker.mjs"'),config,'root and Worker settings must stay identical; only their entrypoint paths differ');
assert.match(rootConfig,/^main = "ai-worker\/worker\.mjs"$/m);
function block(name,array=false){
 const header=(array?'[[':'[')+name+(array?']]':']');
 const lines=config.split(/\r?\n/);const indices=lines.flatMap((line,i)=>line.trim()===header?[i]:[]);
 if(array)return indices.map(i=>lines.slice(i+1).join('\n').split(/^\s*\[/m)[0]);
 assert.equal(indices.length,1,header+' must exist exactly once');
 return lines.slice(indices[0]+1).join('\n').split(/^\s*\[/m)[0];
}
function value(section,key){const matches=[...section.matchAll(new RegExp('^\\s*'+key+'\\s*=\\s*"([^"\\n]+)"\\s*$','gm'))];assert.equal(matches.length,1,'missing or duplicate '+key);return matches[0][1]}
const rate=(type,name)=>{const entries=block(type,true).filter(b=>new RegExp('^name = "'+name+'"$','m').test(b));assert.equal(entries.length,1,name+' must have exactly one '+type+' binding');return entries[0]};
const prodAI=block('ai'),previewAI=block('previews.ai'),prodRate=rate('ratelimits','RATE_LIMITER'),previewRate=rate('previews.ratelimits','RATE_LIMITER'),prodLogRate=rate('ratelimits','UNANSWERED_LIMITER'),previewLogRate=rate('previews.ratelimits','UNANSWERED_LIMITER'),prodVars=block('vars'),previewVars=block('previews.vars');
assert.equal(value(prodAI,'binding'),'AI');assert.equal(value(previewAI,'binding'),'AI');
assert.equal(value(prodRate,'name'),'RATE_LIMITER');assert.equal(value(previewRate,'name'),'RATE_LIMITER');
assert.equal(value(prodRate,'namespace_id'),'1001');assert.match(value(previewRate,'namespace_id'),/^\d+$/);assert.notEqual(value(previewRate,'namespace_id'),value(prodRate,'namespace_id'));
for(const rate of [prodRate,previewRate])assert.match(rate,/^\s*simple\s*=\s*\{\s*limit\s*=\s*10\s*,\s*period\s*=\s*60\s*\}\s*$/m);
for(const rate of [prodLogRate,previewLogRate])assert.match(rate,/^\s*simple\s*=\s*\{\s*limit\s*=\s*1\s*,\s*period\s*=\s*60\s*\}\s*$/m);
assert.equal(new Set([prodRate,previewRate,prodLogRate,previewLogRate].map(x=>value(x,'namespace_id'))).size,4,'each limiter must use an isolated namespace');
const origin=value(prodVars,'ALLOWED_ORIGINS');assert.equal(origin,'https://ebrahim-ead.github.io');assert.equal(value(previewVars,'ALLOWED_ORIGINS'),origin);
assert(!previewVars.includes('*'),'preview does not broaden CORS');
assert.equal(value(prodVars,'GEMINI_ENABLED'),'true');
assert(!/^\s*GEMINI_ENABLED\s*=/m.test(previewVars),'preview must not enable Gemini');
const prodKV=block('kv_namespaces',true);
assert.equal(prodKV.length,1,'exactly one production KV namespace is expected');
assert.equal(value(prodKV[0],'binding'),'UNANSWERED_QUESTIONS');
assert.match(value(prodKV[0],'id'),/^[a-f0-9]{32}$/,'production namespace ID must be a real-format ID');
assert.equal(block('previews.kv_namespaces',true).length,0,'preview must not bind the production question namespace');
console.log('assistant preview config: AI, isolated rate limiter and restricted origin pass');
