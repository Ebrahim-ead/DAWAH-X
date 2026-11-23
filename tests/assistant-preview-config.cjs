'use strict';
// Lightweight structural checks; the real Cloudflare preview build validates
// Wrangler's complete schema and deployment. The preview must fail closed if a
// required binding is missing, rather than silently sharing production limits.
const assert=require('node:assert/strict'),fs=require('node:fs');
const config=fs.readFileSync('ai-worker/wrangler.toml','utf8');
function block(name,array=false){
 const header=(array?'[[':'[')+name+(array?']]':']');
 const lines=config.split(/\r?\n/);const indices=lines.flatMap((line,i)=>line.trim()===header?[i]:[]);
 assert.equal(indices.length,1,header+' must exist exactly once');
 return lines.slice(indices[0]+1).join('\n').split(/^\s*\[/m)[0];
}
function value(section,key){const matches=[...section.matchAll(new RegExp('^\\s*'+key+'\\s*=\\s*"([^"\\n]+)"\\s*$','gm'))];assert.equal(matches.length,1,'missing or duplicate '+key);return matches[0][1]}
const prodAI=block('ai'),previewAI=block('previews.ai'),prodRate=block('ratelimits',true),previewRate=block('previews.ratelimits',true),prodVars=block('vars'),previewVars=block('previews.vars');
assert.equal(value(prodAI,'binding'),'AI');assert.equal(value(previewAI,'binding'),'AI');
assert.equal(value(prodRate,'name'),'RATE_LIMITER');assert.equal(value(previewRate,'name'),'RATE_LIMITER');
assert.equal(value(prodRate,'namespace_id'),'1001');assert.match(value(previewRate,'namespace_id'),/^\d+$/);assert.notEqual(value(previewRate,'namespace_id'),value(prodRate,'namespace_id'));
for(const rate of [prodRate,previewRate])assert.match(rate,/^\s*simple\s*=\s*\{\s*limit\s*=\s*10\s*,\s*period\s*=\s*60\s*\}\s*$/m);
const origin=value(prodVars,'ALLOWED_ORIGINS');assert.equal(origin,'https://ebrahim-ead.github.io');assert.equal(value(previewVars,'ALLOWED_ORIGINS'),origin);
assert(!previewVars.includes('*'),'preview does not broaden CORS');
console.log('assistant preview config: AI, isolated rate limiter and restricted origin pass');
