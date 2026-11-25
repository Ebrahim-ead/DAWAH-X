'use strict';
// Removed editions must not silently resolve to a different book.
const assert=require('node:assert/strict');
(async()=>{const {parseScripture}=await import('../ai-worker/scripture.mjs');assert.equal(parseScripture('নববী হাদিস ১'),null);assert.equal(parseScripture('মুয়াত্তা মালিক হাদিস ১'),null);assert.equal(parseScripture('আবু দাউদ হাদিস ১').book,'abu-dawud');console.log('Removed hadith editions do not resolve to a different source');})().catch(e=>{console.error(e);process.exitCode=1});
