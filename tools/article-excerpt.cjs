'use strict';
/* Build excerpts from the original article without invisible HTML comments or
   the source site's trailing navigation. Never modify the stored article. */
function excerptSource(html,source){
 let value=String(html||'').replace(/<!--[\s\S]*?-->/g,' ');
 // The imported Al-Ikhlas archive appends this exact subject-navigation block.
 // Restrict it to that source and to the end, so article text is never cut.
 if(source==='ik')value=value.replace(/<div class="subjects">\s*<span>প্রসঙ্গসমূহ »:\s*<\/span>(?:\s*<a href="https:\/\/ikhlasbd\.com\/subject_archive\/\d+">[^<]*<\/a>)*\s*<\/div>\s*$/i,' ');
 return value;
}
module.exports={excerptSource};
