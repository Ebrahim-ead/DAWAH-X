# YouTube video gallery (auto-updating)

The video page (`videos.html`) shows a combined gallery of videos from four public channels:

- DAWAH X (`@ead-s3b`)
- Professor Dr. Abubakar Muhammad Zakaria (`@AbuBakarMdZakaria`)
- Salafi Manhaj 2 (`@salafimanhaz.2`)
- Peace TV Bangla (`@PeaceTVprogram`)

The videos are combined into one gallery, with 20 cards per page. Visitors can search by video title or channel, use the topic/channel filter chips, use the page controls, and click a card to play the YouTube embed in a player on the website.

## Automatic updates (no API key)

New uploads are added automatically — nobody has to edit the list by hand:

- `.github/workflows/update-videos.yml` runs on a schedule (about every 30 minutes) and can also be started manually from the Actions tab ("Run workflow").
- It runs `tools/update-videos.cjs`, which reads each channel's public upload feed (`https://www.youtube.com/feeds/videos.xml?channel_id=…`, the latest 15 uploads — no YouTube API key needed) and inserts any video that is not in `youtube-videos.json` yet at the top of the list (newest first). The run commits the changed `youtube-videos.json` (and `tools/video-channels.json`) back to the repository, and GitHub Pages then publishes the new list.
- The channels are listed in `tools/video-channels.json` (`title` must match the `channelTitle` in `youtube-videos.json`; `handle` is used to find the channel id once). To watch another channel, add a row there.
- `addSince` in `tools/video-channels.json` is the earliest upload date that may be added (videos older than that are ignored, so videos deliberately left out of the original collection stay out).
- Nothing is ever removed or rewritten: old rows stay exactly as they are. If one channel's feed cannot be read, that channel is skipped for that run (a `::warning::` is written to the Actions log) and the others are still checked.
- The feed only contains each channel's **latest 15 uploads**. If a channel publishes more than 15 videos between two runs, the older ones of that batch will not be picked up. With a 30-minute schedule this is very unlikely.
- A video added automatically has no `duration` (the feed does not provide it) and uses YouTube's own thumbnail (`https://i.ytimg.com/vi/<id>/hqdefault.jpg`). The gallery does not need `duration`, and it shows the remote thumbnail directly.

## Publish

Everything lives in the GitHub Pages repository root (the same folder as `index.html`). In particular, keep `youtube-videos.json`, `youtube-gallery.js`, `videos.html`, and the `video-thumb-*.jpg` files together. The first-page cards baked into `videos.html` are only a placeholder shown before `youtube-videos.json` loads (and when JavaScript is off); the gallery replaces them with the current list as soon as the JSON arrives.

**Thumbnail file names are lowercase.** The 20 first-page thumbnails are stored as `video-thumb-<video id in lowercase>.jpg` (for example `video-thumb-mpntrch_hwa.jpg` for video `MPNtRch_hWA`). GitHub Pages is case-sensitive, so the gallery lowercases the `thumbnail` name from `youtube-videos.json` before loading it; every other video uses YouTube's own thumbnail. If a local file is missing, the gallery falls back to the YouTube thumbnail automatically.

The video player is an embedded YouTube player. YouTube or a channel owner can restrict playback for an individual video (for example, disable embedding, age/region restrict it, or remove it), so those individual videos may show a YouTube restriction message. The in-app preview sandbox blocks YouTube/network content; test actual playback on the published website.
