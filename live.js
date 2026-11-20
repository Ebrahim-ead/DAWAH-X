/* DAWAH X — "এখন লাইভ" (live.json দেখে নিজে থেকে দেখায়)
   live.json তৈরি হয় GitHub Actions-এ (.github/workflows/live-status.yml); এখানে শুধু দেখানো হয়।
   কোনো চ্যানেল লাইভ না থাকলে কিছুই দেখা যায় না — পাতার বিন্যাসে কোনো পরিবর্তন হয় না। */
'use strict';
(function () {
  var slot = document.getElementById('live-slot');
  if (!slot) return;
  var script = document.currentScript;
  var base = new URL('.', script ? script.src : location.href);
  var ENDPOINT = new URL('live.json', base).href;
  var THUMB = function (id) { return 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault_live.jpg'; };
  var bnDigit = function (n) { return String(n).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; }); };
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
    var cards = list.map(function (v) {
      var live = v.id ? THUMB(v.id) : '';
      return '<article class="live-card" data-video-id="' + esc(v.id) + '">'
        + '<button class="live-media" type="button" aria-label="' + esc(v.title || 'লাইভ') + ' — এখানেই লাইভ দেখুন">'
        + (live ? '<img alt="" decoding="async" loading="lazy" src="' + live + '"/>' : '')
        + '<span class="live-tag"><i aria-hidden="true"></i>লাইভ</span>'
        + '<span class="live-play-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>'
        + '</button>'
        + '<div class="live-meta"><span class="live-channel">' + esc(v.channel || '') + '</span>'
        + '<h3>' + esc(v.title || 'লাইভ সম্প্রচার') + '</h3>'
        + '<a class="live-out" href="https://www.youtube.com/watch?v=' + esc(v.id) + '" target="_blank" rel="noopener">YouTube-এ দেখুন</a></div>'
        + '</article>';
    }).join('');
    /* <section> নয়: style.css-এ body[data-page=…] section:not(#…) {display:none!important} আছে,
       তাই কার্ড অদৃশ্য হয়ে যেত — div + role=region একই অর্থ দেয়, নিয়মে আটকায় না */
    slot.innerHTML = '<div class="live-now" role="region" aria-labelledby="live-now-title">'
      + '<div class="live-head"><span class="live-pulse" aria-hidden="true"></span>'
      + '<h2 id="live-now-title">এখন লাইভ</h2>'
      + '<span class="live-note">' + bnDigit(list.length) + 'টি সম্প্রচার চলছে</span></div>'
      + '<div class="live-list">' + cards + '</div></div>';
    slot.hidden = false;
    slot.querySelectorAll('.live-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        var btn = e.target.closest('.live-media');
        if (!btn || card.dataset.playing) return;
        var id = card.getAttribute('data-video-id');
        if (!id) return;
        card.dataset.playing = '1';
        var frame = document.createElement('iframe');
        frame.className = 'live-frame';
        frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
        frame.title = card.querySelector('h3') ? card.querySelector('h3').textContent : 'লাইভ';
        frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
        frame.allowFullscreen = true;
        btn.replaceWith(frame);
      });
    });
  }

  var last = '';
  function load() {
    fetch(ENDPOINT + '?t=' + Date.now(), { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var list = (data && data.live) || [];
        var sig = JSON.stringify(list);
        if (sig === last) return;
        last = sig;
        render(list);
      })
      .catch(function () { /* ইন্টারনেট নেই বা ফাইল নেই — আগের অবস্থাই থাকে */ });
  }

  load();
  /* পাতা খোলা থাকলে দুই মিনিটে একবার দেখা হয় (শুধু দেখা যায় এমন ট্যাবে) */
  setInterval(function () { if (!document.hidden) load(); }, 120000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
})();
