# AGENTS.md — DAWAH X

## Architecture
Static site, no build step. Deployed on **GitHub Pages as a project site** (`https://ebrahim-ead.github.io/DAWAH-X/`, branch `main`, root folder); `netlify.toml` lets the same files run on Netlify.

Each page is its own `.html` file containing the shared chrome (head, SVG sprite, header, clock bar, footer, scripts) plus **only its own `<section id="…">`**. `<body data-page="…">` names that section (`home`, `about`, `services`, `qa`, `fatwa`, `videos`, `ask`, `contact`). A change to the shared chrome has to be applied to all eight page files.

## Hard rules (the site was once fully broken by violating these)
- **Flat layout:** every file lives in the repository root. No `assets/` or `img/` folders — the owner uploads files through the GitHub web UI, which loses folders.
- **Lowercase filenames only.** GitHub Pages is case-sensitive and the upload flow lowercases names. Local video thumbnails are `video-thumb-<youtube id lowercased>.jpg`; `youtube-gallery.js` lowercases the `thumbnail` value from `youtube-videos.json` before requesting it.
- **Relative URLs only** (`style.css`, never `/style.css`): the site is served from the `/DAWAH-X/` sub-path. The only absolute URLs are the canonical/Open Graph tags and `sitemap.xml`.
- No host-specific features in pages or CSS (e.g. Netlify Image CDN URLs).

## Key files
- `style.css` — the single stylesheet. The "Smoothness pass" block near the end holds performance overrides; keep heavy effects (full-page animated backgrounds, large blurs, mix-blend overlays, blanket `will-change`, backdrop-filter on mobile) out.
- `app.js` — one script for all pages; every block checks that its elements exist. Contains the owner-editable config (`LINKS`, `MESSENGER`, `ASK_ACTION`), the curated question/fatwa lists, `setupLibrary()` (search, category chips, paging, lazy catalogue loading) and the ask form.
- `effects.js` — menu state, the small top-bar date/time line, scroll progress, back-to-top, video lightbox, reveal/tilt effects.
- `youtube-gallery.js` — paginated video gallery fed by `youtube-videos.json`. It also builds the filter chips under the search box (`#video-filters`, created by the script; same `.chip` look as the fatwa page): a **topic** row and a **channel** row, combinable with each other and with the search. The catalogue has no category field, so topics come from title keywords — the `VIDEO_TOPICS` list at the top of the file (`word*` = prefix match, plain word = exact or with a common Bengali case ending; a video may fall under several topics, about a fifth match none and appear only under «সব»). Never add parts of speaker names as keywords (ইউসুফ, ইব্রাহীম, মুফতি, জাকির… tag every video of that speaker). `VIDEO_CHANNELS` maps `channelTitle` to the short chip label; a new channel shows up automatically under its own title. Topic or channel chips with no videos are dropped after the list loads. New uploads are added automatically: `.github/workflows/update-videos.yml` runs `tools/update-videos.cjs` about every 30 minutes, which reads each channel's public upload feed (latest 15) and commits new videos to `youtube-videos.json` (channels in `tools/video-channels.json`). Feed-added rows have no `duration` and a remote `i.ytimg.com` thumbnail — the gallery needs neither.
- `*-catalog-part-*.js` — catalogue chunks; each assigns `window.DAWAH_QUESTIONS_PARTS[category]` / `window.DAWAH_FATWAS_PARTS[category]`. The manifests (file, category, count) are `QUESTION_PARTS` / `FATWA_PARTS` in `app.js`; chunks load only on their own page, on demand.
- `__forms.html` — Netlify Forms registration for form `question` (fields: name, contact, topic, question, bot-field).

## Non-obvious behaviour
- Library rows are `[category, title, url]`. Rows are de-duplicated by decoded URL; when a catalogue chunk repeats a curated row, the curated row is kept and the chunk's category is stored as an extra category in `row[3]`.
- `escHTML` converts Bengali digits to Latin digits for *display* (site convention). Never use it on URLs — use `escAttr`.
- `ASK_ACTION` is the FormSubmit AJAX endpoint `https://formsubmit.co/ajax/www.mdrazu55555@gmail.com` (since 2026-11; the owner chose FormSubmit over Formspree and confirmed the address **with** the `www.` prefix). The «প্রশ্ন পাঠান» button posts JSON (`name`, `contact`, `topic`, `religion`, `question`, plus `_subject`, `_captcha:"false"` — the owner wants **no reCAPTCHA** — `_template:"table"`, and `email` + `_replyto` when the contact field holds an e-mail; empty fields are left out). It counts as delivered only when the response is 2xx **and** its JSON says `success: "true"` (FormSubmit reports “needs Activation” as `success: "false"`; a non-JSON reply also counts as not delivered). Any failure (network error, 20 s timeout, not activated) shows `chatOptions()`: a short message plus «WhatsApp-এ পাঠান ↗», «Messenger-এ পাঠান ↗» and a copy button, with the question copied. Mandatory fields, checked in form order by `compose()`: name (`#an`, ≥ 2 characters), contact (`#ac`: a valid e-mail **or** a phone number of 8–15 digits, Bengali digits accepted and sent as Latin — either one is enough, owner's decision), religious identity (`#ar`), question (`#aq`). The owner must click the “Activate Form” link FormSubmit e-mails on the first submission (again after a domain change). The sandbox cannot reach formsubmit.co, so delivery is tested with mocked responses only.
- Ask form delivery: `ASK_ACTION` (if set) → Netlify Forms (accepted only when the response carries a `Server: Netlify` header) → otherwise copy the question and open `m.me/<page>?text=…`. On `*.github.io` the Messenger path is used directly so the popup opens inside the user's tap.
- `[data-reveal]` elements start at `opacity:0` and are revealed by `effects.js`; a `<noscript>` style in each page keeps them visible without JavaScript.
- Headings: every page has exactly one `<h1>` (the page title); cards and footer column titles are `<h2>`, nested items `<h3>`. `youtube-gallery.js` creates video titles as `<h2>`. Keep levels sequential — CSS targets them by class + tag (e.g. `.title h1`, `.card h2`, `.fg h2`).
- UI copy is Bengali; keep it that way. Numbers in UI text use Latin digits.

## WhatsApp

`LINKS.whatsapp` in `app.js` (`https://wa.me/8801783543026`) feeds every `[data-link="whatsapp"]` element and the WhatsApp fallback link on `ask.html` (shown only after a failed direct submission; the question is prefilled, cut at 700 characters and also copied to the clipboard). The form itself has a single button, «প্রশ্ন পাঠান» (owner's decision, 2026-11) — do not bring back a permanent WhatsApp button. Sprite symbol: `#wa`.

## Ask form (`ask.html`)

- Fields: `#an` name, `#ac` contact, `#at` topic, `#ar` religious identity (**required**; `compose()` in `app.js` blocks sending and focuses the select while it is empty), `#aq` question. The identity goes into the chat text ("ধর্মীয় পরিচয়: …") and into the form data as `religion`; `__forms.html` must list the same field names for Netlify.
- Draft: the five fields are kept in `sessionStorage` (`dawahx-ask-draft`), because matching texts open in a new tab and the visitor comes back to the form.
- Matching content while typing: `showSuggestions()` (600 ms debounce, 6+ characters) calls `SUGGEST.find(q)` and fills `#asksug` with up to 3 Q&A/article cards, 3 fatwa cards (`a.qcard.qcard-own` → `read.html?k=…`, new tab) and up to 2 videos (`button.ask-vid[data-video-id]`, opened by the lightbox in `effects.js`). Nothing in the box may link to another site.
- `SUGGEST` reads `search/titles.json` + `search/tNN.json` (title-word index, 64 shards), the body shards `search/NNN.json` for word weights, `rel/*.json` for titles, and `youtube-videos.json` for videos. A text is shown only if most of the meaningful question words are in its title (at least two words, or one rare word). Greetings, question words and verb forms are listed in `ASK_SKIP` (folded spelling); add to it when a filler word causes wrong matches. Do not loosen the gate to single common words, and keep stems under 4 letters on exact match.
- `#asksug` cards are exempt from the scroll-reveal animation (`.ask-sug [data-reveal]` in `style.css`); without that they stay invisible until scrolled into view.

## On-site reader for library texts (`read.html`, `texts/`)

- `tools/import-texts.cjs` (run by `.github/workflows/import-texts.yml`; the sandbox cannot reach the source sites, GitHub runners can) fetches catalogue URLs, extracts the article with per-source selectors (`SOURCES`: `ai` al-itisam.com, `at` at-tahreek.com, `ra` response-to-anti-islam.com, `ia` islamicauthors.com), reduces it to an allow-list of tags and stores `{u,s,c,t,l,d,a,h}` in `texts/<last 3 hex of key>.json`. The workflow commits `texts/` back to the branch; pull before committing.
- Key = `textKey(url)` in `app.js` = `keyOfUrl(url)` in the importer (cyrb53 of `decodeURI(url)`, 14 hex). The two functions and the bucket rule must stay identical.
- `texts/index.json` = `{n, full:{source:host}, missing:[keys], keys:[keys]}`. A source is `full` when at most 5% of its catalogue is missing; other sources list their keys. `localKeyOf(url)` in `app.js` decides whether a card links to `read.html?k=<key>&from=q|f` or to the external URL.
- Listed YouTube videos play on the site: a card whose URL is a YouTube watch link with an id in `SITE_VIDEOS` (`app.js`, id → channel name) links to `read.html?v=<id>&from=q|f`, where the reader shows the YouTube embed (`youtube.com/embed/<id>`, same attributes as the gallery lightbox in `effects.js`), the channel credit and a "watch on YouTube" link. Ids outside `SITE_VIDEOS` are refused, so the page cannot be used to show arbitrary videos. Title and category come from the built-in `QS`/`FT` rows.
- Cards with nothing to import are removed from the catalogue rather than left pointing at another site (owner's rule: a question card must open on this site). Removed on 2026-11-16: 13 question rows (2 texts deleted at From Muslims, 4 questions with no answer at the source, 6 list/filter links) and 20 at-tahreek rows whose pages now redirect to the magazine home page. When removing rows, fix the `count` in `QUESTION_PARTS`/`FATWA_PARTS` and the totals written in `questions.html` / `fatwa.html`.
- Importer details: a failure `no content (redirected to …)` means the source page is gone; for magazine Q&A (title starts with "প্রশ্ন", body starts with "উত্তর") the minimum body length is 12 characters instead of 40, because one-sentence answers are complete texts; `cardTitle:true` on a source (`at`) uses the catalogue title when the page heading is empty (a few at-tahreek titles contain broken HTML).
- `read.html` is `noindex`; `app.js` re-sanitises the stored HTML (`safeArticle`) before inserting it and always shows the source credit with a link to the original.
- The texts are other publishers' work, republished on the site owner's statement that the publishers gave permission. Do not add sources without that. frommuslims.com and www.insightzonebd.com answer runners with a Cloudflare 403 on every public endpoint tried (pages, `/wp-json/wp/v2/*`, `/feed/`, sitemaps; checked 2026-11-15 with the `"ping":[urls]` request option, which records status and a short summary in `texts/_report.json`). Do not try to defeat the challenge. Both are read from Internet Archive copies instead (next point); whatever has no archived copy needs an export file from the publisher (e.g. a WordPress export) placed in the repo and converted locally.
- From Muslims (`fm`) is read from Internet Archive copies instead of the live site (`wayback:'frommuslims.com'` in the importer): one CDX query lists the latest 200 capture of every page (cached in `texts/_wayback-fm.json`; 486 of 593 catalogue pages were archived on 2026-11-15), then each page is fetched as `web.archive.org/web/<ts>id_/<url>`. The capture timestamp is stored as `w` on the text and shown in the reader credit. archive.org often answers runners with 429 or connect timeouts, so these sources run at a steady 13 s per page with one try each; busy pages are retried in later passes of the same run (`passes`, `busy`, `left` in the report), and a run is resumable. During a long run the importer itself commits and pushes `texts/` every 30 minutes (`"push":minutes`), so never push changes to `texts/` while a run is in progress: a conflicting bucket file makes the run's rebase fail and its later results are lost. `migrate()` at the start of every run corrects already stored `fm`/`iz` records when an extractor rule changes; to apply it without fetching, run `IMPORT_REQUEST='{"set":"none","hosts":[]}' NODE_PATH=<cheerio> node tools/import-texts.cjs` locally and restore `texts/_report.json` afterwards. The extractor handles Jannah-theme posts (`#the-post .entry-content`, footnotes plugin) and DW Question & Answer pages (`.dwqa-question-content` + every `.dwqa-answer-content`; question-only pages are skipped).
- Pages with no Internet Archive copy: request option `save` (`true` or a list of sources, e.g. `["fm"]`) makes the importer look up the latest copy (`web/20301231235959id_/<url>`), and when there is none (or the stored copy is a 404 page) call `https://web.archive.org/save/<url>` and read the new copy on a later pass (up to 3 save attempts per page; the save request itself often times out on the runner although the capture is made). The CDX index lags behind new captures by hours, so `texts/_wayback-*.json` is not updated by this; option `ts` (`{"<page url>":"<14-digit timestamp>"}`) pins a known capture and skips the title check of fuzzy sources. `fm` records carry `v:3` (featured-area video link kept as `a.yt-embed`); `migrate()` runs before the queue is built so records it deletes are fetched again in the same run.
- From Muslims articles can also come from archived WordPress REST pages: request option `api` (`{"fm":[1,2,[3,"<14-digit ts>"]]}`) reads `web/<ts>id_/https://www.frommuslims.com/wp-json/wp/v2/posts?per_page=50&page=N&_fields=link,date_gmt,title,content,coauthors` (create the copies first with Save Page Now; the Actions runner cannot reach the site itself). The JSON `content.rendered` goes through the normal `fm` extractor. Safety check: text length of API-built vs already stored texts must agree (median ratio 0.97–1.03, 70% within ±10%), otherwise nothing is taken (`apiForce` overrides). Author names: the API only gives co-author term ids, mapped to names learned from stored single-author texts; `apiNames` (`{"<id>":"<name>"}`) fills gaps; posts with an unknown id stay in the normal queue and are listed in `texts/_report.json` → `api.fm.unknown`. Rows whose URL changed are matched by exact title (not for `/qna/`). Q&A items are not exposed by the API.
- The workflow commits with `git pull --rebase -X theirs`, so a conflicting `texts/` file resolves to the run's own version; concurrency group is `import-texts-b`.
- Manual texts: `tools/manual/*.txt` (header lines `u:`, `a:`, `d:`, optional `t:`, `asker:`, `asked:`, `q:`; blank line; body in a small Markdown subset) are loaded with `node tools/add-texts.cjs`, which writes the same `texts/<bucket>.json` records and adds the keys to `texts/index.json`. The address must already be a card in `app.js`. Currently 7 insightzonebd.com Q&A texts were transcribed this way from the public pages (questions 147, 148, 156, 158, 169, 171, 173); questions 133, 142 and 154 had no published answer on 2026-11-15. The insightzonebd.com articles come from Internet Archive copies of the site's older WordPress version (`iz`: `wayback` + `fuzzy:true`, because old slugs differ slightly; a fuzzy match is kept only when the archived title agrees with the card title and the page is a real article). 4 of the 11 articles were archived under a matching title. The other 7 exist only on the site's 2026 non-WordPress version, which the same `iz` extractor also reads (`.post-main .post-body`, title `h1.post-content-title`, author/date from `.post-meta-left > span`): the body often has no `<p>` tags, so loose inline runs are split wpautop-style (blank line = paragraph, single newline = `<br>`), and inline `(( … ))` notes become `<sup>n</sup>` plus a final `<h2>তথ্যসূত্র</h2><ol>` (the site does the same in its own script). Those 7 were captured with Save Page Now on 2026-11-16 and imported through `ts` pins. `"probe":[urls]` in the request file writes a DOM outline of unknown pages to `texts/_report.json` for writing a new extractor (retries busy answers `probeTries` times; `probeDepth`, `probeKids`, `sel`; `probeHtml:true` adds a tag skeleton with truncated text, `probeRaw:["<selector>",start,length]` a verbatim HTML slice plus CSS rules mentioning `.post-body`).
- An author name that is an e-mail address is never stored (`noMail`), on Q&A pages, article pages and the `api` route alike.
- Controls: `tools/import-request.json` (`set`, `hosts`, `limits`, `minutes`, bump `run` to trigger). A push that changes that file on any `arena/**` branch starts the workflow; `workflow_dispatch` works once the workflow is on `main`.

## Search index, related lists, share pages, topics (added 2026-11)
- `tools/build-site-data.cjs` regenerates `search/` (512 token shards + `meta.json` + `keys.txt`, plus the title index `titles.json` + `t00…t63.json`; `titles` as argument rebuilds only that), `rel/` (256 files) and `s/<key>.html` (one per text) from `texts/`. The import workflow runs it after every import and commits the three folders. Never edit them by hand; never `git add` half of them.
- `foldBn()`, `searchTokens()`, `searchShard()` exist twice — in `app.js` and in the builder — and must stay identical, otherwise the client looks in the wrong shard.
- Library search (`setupLibrary`, `cfg.deep`): title matches first, then rows whose text key is in `DEEP.find(query)`; cards from body-only matches carry class `qcard-deep`. The reader highlights `?q=` terms (`markHits`).
- Share links point to `s/<key>.html` (og tags + JS redirect to `read.html`). Do not add a canonical/og:url pointing at `read.html` there, or crawlers will take the generic preview.
- `topics.html` and the home-page block between `<!--topics-->` markers are generated by `tools/build-topics.cjs` from `tools/topics.json`; the page shell is copied from `questions.html`, so re-run it after changing the header/footer.
- Site URL lives in `tools/site.json`; `tools/set-domain.cjs` rewrites it everywhere (see `domain-setup.md`).
- `tools/subset-fonts.py` (needs `pip install fonttools brotli`; no build step, the site stays static) rewrites `fonts/*.woff2` down to the characters the site actually uses — 242 KB → 119 KB. Keep `--layout-features=*` (or Bengali conjuncts break) and leave the Arabic naskh file alone. Re-run it only when the *fonts* change; new copy is covered because the subset keeps the whole Bengali block. Details in the «Font glyph subsetting» section below.
- Importer option `imgCheck:true` reports the HTTP status of every image inside stored texts (`texts/_report.json` → `imgCheck`). Run 33: 1,790 unique images, 1,762 OK, 28 dead.
- TikTok was removed on the owner's instruction; do not add it back.
- Owner's personal site: `LINKS.personal` in `app.js` (`https://ebrahim-ead.github.io/ead/`) feeds every `[data-link="personal"]` element — the footer line `.copy-by` on every page («পরিচালনায়: Ebrahim Ead») and the `.about-owner` block on `about.html`. It is an external link by the owner's request (opens in a new tab); the rule that content cards stay on the site is unchanged. `.copy` is a flex row with two children, so keep the copyright text wrapped in its own `<span>`.
- Main menu: 9 links (`topics.html` = «বিষয়ভিত্তিক» sits after «প্রশ্নোত্তর», also in the footer quick links and `404.html`). The header only just holds them: `style.css` ends with a block for `#menu` — a preferred width (`flex-basis`) per tier (901–1059, 1060–1179, 1180+) with `justify-content:space-between`, so the gaps between links shrink to 4px before anything overflows (this covers wider fallback fonts when Google Fonts does not load); the “Facebook Page” label is icon-only from 901 to 1179px. After adding or renaming a menu link, measure the header at 901, 1060 and 1180 px, both with Hind Siliguri loaded and with a fallback font.
- Top clock bar is Bengali («বাংলাদেশ সময়», Bengali weekday/month, Latin digits like the rest of the site, day part রাত/ভোর/সকাল/দুপুর/বিকাল/সন্ধ্যা instead of AM/PM); the logic is in `effects.js`.
- Offline support: `sw.js` (registered at the end of `app.js`). Strategy is **network first, cache only when the network fails**, so a deploy is visible at once and no cache-busting is needed. It precaches the page shell, keeps read texts (`texts/`, `rel/`) in their own cache (300 entries) and other same-origin files in another (120), and caches Google Fonts. Do not switch it to cache-first for HTML/JS/CSS. Bump `VERSION` in `sw.js` when the precache list changes. A new top-level page should be added to `PRECACHE`.
- Library status line and pager total both come from the real row count (`rows.length`); the manifest `count` values in `app.js` are only used for the page estimate before a part is loaded and must equal the number of rows in each `*-catalog-part-NN.js`.
- The footer e-mail subscribe box was removed on the owner's instruction (2026-11); two follow buttons (`.follow`) replace it. `SUBSCRIBE_ACTION` no longer exists.

## List paging (questions.html / fatwa.html)
- The lists are paged, 20 cards a page (`LIBRARY_PAGE_SIZE`). The bar `#qpager` / `#fpager` is filled by `setupLibrary` in `app.js`: previous, "page x / y", a number box, Go, next. The "আরও দেখুন" button left inside the bar in the HTML is only a fallback for a browser still holding the old cached `app.js`; the new script overwrites it.
- Category, search text and page live in the address (`?c=`, `?s=`, `?p=`) and in `sessionStorage` (`dawahx-list-q` / `dawahx-list-f`); the back link of the reader uses the stored value.
- Row order must stay fixed (curated rows first, then the parts in manifest order), otherwise a page number would show different cards from one visit to the next.
- Do not reset the number box on `blur`: pressing Go blurs the box before the click arrives.
- The large Dhaka clock card on the home page was removed on the owner's instruction (2026-11-16). The small date/time line at the top of every page stays.

## Smarter + professional pass (2026-11-17)

- **`robots.txt`** (root) allows everything and points at `sitemap.xml`. It is a plain static file; keep it next to `sitemap.xml`.
- **`sitemap.xml`**: 9 URLs, `<lastmod>` bumped when a page changes (2026-11-17 last). `read.html`, `saved.html` and `s/*.html` are `noindex` and must stay out of it.
- **`stats.json`** = `{texts,fatwas,articles,questions,videos,topics,updated}` — the single source for every count shown in the UI. Generate it with `node tools/build-stats.cjs` (reads `search/meta.json`, the `*-catalog-part-*.js` chunks, `tools/topics.json`, `youtube-videos.json`).
  - `tools/update-videos.cjs` rewrites only the `videos` field after it adds videos, so the workflow commits `stats.json` together with the list.
  - `.github/workflows/import-texts.yml` runs `build-stats` after `build-site-data` and commits `stats.json`.
  - The home page strip (`.home-stats` → `ul.stat-strip`) is filled by a block at the end of `app.js`: it fetches `stats.json` and replaces each `[data-stat]` number. The HTML numbers are only a fallback for no-JS/SEO — never hand-edit them into a new truth.
- **JSON-LD**: `index.html` carries the full `@graph` (WebSite + Organization). The other pages (about, services, questions, fatwa, videos, ask, contact, topics) carry a compact `WebSite` block inserted before `</head>`. Keep one `application/ld+json` block per page; `node -e` parse check is enough to validate.
- **Reader tools** (`read.html`, block in `app.js` guarded by `#read-tools`):
  - `A−` / `A+` set `--read-scale` on `<article id="read">` (0.85–1.4, stored in `localStorage` `dawahx-read-scale`); `.article-body` font-size is `calc(17px * var(--read-scale))` and `calc(16.5px * …)` under 560 px.
  - **সংরক্ষণ করুন** stores `{k,t,c,d,f}` in `localStorage` `dawahx-saved` (max 200). Only text pages (`k` = 14 hex) can be saved; the button is disabled on video pages.
  - `saved.html` lists them (its own inline script, same storage key), with remove / clear-all and an empty state. It is `noindex` and linked from the footer quick links of the 10 main pages and from the reader toolbar.
  - `প্রিন্ট / PDF` calls `window.print()`; `@media print` in `style.css` hides the chrome and turns the article to black-on-white (12 pt), hiding the video frame.
- **New video badge**: `youtube-gallery.js` adds `.video-new` («নতুন») when `publishedAt` is inside `NEW_DAYS` (14). Videos without `publishedAt` never get the badge.
- **Service worker**: `VERSION` is `v2`; `PRECACHE` also holds `saved.html` and `stats.json`. `netlify.toml` sends `Cache-Control: public, max-age=0, must-revalidate` for `/sw.js`.
- **Library summary list**: `.library-summary` under the heading of `#questions` / `#fatwa` is **one wrapping row of round pills** (`display:flex;flex-wrap:wrap;gap:8px`, `.library-stat{border-radius:999px}`). It was briefly turned into a vertical list on 2026-11-17 and the owner asked for the original layout back the same day — keep the pills, do not stack them.
- **Stale file removed**: `catalog-counts.json` was outdated (its `fatwas_unique` was 12,796 against 19,025 references) and nothing reads it; deleted. The page numbers on `fatwa.html` / `questions.html` are the “unique references” metric (12,780 + 5,853 = 18,633; 911 Q&A rows) and are kept as they were — do not “fix” them from a raw catalogue row count (18,631 / 911 rows), the two metrics differ.

## Full-site audit + live motion pass (2026-11-17)

Audited 12 pages × 9 viewports (320/360/390/412/768/1024/1280/1440/1920) plus interactions (menu, lightbox, library search/chips/pager, ask form, reveal, back-to-top) and 4× CPU-throttled performance. Result: no console errors, no horizontal overflow, CLS 0, DCL < 1 s. Two real defects were found and fixed, and a set of compositor-friendly animations was added.

**Fixed**
- Ask-form honeypot `#abot` sat at `left:-9999px`. It is now a clipped `span` (`clip-path:inset(50%)`) with a 1×1, `opacity:0`, `pointer-events:none` input — same anti-bot effect, no off-screen geometry.
- Inline links inside `.qnote`, `.home-topics-all`, `.saved-empty` and the breadcrumbs were 21–25 px tall on phones. Under 560 px they are now ≥ 32 px (WCAG 2.5.8 wants 24 px).

**New motion (all transform/opacity, all disabled under `prefers-reduced-motion: reduce`)**
- **Smart header** (`effects.js`): while scrolling down the header slides away (`header.top.is-away`), and any upward movement brings it back. It never hides when `body.menu-open`, when `scrollY < 140`, or when focus is inside the header (`focusin`). Deltas are accumulated, so slow trackpad scrolling works too.
- **Scroll ring** on `.back-to-top`: `--pct` (0–100) is written by the existing `updateProgress()`; CSS paints a masked `conic-gradient` ring.
- **Stat count-up** (`app.js`): home strip numbers animate from 0 to the `stats.json` value over ~1 s with an ease-out; values < 20 and reduced-motion users are set directly.
- **Thumbnail shimmer + fade** (`youtube-gallery.js`): `render()` sets `#video-grid[data-fade="1"]`; the CSS then shows a shimmer and fades each `<img>` in when it gains `.is-loaded`. Static (no-JS) cards in `videos.html` are unaffected because the attribute is only set by JS.
- **Live ring on the «নতুন» badge** (`.video-new::after`, `@keyframes newRing`).
- **Live sheen** on the hero primary button (`.hero .btn.fill::after`, `@keyframes liveSheen`, every 7.5 s).
- **Touch press feedback** under `@media (hover:none)`.
- **Scroll-driven card rise** using `animation-timeline: view()` behind `@supports`, for `.discover-card`, `.library-link`, `.saved-row`; range `entry 4% → entry 62%` so a card is fully opaque as soon as it is in view (and stays opaque while being read).

**Do not** re-add `left:-9999px` hiding, put the library summary back on one line, or animate `box-shadow`/`filter` for the badge ring — the ring is a scaled pseudo-element for exactly that reason.

- **No play-button overlay on video cards** (owner's instruction, 2026-11-17): the red circular `.play-button` was removed from `youtube-gallery.js`, from the 20 static cards in `videos.html`, and its CSS rules were deleted. The whole `.video-preview` thumbnail is the play target and its `aria-label` already says the video plays on the page; clicking still opens the lightbox. Do not re-add the circle.

## Site-wide search, listen button, Hijri date, 404 search (2026-11-17)

**Site-wide search palette** (`app.js`, `const DXP`)
- Two triggers, because the desktop header has no free width: `#dxp-open` sits in `header.top .acts` and is shown at ≤900 px (the desktop menu is hidden there, so there is room); `#dxp-open-bar` is absolutely positioned in `.site-clockbar` and shown at ≥901 px. Neither adds width to the header. Both open `dialog#dxp` with `showModal()`.
- Keyboard: `Ctrl/⌘+K` toggles, `/` opens when no field is focused, `Esc` closes, `↑`/`↓` move the active result, `Enter` opens it.
- Data: **title index only** — `search/titles.json` + `search/tNN.json` (`SUGGEST.tshard`), ids decoded with `DEEP.ids`, titles resolved through `rel/NN.json` (`SUGGEST.rel`). Ranking is the rarity-weighted share of matched terms over the matched/all-terms weights (`log(N/(1+set))`), terms built from `searchTokens` + `searchAlts` minus `DEEP.stop` / `ASK_SKIP`. No full-text scan happens here; that is the questions page's job.
- `DEEP.stop` is only filled by `DEEP.init()` (called from `SUGGEST.init()`), so **`await SUGGEST.init()` must come before `terms()`** — otherwise the palette shows “সার্চের তথ্য আনা যায়নি”.
- `#dxp-all` → `questions.html?s=<query>` (the library search restores `?s=`), shown only when there are title results. The “no result” state says there was no match *in the titles* and links to the full-text search — keep that wording honest.
- The empty state prints the text count from `stats.json` via `DXP.total()` (fallback 20,005).

**«পড়ে শুনুন»** (`read.html` + the block after the reader section in `app.js`)
- Uses the browser's own `speechSynthesis` with a `bn*` voice — no server, no audio files. The text is `#read-title` + `#read-body` innerText, split at sentence boundaries into ≤170-character chunks and spoken in order (`onend` → next, 70 ms gap).
- `#read-listen` (`aria-pressed`) toggles speak/stop, `#read-listen-label` flips between «পড়ে শুনুন» and «শোনা থামান». No speech synthesis at all → the button removes itself; speech synthesis but no Bengali voice → `#read-listen-note` explains how to add one.

**Hijri date** (`effects.js`, clock block)
- `.site-clock-hijri` (`#site-hijri`) is injected into `.site-clock-inner` on every page from `Intl.DateTimeFormat('bn-BD-u-nu-latn',{calendar:'islamic-umalqura',timeZone:'Asia/Dhaka'})`, era dropped, «… হিজরি». Its `title` says the date is calculated, because local moon sighting can differ by a day — never present it as an official announcement.
- The `•` in front is CSS (`::before`), so the JS never handles the separator.

**404 page** — still self-contained (own `<style>` + script, no site CSS/JS). It now has `form[data-search]` (`name="s"`) whose `action` the inline script points at `<root>questions.html`, so a visitor who mistyped a URL can search instead of leaving. Keep it dependency-free.

**Header width (measured)** — logo + `#menu` + `.acts` is wider than `.wrap` between about 1180 and 1560 px, which pushed the Facebook pill partly off-screen (83 px overflow at 1280). `.fbp span` is now hidden in that band (as it already was ≤1179) and 1180–1279 also gets `#menu a{padding:7px 4px}`. After that: 0 px horizontal overflow at 1180 / 1280 / 1366 / 1440 / 1600 / 1920. **Do not add anything else to the header without re-measuring those widths** — that is why the search trigger lives in the clock bar on desktop.

## Reading comfort, native share, tablet nav (2026-11-17, PR #22)

**«কাগজে পড়ুন» — paper reading mode (`read.html` only)**
- Toggle `#read-paper` sits in `.read-tools` (left of A−/A+ neighbours, after the size group). It sets `document.documentElement.dataset.paper="1"` and stores `dawahx-read-paper`; an inline script immediately after `<meta charset>` in `read.html` applies it **before first paint**, so the choice never flashes. The attribute name and the storage key must stay in sync.
- Every paper rule is scoped to `html[data-paper="1"] #read …`: the article band becomes `#f7f3ea`, `--text/--muted/--line/--gold2/--card` are re-declared on `#read`, and the hardcoded light colours (`#fff`, `#dfe6f0`, `rgba(255,255,255,.04)`) are overridden for headings, quotes, source boxes, share row, related cards and the tools bar.
- Header, clock bar and footer stay dark on purpose: the wordmark (`logo.webp`) is white on transparent, so a light chrome would erase the brand.
- Nothing outside `#read` may react to `data-paper`, and `@media print` still wins (it forces black-on-white).

**Reading time** — `#read-meta` gains a `.read-time` span («≈ N মিনিট») once `#read-body` holds ≥200 characters (one `MutationObserver` on the body plus two timers as a fallback). Rate: 140 words/minute (Bengali reads slower than English; ~6,100 words → «≈ 44 মিনিট»).

**Resume where you left off** — scroll fraction per text key is stored in `dawahx-pos` (`{key:{p,t}}`, max 60 entries, written at most once per animation frame and on `pagehide`). On returning to the same text, `.resume-bar` («আগেরবার যেখানে ছিলেন (N%) — সেখানে যান ↓») is inserted after `.crumbs`. It never scrolls on its own, has a dismiss `×`, and expires after 60 days.

**Native share** — when `navigator.share` exists, `shareLinks()` appends `#read-native` («শেয়ার…») to `.article-share`; it shares the title plus the same `s/<key>.html` URL the copy button uses. Browsers without it simply never get the button.

**Recent searches** — the palette keeps the last 5 successful queries in `dawahx-recent` and renders them as `.dxp-chip-recent` above the popular topics in the empty state (only when there are any).

**Tablet nav breakpoint is now 1099/1100 px** (it was 900/901).
- Reason: at 901–1024 the nine nav links need ~774 px while the header leaves them ~600 px, so the page scrolled sideways on tablets (28 px at 1024, 92 px at 960).
- ≤1099: burger menu (`.burger`, `#menu` dropdown, `matchMedia('(max-width:1099px)')` in `effects.js`), `.fbp span` hidden, search trigger `#dxp-open` in `.acts`.
- ≥1100: desktop nav; `@media(min-width:1100px) and (max-width:1179px){#menu a{font-size:14px;padding:7px 4px}}` and `@media(min-width:1180px) and (max-width:1279px){#menu a{padding:7px 4px}}`, `.fbp span` hidden ≤1279, search trigger `#dxp-open-bar` in the clock bar.
- Measured with the real webfont: **0 px horizontal overflow at 768 / 901 / 960 / 1000 / 1024 / 1099 / 1100 / 1179 / 1180 / 1280 / 1366 / 1440 / 1600 / 1920 and no clipped nav label**. If a nav item is ever added, re-run that sweep before merging.

## Speed (self-hosted fonts, WebP hero, lazy images) + «উৎস ও সংশোধন নীতি» page (2026-11-17, PR #23)

**Fonts are self-hosted — never re-add Google Fonts.**
- Files live in `fonts/` as six woff2 subsets: Hind Siliguri **bengali 400/600/700**, Hind Siliguri **latin 400/700**, Noto Naskh Arabic **arabic 400**. The `@font-face` blocks (with `unicode-range`, `font-display:swap`) are the **last block of `style.css`** — there is no `fonts.css` any more, and no `<link rel="preload" as="font">` in any page.
- Reason for inlining: a separate 4 KB `fonts.css` cost a full round trip (~400 ms on 3G) before a single glyph could start downloading; the earlier 69 KB `as="font"` preload of bengali-400 also delayed `style.css` and pushed FCP back ~0.4 s. Both were removed after measuring.
- **Weight policy:** only weights that are actually painted get a face. `font-weight:500` declarations still exist in `style.css` (menu, clock date, `.btn small`, label) — they intentionally resolve to 400. `750`/`800` intentionally resolve to 700. If you add an 800 heading, do **not** add a font file for it; measure first.
- Arabic (`Noto Naskh Arabic 400`) is used by the verse/`.aram` blocks; `600` was dropped (was 55 KB) and falls back to 400.

**Service worker is v4** (`dawahx-*-v4` caches). Shell list no longer contains `fonts.css`; it contains `hero.webp` **and** `hero.jpg`. Same-origin `/fonts/*.woff2` are cache-first with a background refresh (`FONTS` cache) — the legacy `FONT_HOSTS` branch stays only so old installs flush their Google-Fonts entries.

**Hero image** — `.hero` background is now `background-image:image-set(url(hero.webp) type("image/webp"),url(hero.jpg) type("image/jpeg"))` (webp 49.7 KB, jpg 75.9 KB fallback). `index.html` preloads `hero.webp` with `fetchpriority="high"`. Keep both files; drop the `url("hero.jpg")` shorthand only if you keep the `image-set` fallback layer.

**Images** — the first `<img>` on every page is the header wordmark and stays eager; every later `<img>` carries `loading="lazy" decoding="async"`. Do not lazy-load the header wordmark (it is above the fold and part of LCP).

**Measured on 3G (Chromium 131, 412×900 DPR2, 400 ms RTT, 400 kbps, cold cache, 5 pages; Google CDN mocked with the same woff2):**

| page | load before → after | FCP before → after | font bytes before → after | CLS before → after |
|---|---|---|---|---|
| index | 12.5 s → 9.8 s | 2.91 s → 2.73 s | 396 KB → 295 KB | 0.462 → 0.459 |
| fatwa | 9.9 s → 7.7 s | 2.37 s → 2.23 s | 344 KB → 243 KB | 0.452 → 0.481 |
| read | 9.9 s → 7.7 s | 2.39 s → 2.24 s | 344 KB → 243 KB | 0.614 → 0.544 |
| questions | 11.0 s → 8.9 s | 2.38 s → 2.26 s | 344 KB → 243 KB | 0.606 → 0.491 |
| videos | 13.1 s → 10.7 s | 2.60 s → 2.42 s | 344 KB → 243 KB | 0.843 → 0.606 |

**«উৎস ও সংশোধন নীতি» — `policy.html`**
- Seven `.pol` sections (উৎস · রেফারেন্স · সম্পাদকীয় নীতি · সংশোধন নীতি · স্বত্ব · দায়মুক্তি · যোগাযোগ) with a `.policy-jump` chip row of in-page anchors (`#sources … #contact`).
- Footer link `উৎস ও সংশোধন নীতি` is appended after `সংরক্ষিত লেখা` in the `দ্রুত লিংক` list of **all twelve pages**; `sitemap.xml` now has **10 URLs**. `body[data-page="policy"]` exists but there is no nav item, so no `.menu a.on` is set.
- **Do not put `data-reveal` on `.pol` or `.policy-jump`:** `effects.js`'s `revealSelector` does not include them, so they would never receive `.is-visible` and would stay at `opacity:0` (this actually happened during development).
- Source numbers on the page come from the corpus itself (`texts/*.json` `c`/`u` fields): আত-তাহরীক ≈11,600, আল-ইতিছাম ≈7,400, From Muslims ≈600, Response to Anti-Islam ≈370, plus ~30 from Islamic Authors/Insight Zone; the 12,780 fatwas come from the first two. Every entry keeps its original URL — the read page prints it in `#read-credit` + `#read-original`.
- The page deliberately publishes **no e-mail address**; contact is phone/WhatsApp `01783543026`, the ask form, and the Facebook page.

## Site-wide light theme with a day/night toggle (2026-11-17, PR #24)

**How it is wired**
- `html[data-theme="light"]` is the only switch. Dark stays the default: every light rule is scoped to that attribute, so a missing attribute, a broken script, or no JS leaves the site exactly as before.
- **Pre-paint:** an inline script sits directly before `<link rel="stylesheet" href="style.css"/>` on all **12** pages: `if(localStorage.getItem("dawahx-theme")==="light"){root.dataset.theme="light"; meta[theme-color].content="#f6f5ef"}`. It must stay before the stylesheet, otherwise the first frame flashes dark.
- **Toggle:** `#theme-toggle` (sun/moon inline SVGs, `.tt-sun`/`.tt-moon`) is the first child of `.acts` on every page. Logic is the last IIFE of `effects.js` (`dawahx-theme`, `aria-pressed`, `meta[theme-color]`, `<html>` attribute, `storage` event for other tabs). It never guesses from `prefers-color-scheme` — the user chose an explicit toggle.
- **Logo:** `logo.webp` is a white+gold wordmark on an opaque `#060C10` plate, so it disappears on light chrome. `logo-dark.webp` (10.7 KB, transparent, ink `#12232c`, gold `#a9700a`) is applied by `html[data-theme="light"] img.word{content:url("logo-dark.webp")}` **and** the JS `swapLogos()` (`img.dataset.themeSrc` keeps the original). Keep both paths: CSS covers first paint in Chromium/Safari, JS covers browsers where `content` on `<img>` is ignored. `logo.webp` itself must never be edited.
- **Tokens:** `html[data-theme="light"]` re-declares `--bg:#f6f5ef`, `--text:#17242c`, `--muted:#5b6b77`, `--line:#d6dad3`, `--card:#fffdf8`, `--gold:#a2700a`, `--gold2:#8a5a00` (a `#f5b81c` gold fails contrast on cream). Because `html[data-theme="light"]` has higher specificity than the two `:root` blocks, no `!important` is needed for tokens.
- **`header.top` needs `!important`:** `@media (max-width:900px),(hover:none)` sets `background:rgba(6,12,18,.96)!important`, which also matches headless/touch devices at desktop widths. The light override repeats `!important` with higher specificity.
- **Never style `dialog#dxp` itself:** the element is a full-viewport transparent box (1366×900); the visible panel is `.dxp-box`. Giving the dialog a background painted over the whole page (this happened during development). Light rules target `.dxp-box`, `.dxp-head`, `.dxp-chip`, `.dxp-close`, `.dxp-trigger`.
- The hero stays a dark photo panel in both themes (`.hero` keeps `background-color:#0a171f`, headings forced to `#fff`), because the banner image is a night scene and white-on-photo reads better than ink-on-photo.
- Print still wins: `@media print` forces white/black, and the light theme does not touch it (`emulateMediaType('print')` verifies header `display:none`, body white).
- Small-screen header: the extra 32–34 px toggle made the bar overflow at 360 px (47 px), so `@media(max-width:430px)` shrinks `.bar .word` to 38 px, `.acts` gap to 8 px and the toggle to 32 px. Do not re-add width there without re-running the 360 px check.

**Tests** — `theme.js` (local harness): 12 pages × 5 widths (360/412/768/1100/1366) × 2 themes = **789 checks, all pass** (correct attribute, background `rgb(246,245,239)` in light, logo `logo-dark.webp` in light / `logo.webp` in dark, `aria-pressed`, zero horizontal overflow, zero console errors) plus toggle → localStorage → reload (pre-paint survives) → other page keeps the theme, plus the print check. `verify.js` (dark, 12 pages × 2 widths) still **127/127**. Service worker is now **v5** and its shell includes `logo-dark.webp`.

## Lighthouse round: mobile LCP / Speed Index (2026-11-17, PR #25)

**What Lighthouse said (owner's screenshots, mobile Slow-4G):** Performance 90, FCP 1.3 s, **LCP 3.2 s**, TBT 60 ms, CLS 0, **Speed Index 4.8 s**; desktop 100 (a11y 96).

**What the local harness measured (Chromium 131, 412×823 DPR2, 150 ms RTT / 1.6 Mbps, 4× CPU, cold cache):** LCP element is the **`.hero` section**; on first load Chrome requested **six** font files (293 KB) and `style.css` alone takes ~640 ms to arrive+parse under that CPU throttle. Per-resource isolation runs showed the hero image ≈ +600 ms, fonts ≈ +440 ms, `app.js` ≈ +600 ms of LCP.

**Changes shipped in this round**
- `hero-sm.webp` (620 px wide, 31.6 KB) is served on `@media(max-width:700px)` through `image-set()`; `hero.webp` (49.7 KB) still covers larger screens. `index.html` now has **two media-scoped preloads** (`max-width:700px` → `hero-sm.webp`, `min-width:701px` → `hero.webp`). Keep the CSS breakpoint and the two `media` attributes in sync.
- **Arabic font is no longer on the critical path:** the `Noto Naskh Arabic` `@font-face` moved out of `style.css` into `fonts-arabic.css`, which `effects.js` injects **after `load`** (idle callback, 120 ms later). It is only used by `.guidance-arabic`; pages without that block download just the 866-byte CSS.
- **Hero entrance no longer hides LCP:** `fadeRise` is now `.40–.44 s` with `.02–.14 s` delays, starts at `opacity:.62` (was `0`) and no longer animates `filter:blur()`. Content is painted from the first frame, the rise is still there. Do not put `filter` or `opacity:0` on above-the-fold entrance animations.
- `app.js` gets `fetchpriority="low"` so the stylesheet, fonts and hero image win the first bandwidth slots; the script still runs before any user interaction.
- `sw.js` **v6** shell adds `hero-sm.webp` and `fonts-arabic.css`.

**Measured before → after** (median of 3 cold-cache runs, same throttling): index LCP 1613 → 1585 ms, load 2566 → 2370 ms, hero bytes 50 → 32 KB, first-load font bytes 293 → 242 KB, total 442 → 424 KB; `read` unchanged (no hero), `questions` unchanged. The sandbox is noisy (±40–200 ms between identical runs) — treat the live Lighthouse run as the authority.

**Not done yet (next candidates):** splitting `style.css` (128 KB raw / 27 KB gz) into critical + deferred, splitting `app.js` (51 KB gz), and a glyph subset of the three Bengali weights based on the corpus.

## Font glyph subsetting: 242 KB → 119 KB (2026-11-17, PR #26)

**Why:** first load pulled five `fonts/*.woff2` (242 KB) although the whole site only uses **80 distinct Bengali characters**. The shipped Hind Siliguri files carry the full Devanagari/Bengali glyph inventory plus every conjunct form, most of which no page ever asks for.

**What changed** — the five Hind Siliguri files were rewritten by `tools/subset-fonts.py` (fonttools):

| file | before | after |
|---|---|---|
| `hind-siliguri-bengali-400-normal.woff2` | 69.4 KB | **37.1 KB** |
| `hind-siliguri-bengali-600-normal.woff2` | 73.0 KB | **36.7 KB** |
| `hind-siliguri-bengali-700-normal.woff2` | 71.2 KB | **32.8 KB** |
| `hind-siliguri-latin-400-normal.woff2` | 14.1 KB | **6.1 KB** |
| `hind-siliguri-latin-700-normal.woff2` | 14.1 KB | **6.0 KB** |
| total | 242.0 KB | **118.8 KB (−51 %)** |

Filenames are unchanged, so no CSS/markup had to move. `noto-naskh-arabic-arabic-400-normal.woff2` is **deliberately not subsetted** (`EXCLUDE` in the script): it is lazily injected by `effects.js`, so it is not on the LCP path, and dropping rare Quranic harakat/ligatures is a visible risk for no first-load gain.

**How to re-run it** (`fonttools` is not a build dependency — the site stays build-free):
```
python3 -m pip install fonttools brotli
python3 tools/subset-fonts.py          # rewrites fonts/*.woff2
python3 tools/subset-fonts.py --dry    # report only
```
The script builds the character set from the served text (`*.html`, root `*.js`/`*.json`, `texts/*.json`, `*.xml`) **plus the entire Bengali block U+0980–09FF**. Including the whole block was measured to cost 0 extra bytes, and it means new Bengali copy renders in Hind Siliguri instead of falling back — so **new content does not require re-subsetting** (only a new script does).

**Rules that must not be broken**
- `--layout-features=*` is mandatory. Without the Indic features (`akhn`, `half`, `blwf`, `pstf`, `pref`, `abvs`, …) conjuncts like ক্ষ / ন্ত / ঞ্জ render with visible dotted circles.
- `@font-face unicode-range` is untouched: anything outside the subset (Devanagari, Greek, Hebrew, Syriac — present in `texts/` source material) falls back to the system font exactly as it did before, never tofu.
- **Re-run and re-verify after changing fonts**, not after changing copy.

**Verification** — the subset was compared glyph-by-glyph against the originals: 1,600 Bengali tokens taken from the corpus (1,200 of them contain a virama, i.e. conjuncts) × 3 weights were rendered in Chrome on a canvas with the old and the new font; all **4,800** renders are pixel-identical (ink pixel count + alpha sum). The Latin subset's cmap covers all 95 printable ASCII characters. `node --check sw.js` passes.

**Bumped `sw.js` to v7** — the font bytes changed, so the old service-worker cache must be dropped.

**Local Lighthouse 12.8, `index.html`, cold cache** (sandbox is noisy; ±1 point between identical runs):

| | FCP | LCP | SI | TBT | CLS | perf |
|---|---|---|---|---|---|---|
| mobile before | 2.6 s | 3.5 s | 2.6 s | 0 ms | 0.075 | 86 |
| mobile after | **2.0 s** | **2.8 s** | **2.0 s** | 50 ms | 0.082 | **93** |
| desktop before | 0.5 s | 0.7 s | 0.6 s | 0 ms | 0.062 | 99 |
| desktop after | 0.4 s | 0.5 s | 0.5 s | 0 ms | 0.024 | **100** |

Accessibility/Best-Practices/SEO stay 100/100/100. First-load font bytes are now 119 KB instead of 242 KB; the biggest remaining item is render-blocking `style.css` (27 KB gz, 21 KB unused on `index.html`).

**Tried and rejected:** splitting `style.css` into per-page files with a selector-list splitter. It works (verified: 1,411/1,411 selector→declaration pairs preserved), but it only moves 5.6 KB raw / 1.4 KB gz out of `index`, which does not pay for a second request on the four affected pages. A worthwhile CSS split has to be component/page-set based, not per-file.

## Image re-encode + CSS split investigated (2026-11-17, PR #27)

**Images (the only bytes worth cutting under the mobile budget)**

| file | before | after | how |
|---|---|---|---|
| `hero-sm.webp` (620×381, ≤700 px) | 32.3 KB | **25.0 KB** | re-encoded from the 891 px master, WebP `method=6` `-quality 74` |
| `hero.webp` (891×547, ≥701 px) | 50.9 KB | **42.2 KB** | same master, `method=6` `-quality 76` |
| `logo.webp` (was 700×179) | 16.2 KB | **11.0 KB** | 520×133 — the logo is never shown wider than 300 CSS px |

- **`hero-sm.webp` must always be re-encoded from `hero.webp` (or a bigger master), never from the previous `hero-sm.webp`** — re-compressing a compressed file stacks artefacts. The PSNR of the new hero-sm against the old file is 34.6 dB, but it is *sharper* than the old one because it comes straight from the master.
- **`logo-dark.webp` is deliberately untouched**: every re-encode at 480–620 px came out **larger** (15.8–20.4 KB) than the existing 10.7 KB file. It is flat art with an alpha mask — the original encoder already won. Same for `logo-icon.webp`.
- `<img>` `width`/`height` attributes were **not** changed (they carry the 700×179 ratio, which is what prevents layout shift); only the files shrank. Aspect ratios are identical, so nothing re-flows.
- `sw.js` → **v8** (the shell cache holds these images).

**Investigated and rejected — do not redo these**

- **Per-page `style.css` split.** Built a correct splitter (selector lists split per bucket, `@media print`/`@keyframes`/`@font-face` pinned to core) and verified 1,411/1,411 selector→declaration pairs survive. It only moves **5.6 KB raw / 1.4 KB gz** out of `index.html`, for an extra request on four pages. Dropped. Any profitable CSS split has to be page-set/component based, and the structural ceiling is low: `index.html`'s own markup still needs **97.3 KB of the 116.8 KB** of rules (83 %), because the home page carries the search overlay, the dialogs and the card/stat components.
- **Dead CSS.** Only **3.2 KB** of rules cannot match any page's markup *and* are absent from the JS — and most of those (`.saved-link`, `.saved-del`, `.qmore-count`, …) are built at runtime by `app.js` string templates, so deleting them would break the saved/read UIs. Nothing to prune.
- **`defer` on `app.js` + `effects.js`.** Tested on `index.html`: mobile stayed at 93 (LCP 2.7 s, TBT 50 → 20 ms, inside noise). Reverted — the scripts already sit at the end of `<body>`, so there is no parser blocking to remove, and deferring changes the execution order relative to any future inline script.
- Lighthouse's "render-blocking `style.css`" (≈307 ms) and "unused CSS 21 KB" are real but not addressable by splitting: the rules that never match at snapshot time are hover/focus/dialog/print/other-page states, all of which must be present when they are needed.

**Local Lighthouse 12.8, `index.html`, cold cache**

| | FCP | LCP | SI | TBT | CLS | perf |
|---|---|---|---|---|---|---|
| mobile (start of this round) | 2.0 s | 2.8 s | 2.0 s | 50 ms | 0.082 | 93 |
| mobile (now) | 2.0 s | **2.7 s** | 2.0 s | 30 ms | 0.082 | **93** |
| desktop | 0.5 s | 0.5 s | 0.5 s | 0 ms | 0.024 | 100 |

First-load bytes on `index.html` are now ≈ **237 KB** (was 258 KB after the font round, 410 KB before any perf work).

**The remaining lever is fonts** (119 KB of the 237 KB): three Bengali weights. Dropping the 600 weight (37 KB) and letting headings use 700 would buy ~0.2 s of LCP under Slow-4G, at the cost of visibly heavier headings — an owner decision, not a technical one.

## Footer quick links: two columns on phones (2026-11-17, PR #28)

**Why:** the footer's «দ্রুত লিংক» block is eleven links. On phones the `.fg` grid collapses to one column (`@media(max-width:560px)`), so the block ran taller than the rest of the footer put together.

**What changed**
- Markup: the list is now `<h2>দ্রুত লিংক</h2><ul class="qlinks">` on all **12** pages (`404.html` and `__forms.html` have no footer grid). The class is what keeps the rule off the other footer lists.
- `style.css` (right after the `.fg li a` tap-target rules):
  ```css
  @media(max-width:560px){.fg ul.qlinks{display:grid;grid-template-columns:1fr 1fr;column-gap:14px;row-gap:0}
   .fg ul.qlinks li{min-width:0}
   .fg ul.qlinks li a{font-size:15px}}
  @media(max-width:360px){.fg ul.qlinks li a{font-size:14px}}
  ```
- The grid is **row-major**, so short and long labels pair up (হোম | আমাদের সম্পর্কে …) instead of one column of long names and one of short ones.
- `sw.js` → **v9**.

**The trap: do not give `.fg li a` `display:block` here.** `li::before` renders the `›` bullet as *inline* content; a block-level child forces the bullet into its own line box, so every item became **56 px** tall and the two-column block only saved 30 px overall. With the existing `inline-block` a row is **33 px** and the block is 209 px at 412 px wide (was 364 px). Same reason not to reach for `columns:2` — multi-column keeps whole items but reorders them into a magazine-style column flow that reads worse for a nav list.

**Verification** — Chromium 131, all 12 pages at 412 px: two columns, 11 items (9 on `saved.html`, which has a shorter footer list), **no horizontal overflow, no console errors**. Footer screenshots at 320/360/412/560/561/700/900/1366: two columns at ≤560, single column from 561 up (desktop layout unchanged — the list still lives in its own `1.1fr` cell). No label wraps at any width ≥320 px.

**Pre-existing, not fixed here:** at **320 px** the *page* scrolls horizontally by 36 px (`documentElement.scrollWidth` 356). The culprit is the header's `.acts`/`.burger` row, not the footer. Next candidate if 320 px matters.

### 320 px header overflow (same PR)

`documentElement.scrollWidth` was **356 px on a 320 px screen**: the header row (logo 149 px + `.acts` 177 px + `10px` gap) needs ~336 px inside a 280 px content box, so the whole page could be dragged sideways.

Fix — a new `@media(max-width:360px)` block right after the ≤430 px one:
```css
@media(max-width:360px){
 .bar{gap:8px;padding-left:16px;padding-right:16px}
 .bar .word{height:34px}
 .fbp{display:none}
}
```
- Shrinking every control until it fits was measured to leave ~5 px of slack and would have pushed the theme toggle and the search button below their current 32/38 px; the **Facebook pill is the one item with a duplicate** (footer «সামাজিক যোগাযোগ» and the menu), so it is the one that goes at ≤360 px. Everything else keeps its size and its tap target.
- After the fix: `scrollWidth == innerWidth` on **all 13 pages** at 320 px, and the header height stays 64 px. Checked at 280/300/320/340/360/361/412 — no overflow, and ≥361 px is unchanged.
- If the Facebook pill must stay on tiny phones too, the alternative is `.theme-toggle`/`.dxp-trigger` down to 30/34 px **and** a 32 px logo — tighter and worse for tapping.
