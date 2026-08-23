(function () {
  try {
    var stored = localStorage.getItem('theme') || null;
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark);

    if (dark) {
      document.documentElement.classList.add('dark');
    }

    document.documentElement.dataset.theme = stored === 'system' || !stored
      ? (prefersDark ? 'dark' : 'light')
      : stored;

    if (stored && stored !== 'system') {
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    }
  } catch (e) {
    /* تجاهل آمن: في بيئات التخزين المعطلة */
  }
})();