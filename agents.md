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
- `app.js` — one script for all pages; every block checks that its elements exist. Contains the owner-editable config (`LINKS`, `MESSENGER`, `ASK_ACTION`, `SUBSCRIBE_ACTION`), the curated question/fatwa lists, `setupLibrary()` (search, category chips, paging, lazy catalogue loading) and the ask form.
- `effects.js` — menu state, Dhaka clock, scroll progress, back-to-top, video lightbox, reveal/tilt effects.
- `youtube-gallery.js` — paginated video gallery fed by `youtube-videos.json`.
- `*-catalog-part-*.js` — catalogue chunks; each assigns `window.DAWAH_QUESTIONS_PARTS[category]` / `window.DAWAH_FATWAS_PARTS[category]`. The manifests (file, category, count) are `QUESTION_PARTS` / `FATWA_PARTS` in `app.js`; chunks load only on their own page, on demand.
- `__forms.html` — Netlify Forms registration for form `question` (fields: name, contact, topic, question, bot-field).

## Non-obvious behaviour
- Library rows are `[category, title, url]`. Rows are de-duplicated by decoded URL; when a catalogue chunk repeats a curated row, the curated row is kept and the chunk's category is stored as an extra category in `row[3]`.
- `escHTML` converts Bengali digits to Latin digits for *display* (site convention). Never use it on URLs — use `escAttr`.
- Ask form delivery: `ASK_ACTION` (if set) → Netlify Forms (accepted only when the response carries a `Server: Netlify` header) → otherwise copy the question and open `m.me/<page>?text=…`. On `*.github.io` the Messenger path is used directly so the popup opens inside the user's tap.
- `[data-reveal]` elements start at `opacity:0` and are revealed by `effects.js`; a `<noscript>` style in each page keeps them visible without JavaScript.
- Headings: every page has exactly one `<h1>` (the page title); cards and footer column titles are `<h2>`, nested items `<h3>`. `youtube-gallery.js` creates video titles as `<h2>`. Keep levels sequential — CSS targets them by class + tag (e.g. `.title h1`, `.card h2`, `.fg h2`).
- UI copy is Bengali; keep it that way. Numbers in UI text use Latin digits.
