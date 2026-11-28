'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {verifyAnswer}=await import('../ai-worker/worker.mjs'),refs=[{title:'source',key:'0123456789abcd'}];
 const invalid=['তাওহীদের তিনটি স্তর তথা ইসলাম, ঈমান ও ইহসান [1]','রোজা ভাঙ্গার কারণগুলো হলো:\n১. ইচ্ছাকৃতভাবে খাওয়া [1]\n৬. অসুস্থতা বা সফরের কারণে রোজা ভঙ্গ করা [1]'];
 for(const text of invalid)assert.equal(verifyAnswer(text,refs).valid,false,text);
 const repeat='একই দীর্ঘ বাক্য যেটি বারবার এসেছে এবং এর ফলে ভুল সিদ্ধান্তের পুনরাবৃত্তি হয়। '.repeat(3)+' [1]';assert.equal(verifyAnswer(repeat+'\n\n'+repeat,refs).valid,false,'repeated paragraphs are rejected');
 const misplaced='তাওহীদের গুরুত্ব অপরিসীম [1]। এটি মানুষকে আত্মমর্যাদা শেখায়। আধুনিক জীবনে এটি মানুষকে আত্মিক প্রশান্তি দেয়।';assert.equal(verifyAnswer(misplaced,refs).valid,false,'reject reviewed early citation followed by multiple unreferenced claims');
 const cupping='শিঙ্গা টানা রোজা ভাঙ্গার কারণ হতে পারে, কারণ এতে রক্ত বের হতে পারে এবং শরীর দুর্বল হতে পারে [1]।';assert.equal(verifyAnswer(cupping,refs).valid,false,'reject reviewed misrepresentation of disputed cupping narration');
 const ok='রোজা ভঙ্গের কারণের বিষয়ে উৎসে আলোচনা আছে [1]। অসুস্থ ব্যক্তি রোজা না রাখার অনুমতি পেতে পারেন [1]।';assert.equal(verifyAnswer(ok,refs).valid,true,'do not block a separate qualified statement');
 console.log('Reviewed AI failure patterns: narrow guards fail closed; qualified discussion stays possible.');
})().catch(e=>{console.error(e);process.exitCode=1});
