# DAWAH X — হালনাগাদ ওয়েবসাইট

## পেজ
- `index.html` — হোম
- `about.html` — আমাদের সম্পর্কে
- `services.html` — সেবা সমূহ
- `questions.html` — প্রশ্নোত্তর ও জবাবধর্মী লেখা
- `fatwa.html` — ফতোয়া / মাসআলা
- `videos.html` — YouTube ভিডিও গ্যালারি
- `ask.html` — প্রশ্ন পাঠান
- `contact.html` — যোগাযোগ
- `saved.html` — পাঠকের সংরক্ষিত লেখার তালিকা (ব্রাউজারেই জমা থাকে)

সব ফাইল একই ফোল্ডারে রাখুন এবং `index.html`-কে হোস্টিংয়ের ডকুমেন্ট রুটে দিন। লাইব্রেরির জন্য `questions-catalog-part-*.js` ও `fatwa-catalog-part-*.js` chunk ফাইলগুলো একই ফোল্ডারে রাখুন; বিভাগ বাছাই বা সার্চের সময় প্রয়োজনীয় অংশই লোড হয়।

## লাইব্রেরি সূচি
- আত-তাহরীক: ৮,০১২টি অনন্য ফতোয়া/প্রশ্নোত্তর লিংক + ৩,৬০৪টি সাধারণ প্রবন্ধ (আলাদা লেবেলযুক্ত)।
- আল-ইতিছাম: ৪,৭৮৪টি অনন্য প্রশ্নোত্তর লিংক (মূল ৪,৬৪১ + নতুন ১৪৩) + ২,২৫৩টি সাধারণ প্রবন্ধ (মূল ৩৯৬ + নতুন ১,৮৫৭; আলাদা লেবেলযুক্ত)।
- From Muslims: ২৩৪টি প্রশ্নোত্তর + ৩৫৮টি প্রবন্ধ।
- Response to Anti-Islam: ৩২৭টি নিবন্ধ।

প্রশ্নোত্তর/জবাবধর্মী সূচি: ৯১৯টি রেফারেন্স। মোট ফতোয়া/প্রশ্নোত্তর: ১২,৭৯৬টি; অতিরিক্ত সাধারণ প্রবন্ধ: ৫,৮৫৭টি (ফতোয়া হিসেবে গণ্য নয়); মোট searchable metadata ১৮,৬৫৩টি। নতুন আল-ইতিছাম সংযোজনের মধ্যে ১৪৩টি যাচাইকৃত প্রশ্নোত্তর এবং ১,৮৫৭টি প্রবন্ধ। পুরনো নির্বাচিত তালিকাও সার্চে থাকে। এখানে শিরোনাম, বিভাগ/উৎস ও মূল লিংক সূচিবদ্ধ; পূর্ণ উত্তর/প্রবন্ধ মূল প্রকাশকের সাইটে খোলে। ফতোয়া/প্রশ্নোত্তর আর্কাইভ ও নতুন সংযোজন সংগৃহীত ১৭ অক্টোবর ২০২৬।

## প্রশ্ন পাঠানো (FormSubmit + Messenger)
ফর্মে একটিই বোতাম (“প্রশ্ন পাঠান”); নাম, ইমেইল অথবা ফোন (যেকোনো একটি), ধর্মীয় পরিচয় ও প্রশ্ন আবশ্যক। সরাসরি জমা না হলে তখনই WhatsApp ও Messenger-এর বোতাম দেখা দেয়।

২০২৬-১১ থেকে “প্রশ্ন পাঠান” বোতাম প্রশ্ন সরাসরি FormSubmit-এ (`ASK_ACTION`, `app.js`; reCAPTCHA ছাড়া) জমা দেয়, সেখান থেকে ইমেইলে আসে; নিচের Messenger পদ্ধতিটি এখন শুধু জমা ব্যর্থ হলে বা `ASK_ACTION` ফাঁকা থাকলে কাজে লাগে।

GitHub Pages-এ “প্রশ্ন পাঠান” চাপলে প্রশ্নটি clipboard-এ কপি হয় এবং `https://m.me/61595349861689?text=…` chat link খোলে (বার্তাটি আগে থেকে লেখা থাকে; না থাকলে Paste করতে হবে), তারপর ভিজিটর Send চাপলে প্রশ্ন পৌঁছায়। ব্রাউজার থেকে Messenger-এ স্বয়ংক্রিয়ভাবে বার্তা পাঠানো যায় না। সরাসরি ইমেইলে পেতে `app.js`-এর `ASK_ACTION`-এ `https://formsubmit.co/ajax/<ইমেইল>` বসানো থাকে; Netlify-তে হোস্ট করলে প্রশ্ন Netlify Forms-এ জমা হয়।


## Static YouTube video catalogue
`videos.html` includes a combined catalogue of public channel-list entries (5,000+; started with 1 DAWAH X video, 2,798 from Professor Dr. Abubakar Muhammad Zakaria, 201 from Salafi Manhaj 2, and 2,000 from Peace TV Bangla (@PeaceTVprogram)). It displays 20 per page, supports title/channel search, topic/channel filter chips and page navigation, and opens selected videos in an on-page YouTube player. No API key is required: `.github/workflows/update-videos.yml` runs `tools/update-videos.cjs` about every 30 minutes, which reads each channel's public upload feed (latest 15 uploads) and commits any new video to `youtube-videos.json` (channels listed in `tools/video-channels.json`). Individual videos may be restricted by YouTube or by their channel owner. See `youtube-setup.md`.


## Live date and time
A live Bangladesh date/time display is shown on every page using the `Asia/Dhaka` timezone. The date is in English and the clock uses English numerals in 12-hour format with AM/PM, updating every second.

## Dhaka clock
The large "ঢাকার বর্তমান সময়" card on the homepage was removed at the owner's request (2026-11-16). Only the small date/time line at the top of every page remains.

## GitHub Pages deployment
Upload every file to the repository root (no sub-folders) with lowercase filenames, then enable GitHub Pages for the `main` branch and root folder. All links inside the pages are relative, so the site works from `https://<user>.github.io/DAWAH-X/` without any server-side code. See `README.md` for the upload rules.

## YouTube video player
The YouTube player uses an iframe and may be blocked by strict network or browser privacy settings. Every menu item opens its own HTML page. GitHub Pages serves the extracted files as a static website.

## স্মার্ট ও প্রফেশনাল হালনাগাদ (২০২৬-১১-১৭)
- হোম পেজে লাইভ পরিসংখ্যান-পট্টি: মোট লেখা, ফতোয়া, প্রশ্নোত্তর, ভিডিও ও বিষয়ের সংখ্যা `stats.json` থেকে আসে; সংখ্যা হাতে বদলাতে হয় না (`node tools/build-stats.cjs`)।
- লেখা পড়ার পেজে লেখার আকার ছোট/বড় (A−/A+), «সংরক্ষণ করুন» ও «প্রিন্ট / PDF» বোতাম; সংরক্ষিত লেখা `saved.html`-এ জমা থাকে।
- ভিডিও পেজে ১৪ দিনের ভেতরের আপলোডে «নতুন» ব্যাজ।
- সার্চ ইঞ্জিনের জন্য `robots.txt`, হালনাগাদ `sitemap.xml` এবং প্রতিটি পাতায় structured data (JSON-LD)।
- `sw.js`-এর সংস্করণ `v2`; নতুন ফাইল (`saved.html`, `stats.json`) অফলাইনেও প্রস্তুত থাকে।

## অডিট ও নতুন লাইভ অ্যানিমেশন (২০২৬-১১-১৭)
- পুরো সাইট ৯টি স্ক্রিন-সাইজে (৩২০px থেকে ১৯২০px) পরীক্ষা করা হয়েছে — কোনো console error, অনুভূমিক ওভারফ্লো বা ভাঙা ছবি নেই; মোবাইল ৪x ধীর প্রসেসরেও স্ক্রল মসৃণ (CLS 0)।
- ঠিক করা হয়েছে: ফোনে ছোট লেখার লিংকগুলো এখন ৩২px উঁচু (আঙুলে সহজ), এবং ask ফর্মের লুকানো বট-ফিল্ড আর স্ক্রিনের বাইরে থাকে না।
- নতুন লাইভ ইফেক্ট: নিচে স্ক্রল করলে হেডার সরে যায় ও উপরে টানলেই ফেরে; «উপরে যান» বোতামে স্ক্রল-অগ্রগতির রিং; হোমের সংখ্যাগুলো শূন্য থেকে গুনে ওঠে; ভিডিওর ছবি শিমার দিয়ে ফেড-ইন; «নতুন» ব্যাজে মৃদু রিং; কার্ড ঢোকার সময় হালকা উত্থান।
- চলাচল কম চাইলে (ফোনের reduced-motion সেটিং) এই সব অ্যানিমেশন নিজে থেকেই বন্ধ থাকে — লেখা পড়তে কোনো অসুবিধা হয় না।

## সাইট-জুড়ে সার্চ, «পড়ে শুনুন» ও হিজরি তারিখ (২০২৬-১১-১৭)
- **যেকোনো পাতা থেকে সার্চ:** উপরের ঘড়ির-বারে (কম্পিউটারে) বা হেডারে (ফোনে) আতশকাচের বোতাম, অথবা `Ctrl+K` / `/` চাপলেই সার্চ খোলে। লিখতে থাকলে সাইটের ২০,০০৫টি লেখার শিরোনাম থেকে মিলে যাওয়া লেখা সঙ্গে সঙ্গে দেখায়; তীর-কী ও Enter দিয়েও বাছা যায়। «সব ফলাফল দেখুন» চাপলে প্রশ্নোত্তর পাতার পূর্ণ-পাঠ সার্চে নিয়ে যায় (লেখার ভেতরের শব্দও খোঁজে)।
- **পড়ে শুনুন:** যে কোনো লেখার পাতায় ফোন/কম্পিউটারের নিজের বাংলা ভয়েস দিয়ে পুরো লেখা শোনা যায় — কোনো সার্ভার বা ডাউনলোড লাগে না। ভয়েস না থাকলে বোতামটি নিজে থেকে সরে যায়, আর বাংলা ভয়েস না থাকলে কী করতে হবে তা বলে দেয়।
- **হিজরি তারিখ:** প্রতিটি পাতার ওপরের তারিখ-সময়ের লাইনে এখন হিসাব করা হিজরি তারিখও দেখা যায় (উম্মুল কুরা)। স্থানীয় চাঁদ দেখার সাথে এক দিন কম-বেশি হতে পারে বলে ইঙ্গিতে সেটি লেখা আছে।
- **৪০৪ পাতা:** ভুল ঠিকানায় এলে এখন সরাসরি খোঁজার ঘর আছে — লিখে খুঁজলেই প্রশ্নোত্তর পাতায় ফল আসে।
- পাশাপাশি ঠিক করা হয়েছে: ল্যাপটপের কিছু প্রস্থে (১১৮০–১৫৬০) হেডার সামান্য চওড়া হয়ে ফেসবুক বোতামের একাংশ কেটে যাচ্ছিল; এখন আর কোথাও আড়াঙ্কিত স্ক্রল নেই।
