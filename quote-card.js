/* Create a 1080×1080 image locally; nothing is sent to a server. */
(()=>{
 'use strict';
 const open=document.getElementById('quote-open'),body=document.getElementById('read-body');if(!open||!body)return;
 const key=new URLSearchParams(location.search).get('k')||'';if(!/^[0-9a-f]{14}$/.test(key)){open.disabled=true;return}
 const dialog=document.createElement('dialog');dialog.className='quote-dialog';dialog.setAttribute('aria-labelledby','quote-heading');
 dialog.innerHTML='<form method="dialog"><h2 id="quote-heading">উদ্ধৃতি কার্ড তৈরি করুন</h2><p>লেখা থেকে অংশ নির্বাচন করুন অথবা নিচে লিখুন। পাঠানোর আগে মূল লেখার সঙ্গে উদ্ধৃতিটি মিলিয়ে নিন।</p><label for="quote-text">উদ্ধৃতি (সর্বোচ্চ 220 অক্ষর)</label><textarea id="quote-text" maxlength="220" rows="5"></textarea><p id="quote-message" aria-live="polite"></p><canvas width="1080" height="1080" aria-label="উদ্ধৃতি কার্ডের নমুনা"></canvas><div class="quote-actions"><button type="button" id="quote-download">ছবি ডাউনলোড</button><button type="button" id="quote-share">ছবি শেয়ার</button><button type="submit">বন্ধ করুন</button></div><p>ছবিটি এই ব্রাউজারেই তৈরি হয়; লেখা কোনো সার্ভারে পাঠানো হয় না।</p></form>';
 document.body.append(dialog);const text=dialog.querySelector('#quote-text'),canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),message=dialog.querySelector('#quote-message');
 let blob=null,seq=0;
 const fitLines=(value,font,maxWidth)=>{ctx.font=font;const result=[];for(const paragraph of value.split('\n')){let line='';for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){result.push(line);line=word}else line=next}if(line)result.push(line)}return result};
 async function draw(){
  const turn=++seq;blob=null;await document.fonts.ready;if(turn!==seq)return;
  ctx.fillStyle='#08191d';ctx.fillRect(0,0,1080,1080);ctx.strokeStyle='#d5a941';ctx.lineWidth=3;ctx.strokeRect(55,55,970,970);
  ctx.fillStyle='#ffd56a';ctx.font='700 40px "Hind Siliguri", sans-serif';ctx.fillText('DAWAH X',105,145);
  const value=text.value.trim();let size=58,lines=[];
  while(size>=30){lines=fitLines(value,`600 ${size}px "Hind Siliguri", sans-serif`,870);if(lines.length*size*1.45<=590&&lines.every(l=>ctx.measureText(l).width<=870))break;size-=2}
  if(!value||size<30){blob=null;message.textContent=value?'উদ্ধৃতিটি ছোট করুন, যাতে কার্ডে পুরোটা দেখা যায়।':'উদ্ধৃতি লিখুন।';return}
  ctx.fillStyle='#f4f5f4';ctx.font=`600 ${size}px "Hind Siliguri", sans-serif`;let y=250;for(const line of lines){ctx.fillText(line,105,y);y+=size*1.45}
  ctx.strokeStyle='#bd9b50';ctx.beginPath();ctx.moveTo(105,865);ctx.lineTo(975,865);ctx.stroke();ctx.fillStyle='#d5dddf';ctx.font='400 28px "Hind Siliguri", sans-serif';
  let title=(document.getElementById('read-title')?.textContent||'মূল লেখা').trim();while(ctx.measureText(title).width>870&&title.length>1)title=title.slice(0,-2);ctx.fillText('সূত্র: '+title,105,915,870);ctx.fillText('ebrahim-ead.github.io/DAWAH-X/s/'+key+'.html',105,970,870);
  message.textContent='';canvas.toBlob(b=>{if(turn===seq)blob=b},'image/png');
 }
 text.addEventListener('input',draw);
 open.addEventListener('click',()=>{const sel=window.getSelection(),selection=sel&&sel.anchorNode&&body.contains(sel.anchorNode)?String(sel).trim():'';text.value=(selection||'').slice(0,220);blob=null;draw();if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');text.focus()});
 dialog.querySelector('#quote-download').addEventListener('click',()=>{if(!blob){message.textContent='উদ্ধৃতি তৈরি হচ্ছে বা খুব বড় হয়েছে।';return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dawahx-quote.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)});
 dialog.querySelector('#quote-share').addEventListener('click',async()=>{if(!blob){message.textContent='উদ্ধৃতি তৈরি হচ্ছে বা খুব বড় হয়েছে।';return}const file=new File([blob],'dawahx-quote.png',{type:'image/png'});if(!navigator.canShare?.({files:[file]})){message.textContent='এই ব্রাউজারে সরাসরি ছবি শেয়ার করা যায় না। ছবি ডাউনলোড করে শেয়ার করুন।';return}try{await navigator.share({files:[file],title:'DAWAH X'});}catch(e){if(e.name!=='AbortError')message.textContent='শেয়ার করা যায়নি। ছবি ডাউনলোড করে শেয়ার করুন।'}});
})();
