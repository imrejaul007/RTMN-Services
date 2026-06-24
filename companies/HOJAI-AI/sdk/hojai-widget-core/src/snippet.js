/**
 * HOJAI Widget — auto-init snippet.
 * Loaded by the <script> tag in user's HTML.
 */
(function () {
  if (typeof window === 'undefined') return;

  function start() {
    var s = document.currentScript || (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

    var apiKey = s.getAttribute('data-key');
    var companyId = s.getAttribute('data-company');
    if (!apiKey || !companyId) {
      console.warn('[hojai] data-key and data-company are required');
      return;
    }

    var color = s.getAttribute('data-color') || '#3B82F6';
    var name = s.getAttribute('data-name') || 'HOJAI Assistant';
    var position = s.getAttribute('data-position') || 'bottom-right';
    var language = s.getAttribute('data-lang') || 'en';
    var greeting = s.getAttribute('data-greeting') || null;

    if (window.HojaiWidget) {
      initWidget(window.HojaiWidget);
      return;
    }

    var attempts = 0;
    var iv = setInterval(function () {
      if (window.HojaiWidget) {
        clearInterval(iv);
        initWidget(window.HojaiWidget);
      } else if (++attempts > 50) {
        clearInterval(iv);
        console.error('[hojai] failed to load widget bundle');
      }
    }, 100);

    function initWidget(HW) {
      var w = new HW({
        apiKey: apiKey,
        companyId: companyId,
        config: {
          name: name, color: color, position: position, language: language,
          greeting: greeting || undefined
        }
      });
      w.render();
      window.HojaiWidgetInstance = w;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
