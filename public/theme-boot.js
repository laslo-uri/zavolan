/* global document, localStorage */
(function () {
  try {
    var APP_SLUG = 'zavolan';
    var t = localStorage.getItem(APP_SLUG + '-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch {
    /* storage may be unavailable */
  }
})();
