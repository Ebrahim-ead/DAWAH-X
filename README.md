# DAWAH X — ওয়েবসাইট

বাংলা ভাষার ইসলামিক দাওয়াহ ওয়েবসাইট: প্রশ্নোত্তর লাইব্রেরি, ফতোয়া আর্কাইভ (প্রায় ১৯,০০০ searchable রেফারেন্স), ৫,০০০ ভিডিওর YouTube গ্যালারি এবং DAWAH X টিমকে প্রশ্ন পাঠানোর ফর্ম।

**লাইভ সাইট:** https://ebrahim-ead.github.io/DAWAH-X/

## কীভাবে তৈরি
- সাধারণ static HTML, CSS ও JavaScript — কোনো build step নেই।
- GitHub Pages থেকে (`main` branch, root ফোল্ডার) সরাসরি প্রকাশিত হয়। Netlify-তেও চলে (`netlify.toml`)।

## ফাইল আপলোডের নিয়ম (গুরুত্বপূর্ণ)
1. **সব ফাইল repository-র root-এ, একই ফোল্ডারে থাকবে।** কোনো `assets/` বা `img/` সাব-ফোল্ডার নেই।
2. **সব ফাইলের নাম ছোট হাতের অক্ষরে (lowercase)।** GitHub Pages-এ `Video-Thumb-ABC.jpg` আর `video-thumb-abc.jpg` আলাদা ফাইল; নাম না মিললে ছবি/স্টাইল লোড হয় না।
3. পেজের ভেতরের সব লিংক relative (যেমন `style.css`, `logo.webp`) — শুরুতে `/` দেবেন না, নইলে `…github.io/DAWAH-X/` ঠিকানায় ফাইল পাওয়া যাবে না।

## ফাইল পরিচিতি
| ফাইল | কাজ |
| --- | --- |
| `index.html`, `about.html`, `services.html`, `questions.html`, `fatwa.html`, `videos.html`, `ask.html`, `contact.html` | প্রতিটি পেজের জন্য একটি ফাইল |
| `404.html` | ভুল লিংকে গেলে যে পাতা দেখায় |
| `style.css` | সব পেজের ডিজাইন |
| `app.js` | লিংক/যোগাযোগের তথ্য, প্রশ্নোত্তর ও ফতোয়া লাইব্রেরি, প্রশ্ন পাঠানোর ফর্ম |
| `effects.js` | মেনু, ঘড়ি, ভিডিও প্লেয়ার, অ্যানিমেশন |
| `youtube-gallery.js`, `youtube-videos.json`, `video-thumb-*.jpg` | ভিডিও গ্যালারি ও তার তালিকা |
| `questions-catalog-part-*.js`, `fatwa-catalog-part-*.js` | পূর্ণ লাইব্রেরি সূচি (প্রয়োজন হলে লোড হয়) |
| `logo.webp`, `logo-icon.webp`, `favicon.svg`, `apple-touch-icon.png`, `hero.jpg`, `youtube-channel-logo.webp` | লোগো, আইকন ও হোম পেজের ছবি |
| `og-image.jpg` | Facebook/WhatsApp-এ লিংক শেয়ার করলে যে ছবি দেখায় |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | ফোনে “Add to Home screen” করলে সাইটের নাম ও আইকন |
| `read.html` | লাইব্রেরির লেখা এই সাইটেই পড়ার পেজ (`read.html?k=…`) |
| `texts/` | প্রকাশকদের অনুমতিক্রমে আনা লেখা (`texts/<শেষ ৩ অক্ষর>.json`) ও তার সূচি `texts/index.json` |
| `tools/import-texts.cjs`, `.github/workflows/import-texts.yml` | উৎস সাইট থেকে লেখা আনার স্বয়ংক্রিয় ব্যবস্থা (GitHub Actions-এ চলে) |
| `sitemap.xml` | সার্চ ইঞ্জিনের জন্য পেজের তালিকা |
| `__forms.html`, `netlify.toml` | শুধু Netlify-তে হোস্ট করলে লাগে |
| `.nojekyll` | GitHub Pages-কে ফাইলগুলো যেমন আছে তেমন প্রকাশ করতে বলে |

## নিজের তথ্য বদলানো
`app.js` ফাইলের একদম শুরুতে:
- `LINKS` — Facebook, YouTube, TikTok লিংক (TikTok আইডি বসালে ফুটারে আইকন দেখাবে)
- `MESSENGER` — যে Messenger ইনবক্সে প্রশ্ন যাবে
- `ASK_ACTION` — (ঐচ্ছিক) Formspree URL দিলে প্রশ্ন সরাসরি ইমেইলে আসবে
- `SUBSCRIBE_ACTION` — (ঐচ্ছিক) ইমেইল সাবস্ক্রিপশন সেবার URL

## “প্রশ্ন করুন” ফর্ম কীভাবে কাজ করে
- **GitHub Pages-এ (বর্তমান অবস্থা):** “প্রশ্ন পাঠান” চাপলে প্রশ্নটি কপি হয় এবং DAWAH X-এর Messenger চ্যাট খুলে যায়; ভিজিটর Send চাপলে প্রশ্ন পৌঁছায়। GitHub Pages-এ সার্ভার নেই, তাই সরাসরি জমা নেওয়া সম্ভব নয়।
- **ইমেইলে সরাসরি পেতে চাইলে:** [formspree.io](https://formspree.io)-তে একটি ফর্ম খুলে তার URL `app.js`-এর `ASK_ACTION`-এ বসান।
- **Netlify-তে হোস্ট করলে:** প্রশ্ন Netlify Forms-এর `question` ফর্মে জমা হয় (Netlify dashboard → Forms)।

## সাইটের ঠিকানা বদলালে
নিজস্ব ডোমেইন নিলে প্রতিটি `.html` ফাইলের `<head>`-এ থাকা `https://ebrahim-ead.github.io/DAWAH-X/` (canonical, `og:url`, `og:image`, `twitter:image`) এবং `sitemap.xml`-এর ঠিকানা নতুন ঠিকানায় বদলে দিন।

## নিজের কম্পিউটারে দেখা
```bash
python3 -m http.server 8000
```
তারপর http://localhost:8000 খুলুন।

## লাইব্রেরির লেখা সাইটেই পড়া

প্রশ্নোত্তর ও ফতোয়ার যে কার্ডের লেখা `texts/`-এ আছে, সেটি `read.html`-এ খোলে; লেখার নিচে উৎসের নাম ও মূল লেখার লিংক থাকে। যে লেখা আনা হয়নি, তার কার্ড আগের মতো মূল সাইটে (নতুন ট্যাবে) খোলে।

- লেখাগুলো **প্রকাশকের অনুমতি সাপেক্ষে** আনা। কোনো প্রকাশক আপত্তি করলে `tools/import-texts.cjs`-এর `SOURCES` থেকে সেই উৎসটি বাদ দিন এবং `texts/`-এর ফাইলগুলো থেকে তার লেখা মুছে দিন।
- নতুন লেখা আনতে `tools/import-request.json`-এর `run` সংখ্যাটি এক বাড়িয়ে যেকোনো `arena/…` শাখায় push করুন, অথবা GitHub-এর **Actions → Import library texts → Run workflow** চাপুন। আগে আনা লেখা আবার আনা হয় না; ফলাফল `texts/_report.json`-এ থাকে।
- From Muslims ও insightzonebd.com স্বয়ংক্রিয় অনুরোধ আটকে দেয় (Cloudflare), তাই তাদের লেখা এভাবে আনা যায় না। তাদের লেখা যোগ করতে প্রকাশকের কাছ থেকে লেখাগুলোর ফাইল (যেমন WordPress-এর Export ফাইল) লাগবে।
- হাতে তোলা লেখা: `tools/manual/` ফোল্ডারের `.txt` ফাইলগুলো `node tools/add-texts.cjs` চালালে সাইটের লেখায় যোগ হয়। insightzonebd.com-এর ৭টি প্রশ্নোত্তর এভাবে যোগ করা হয়েছে।

## WhatsApp

নম্বর বদলাতে `app.js`-এর `LINKS.whatsapp` এবং প্রতিটি পেজের ফুটার ও `contact.html`-এর `https://wa.me/8801783543026` ঠিকানা বদলান (দেশের কোডসহ, `+` ছাড়া)।

আরও তথ্য: `site-notes.md` (লাইব্রেরি সূচি), `youtube-setup.md` (ভিডিও গ্যালারি), `agents.md` (ডেভেলপার/AI সহকারীর জন্য নোট)।
