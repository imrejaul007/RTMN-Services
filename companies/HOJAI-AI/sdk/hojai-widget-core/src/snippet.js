/**
 * HOJAI Widget — auto-init snippet.
 * Loaded by the <script> tag in user's HTML.
 *
 * Two config modes:
 *
 *   1. data-* attributes (most common, recommended for plain HTML/Shopify/WordPress):
 *
 *      <script src="https://cdn.hojai.ai/widget.js"
 *              data-key="pk_live_abc"
 *              data-company="maya-collective"
 *              data-color="#3B82F6"
 *              defer></script>
 *
 *   2. window.hojaiWidgetConfig global (recommended for Webflow + other no-DOM-attribute builders):
 *
 *      <script>
 *        window.hojaiWidgetConfig = {
 *          apiKey: 'pk_live_abc',
 *          companyId: 'maya-collective',
 *          color: '#3B82F6',
 *          position: 'bottom-right',
 *          name: 'Maya Assistant',
 *          greeting: 'Hi! How can I help?'
 *        };
 *      </script>
 *      <script src="https://cdn.hojai.ai/widget.js" defer></script>
 *
 *   data-* attributes take precedence over window.hojaiWidgetConfig if both are present.
 *   Either apiKey (camelCase) or api_key (snake_case) accepted in the global config.
 */
(function () {
  if (typeof window === 'undefined') return;

  function start() {
    // 1. Try data-* attributes on the script tag first
    var s = document.currentScript || (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

    var config = {};

    var apiKey = s.getAttribute('data-key');
    var companyId = s.getAttribute('data-company');
    if (apiKey && companyId) {
      config.apiKey = apiKey;
      config.companyId = companyId;
      config.color = s.getAttribute('data-color') || undefined;
      config.position = s.getAttribute('data-position') || undefined;
      config.name = s.getAttribute('data-name') || undefined;
      config.language = s.getAttribute('data-lang') || undefined;
      config.greeting = s.getAttribute('data-greeting') || undefined;
    }

    // 2. Fall back to window.hojaiWidgetConfig (Webflow + custom code scenarios)
    if ((!config.apiKey || !config.companyId) && window.hojaiWidgetConfig) {
      var g = window.hojaiWidgetConfig;
      config.apiKey = g.apiKey || g.api_key;
      config.companyId = g.companyId || g.company_id || g.company;
      config.color = g.color;
      config.position = g.position;
      config.name = g.name;
      config.language = g.language || g.lang;
      config.greeting = g.greeting;
    }

    if (!config.apiKey || !config.companyId) {
      console.warn('[hojai] apiKey and companyId are required (via data-* attrs or window.hojaiWidgetConfig)');
      return;
    }

    // Move non-API fields into a nested config object expected by HojaiWidget
    var widgetConfig = {
      name: config.name,
      color: config.color,
      position: config.position,
      language: config.language,
      greeting: config.greeting
    };
    // Strip undefined
    Object.keys(widgetConfig).forEach(function (k) {
      if (widgetConfig[k] === undefined) delete widgetConfig[k];
    });

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
        apiKey: config.apiKey,
        companyId: config.companyId,
        config: widgetConfig
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
