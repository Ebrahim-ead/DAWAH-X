/* Manually confirmed unavailable videos: independent of the automatic audit cursor. */
'use strict';
const fs=require('fs'),path=require('path');
function manualBlocked(){
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'video-blocklist.json'),'utf8'));
 if(data.v!==1||!Array.isArray(data.ids)||data.ids.some(id=>typeof id!=='string'||!/^[\w-]{11}$/.test(id))||new Set(data.ids).size!==data.ids.length)throw new Error('video-blocklist.json অবৈধ');
 return new Set(data.ids);
}
module.exports={manualBlocked};
