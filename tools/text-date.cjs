'use strict';
// Dates provided by publishers; a month without a day retains month precision.
const bn=[/জানু/,/ফেব্রু/,/মার্চ/,/এপ্রি/,/^মে/,/জুন/,/জুলা/,/আগ/,/সেপ্টে/,/অক্টো/,/নভে/,/ডিসে/];
const en=/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i;
function textDate(value){const s=String(value||'').replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c))).trim();if(!s)return '';
 const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);let year,month,day;
 if(iso){year=+iso[1];month=+iso[2];day=+iso[3];if(!day||!month)return ''}else{month=bn.findIndex(x=>x.test(s))+1;if(!month){const m=en.exec(s);if(m)month='janfebmaraprmayjunjulaugsepoctnovdec'.indexOf(m[1].slice(0,3).toLowerCase())/3+1}const nums=(s.match(/\d+/g)||[]).map(Number);year=nums.find(n=>n>=1900&&n<=2100);day=nums.find(n=>n!==year&&n>=1&&n<=31)}
 if(!year||!month||month>12)return '';const dt=new Date(Date.UTC(year,month-1,day||1));if(dt.getUTCFullYear()!==year||dt.getUTCMonth()!==month-1||dt.getUTCDate()!==(day||1))return '';
 return `${year}-${String(month).padStart(2,'0')}`+(day?`-${String(day).padStart(2,'0')}`:'');
}
module.exports={textDate};
