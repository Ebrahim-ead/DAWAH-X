'use strict';
const assert=require('assert'),{textDate}=require('../tools/text-date.cjs');
for(const [s,want] of [['নভেম্বর ২০২৬','2026-11'],['অক্টোবর ২৭, ২০২৬','2026-10-27'],['2026-10-30','2026-10-30'],['Oct 08, 2026','2026-10-08'],['2025-02-29',''],['2025-02-00',''],['','']])assert.equal(textDate(s),want,s);
console.log('text dates: Bengali, English, ISO, month-only and invalid dates pass');
