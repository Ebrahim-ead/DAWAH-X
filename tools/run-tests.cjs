#!/usr/bin/env node
'use strict';
// Run every standalone regression test, including new *.cjs files added later.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const tests=fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.cjs')).sort();
if(!tests.length){console.error('No regression tests found');process.exit(1)}
for(const test of tests){
 console.log(`\n--- ${test} ---`);
 const result=spawnSync(process.execPath,[path.join(root,'tests',test)],{cwd:root,stdio:'inherit'});
 if(result.error||result.status!==0){console.error(`Failed: ${test}`,result.error||`(exit ${result.status})`);process.exit(1)}
}
console.log(`\nAll ${tests.length} regression tests passed.`);
