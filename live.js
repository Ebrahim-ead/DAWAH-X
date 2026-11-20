/* DAWAH X — «লাইভ দেখুন» বোতাম (live.json দেখে নিজে থেকে চালু হয়)
   live.json তৈরি হয় GitHub Actions-এ (.github/workflows/live-status.yml); এখানে শুধু বোতাম দেখানো হয়।
   - কোনো চ্যানেল লাইভ না থাকলে, তথ্য পুরোনো হলে বা ফাইল না পেলে বোতামটি একেবারেই থাকে না (জায়গাও নেয় না)।
   - বোতামে চাপ দিলে ভিডিওটি সাইটের লাইটবক্সে (effects.js) চলে — ইউটিউবে যেতে হয় না।
   - বোতামটি কেবল ভিডিও পাতায় (videos.html) আছে; হোমপেজে লাইভ অংশ নেই। */
'use strict';
(function () {
  var slot = document.getElementById('live-slot');
  if (!slot) return;
  var script = document.currentScript;
  var base = new URL('.', script ? script.src : location.href);
  var ENDPOINT = new URL('live.json', base).href;
  /* কতক্ষণ পুরোনো তথ্য বিশ্বাস করা হবে: চেক প্রতি ১০ মিনিটে চলে, তাই ৪৫ মিনিট =
     কয়েকটি রান মিস হলেই বোতাম সরে যায় — অনুমানে «লাইভ» দেখানো হয় না */
  var MAX_AGE_MS = 45 * 60 * 1000;
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function render(list) {
    if (!list || !list.length) {
      if (!slot.hidden) { slot.hidden = true; slot.replaceChildren(); }
      return;
    }
    slot.innerHTML = '<div class="live-bar" role="region" aria-label="লাইভ সম্প্রচার">'
      + list.map(function (v) {
        return '<button class="live-watch" type="button"'
          + ' data-video-id="' + esc(v.id) + '"'
          + ' data-video-title="' + esc(v.title || 'লাইভ সম্প্রচার') + '"'
          + ' aria-label="' + esc(v.title || 'লাইভ সম্প্রচার') + ' — লাইভ দেখুন">'
          + '<span class="live-dot" aria-hidden="true"></span>'
          + '<span class="live-watch-text">লাইভ দেখুন</span>'
          + (v.channel ? '<small class="live-channel">' + esc(v.channel) + '</small>' : '')
          + '</button>';
      }).join('')
      + '</div>';
    slot.hidden = false;
  }

  /* live.json-এ কেবল বৈধ ভিডিও-আইডি রাখা হয়; updated পুরোনো হলে কিছুই দেখানো হয় না */
  var state = { list: [], updated: 0 };
  var last = null;

  function adopt(data) {
    var when = Date.parse((data && data.updated) || '');
    state.updated = isFinite(when) ? when : 0;
    state.list = (data && Array.isArray(data.live) ? data.live : []).filter(function (v) {
      return v && /^[A-Za-z0-9_-]{11}$/.test(String(v.id || ''));
    });
  }
  function isFresh() { return state.updated > 0 && (Date.now() - state.updated) < MAX_AGE_MS; }
  /* কেউ লাইভ দেখছে (লাইটবক্স খোলা) — তখন বোতামটি সরানো হয় না */
  function watching() { return document.body.classList.contains('video-modal-open'); }
  function apply() {
    if (watching()) return;
    var list = isFresh() ? state.list : [];
    var sig = JSON.stringify(list);
    if (sig === last) return;
    last = sig;
    render(list);
  }

  function load() {
    fetch(ENDPOINT + '?t=' + Date.now(), { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) adopt(data); apply(); })
      .catch(function () { apply(); });  /* আনা না গেলেও পুরোনো তথ্য সময় পার হলে সরে যায় */
  }

  load();
  /* পাতা খোলা থাকলে দুই মিনিটে একবার নতুন তথ্য, আর প্রতি মিনিটে বয়স যাচাই */
  setInterval(function () { if (!document.hidden && !watching()) load(); }, 120000);
  setInterval(apply, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
})();
