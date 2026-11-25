/* Keep direct reader links on the existing GitHub Pages project subpath. */
(function () {
  'use strict';
  if (location.hash) return;
  var hadith = /(?:^|\/)hadith\.html$/i.test(location.pathname);
  history.replaceState(null, '', location.pathname + location.search + (hadith ? '#/hadith' : '#/surahs'));
})();
