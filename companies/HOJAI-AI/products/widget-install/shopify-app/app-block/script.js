/**
 * Shopify Checkout Extension
 * Adds HOJAI Widget to checkout page
 */
(function() {
  'use strict';

  // Load widget on checkout
  function initWidget() {
    // Get settings (these would come from Shopify checkout settings in production)
    const script = document.createElement('script');
    script.src = 'https://cdn.hojai.ai/widget.js';
    script.async = true;
    script.onload = function() {
      if (window.HojaiWidget) {
        window.HojaiWidget.init({
          apiKey: '{{ settings.hojai_api_key }}',
          companyId: '{{ shop.permanent_domain }}',
          position: '{{ settings.hojai_position }}',
          color: '{{ settings.hojai_color }}',
          pageType: 'checkout',
          cart: {
            total: '{{ checkout.total_price | money }}',
            items: [
              {% for item in checkout.line_items %}
              {
                id: '{{ item.product_id }}',
                name: {{ item.title | json }},
                price: '{{ item.final_price | money }}',
                quantity: {{ item.quantity }}
              },
              {% endfor %}
            ]
          },
          customer: {
            email: {{ checkout.email | json }},
            firstName: {{ checkout.first_name | json }},
            lastName: {{ checkout.last_name | json }}
          }
        });
      }
    };
    document.head.appendChild(script);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
