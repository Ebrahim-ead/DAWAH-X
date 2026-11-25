/* Shared site navigation and theme controls on the Quran/Hadith readers. */
(function () {
  'use strict';
  var root = document.documentElement, menu = document.getElementById('menu');
  var burger = document.getElementById('burger'), button = document.getElementById('theme-toggle');
  var meta = document.querySelector('meta[name="theme-color"]'), logo = document.querySelector('header.top img.word');
  function paint(light, persist) {
    root.setAttribute('data-theme', light ? 'light' : 'dark');
    if (meta) meta.setAttribute('content', light ? '#f6f5ef' : '#08151a');
    if (logo) logo.setAttribute('src', light ? 'logo-dark.webp' : 'logo.webp');
    if (button) { button.setAttribute('aria-pressed', String(light)); button.setAttribute('aria-label', light ? 'রাতের মোডে ফিরে যান' : 'দিনের আলোয় দেখুন'); }
    if (persist) try { localStorage.setItem('dawahx-theme', light ? 'light' : 'dark'); } catch (_) {}
    window.dispatchEvent(new Event('dawahx-themechange'));
  }
  window.dawahxReaderTheme = function (theme) { paint(theme === 'light', true); };
  paint(root.getAttribute('data-theme') === 'light', false);
  if (button) button.addEventListener('click', function () { paint(root.getAttribute('data-theme') !== 'light', true); });
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function followSystem() { try { if (!localStorage.getItem('dawahx-theme') && media) paint(media.matches, false); } catch (_) {} }
  if (media && media.addEventListener) media.addEventListener('change', followSystem);
  window.addEventListener('storage', function (e) { if (e.key === 'dawahx-theme') paint(e.newValue ? e.newValue === 'light' : !!(media && media.matches), false); });
  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle('open', open); document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন');
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('pointerdown', function (e) { if (menu.classList.contains('open') && !e.target.closest('#menu,#burger')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1100 && menu.classList.contains('open')) setMenu(false); });
  }
})();
