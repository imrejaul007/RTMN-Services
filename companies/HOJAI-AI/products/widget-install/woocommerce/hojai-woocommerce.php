<?php
/**
 * Plugin Name: HOJAI SiteOS for WooCommerce
 * Plugin URI: https://hojai.ai
 * Description: AI assistant for WooCommerce - knows your products, tracks customers, recovers abandoned carts
 * Version: 1.0.0
 * Author: HOJAI
 * Author URI: https://hojai.ai
 * Text Domain: hojai-woocommerce
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * WC requires at least: 4.0
 * WC tested up to: 8.0
 * License: GPL-2.0+
 */

if (!defined('ABSPATH')) exit;

define('HOJAI_WC_VERSION', '1.0.0');
define('HOJAI_WC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('HOJAI_WC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('HOJAI_WC_API_URL', 'https://api.hojai.ai/v1/widget');

register_activation_hook(__FILE__, 'hojai_wc_activate');
register_deactivation_hook(__FILE__, 'hojai_wc_deactivate');

function hojai_wc_activate() {
    add_option('hojai_wc_api_key', '');
    add_option('hojai_wc_company_id', '');
    add_option('hojai_wc_enabled', '1');
    add_option('hojai_wc_position', 'bottom-right');
    add_option('hojai_wc_color', '#3B82F6');
    add_option('hojai_wc_greeting', 'Hi! How can I help you today?');
    add_option('hojai_wc_track_add_to_cart', '1');
    add_option('hojai_wc_track_checkout', '1');
    add_option('hojai_wc_track_purchase', '1');
    add_option('hojai_wc_track_refund', '1');
    flush_rewrite_rules();
}

function hojai_wc_deactivate() {
    flush_rewrite_rules();
}

class HOJAI_WooCommerce {

    public function __construct() {
        // Frontend
        add_action('wp_footer', array($this, 'render_widget'));

        // WooCommerce Events
        add_action('woocommerce_add_to_cart', array($this, 'track_add_to_cart'), 10, 6);
        add_action('woocommerce_after_checkout_form', array($this, 'track_checkout_start'));
        add_action('woocommerce_checkout_order_processed', array($this, 'track_purchase'), 10, 3);
        add_action('woocommerce_order_status_changed', array($this, 'track_order_status'), 10, 4);

        // REST API
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // Admin
        if (is_admin()) {
            add_action('admin_menu', array($this, 'add_admin_menu'));
            add_action('admin_init', array($this, 'register_settings'));
        }

        // AJAX
        add_action('wp_ajax_hojai_track_event', array($this, 'ajax_track_event'));
        add_action('wp_ajax_nopriv_hojai_track_event', array($this, 'ajax_track_event'));

        // Shortcode
        add_shortcode('hojai_widget', array($this, 'shortcode'));
    }

    // ─── Widget Rendering ────────────────────────────────────────────

    public function render_widget() {
        if (!get_option('hojai_wc_enabled')) return;
        if (!get_option('hojai_wc_api_key')) return;

        $api_key = get_option('hojai_wc_api_key');
        $company_id = get_option('hojai_wc_company_id') ?: $this->get_company_id();
        $position = get_option('hojai_wc_position', 'bottom-right');
        $color = get_option('hojai_wc_color', '#3B82F6');
        $greeting = get_option('hojai_wc_greeting', 'Hi! How can I help you?');

        $page_type = $this->get_page_type();
        $cart_data = $this->get_cart_data();
        $product_data = $this->get_product_data();
        ?>

        <script>
        window.hojaiConfig = {
            apiKey: '<?php echo esc_js($api_key); ?>',
            companyId: '<?php echo esc_js($company_id); ?>',
            position: '<?php echo esc_js($position); ?>',
            color: '<?php echo esc_js($color); ?>',
            greeting: '<?php echo esc_js($greeting); ?>',
            pageType: '<?php echo esc_js($page_type); ?>',
            cart: <?php echo wp_json_encode($cart_data); ?>,
            product: <?php echo wp_json_encode($product_data); ?>,
            storeName: '<?php echo esc_js(get_bloginfo('name')); ?>',
            currency: '<?php echo esc_js(get_woocommerce_currency()); ?>',
            currencySymbol: '<?php echo esc_js(get_woocommerce_currency_symbol()); ?>'
        };
        </script>
        <script src="https://cdn.hojai.ai/widget.js" async defer></script>
        <?php
    }

    public function shortcode($atts) {
        return '<!-- HOJAI Widget -->';
    }

    // ─── Event Tracking ───────────────────────────────────────────

    public function track_add_to_cart($cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data) {
        if (!get_option('hojai_wc_track_add_to_cart')) return;

        $product = wc_get_product($product_id);
        $this->track_event('add_to_cart', array(
            'product_id' => $product_id,
            'product_name' => $product ? $product->get_name() : '',
            'quantity' => $quantity,
            'price' => $product ? $product->get_price() : 0,
            'cart_total' => $this->get_cart_total()
        ));
    }

    public function track_checkout_start() {
        if (!get_option('hojai_wc_track_checkout')) return;

        $this->track_event('checkout_start', array(
            'cart_total' => $this->get_cart_total(),
            'cart_items' => $this->get_cart_items()
        ));
    }

    public function track_purchase($order_id, $posted_data, $order) {
        if (!get_option('hojai_wc_track_purchase')) return;

        $this->track_event('purchase_complete', array(
            'order_id' => $order_id,
            'order_total' => $order->get_total(),
            'customer_id' => $order->get_customer_id(),
            'email' => $order->get_billing_email()
        ));
    }

    public function track_order_status($order_id, $from, $to, $order) {
        if (!get_option('hojai_wc_track_refund')) return;

        if ($to === 'refunded') {
            $this->track_event('refund_complete', array(
                'order_id' => $order_id,
                'refund_amount' => $order->get_total_refunded()
            ));
        }
    }

    private function track_event($event, $properties = array()) {
        $events = get_transient('hojai_wc_events') ?: array();
        $events[] = array(
            'event' => $event,
            'properties' => $properties,
            'timestamp' => current_time('mysql'),
            'visitor_id' => $this->get_visitor_id()
        );
        set_transient('hojai_wc_events', $events, HOUR_IN_SECONDS);

        // Send asynchronously
        $this->send_events_async($events);
    }

    private function send_events_async($events) {
        $api_key = get_option('hojai_wc_api_key');
        $company_id = $this->get_company_id();

        wp_remote_post(HOJAI_WC_API_URL . '/batch', array(
            'body' => wp_json_encode(array(
                'companyId' => $company_id,
                'events' => $events
            )),
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $api_key
            ),
            'blocking' => false
        ));
    }

    // ─── REST API ─────────────────────────────────────────────────

    public function register_rest_routes() {
        register_rest_route('hojai-wc/v1', '/config', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_config'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route('hojai-wc/v1', '/products', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_products'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route('hojai-wc/v1', '/orders', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_orders'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route('hojai-wc/v1', '/cart', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_cart'),
            'permission_callback' => '__return_true'
        ));
    }

    public function get_config() {
        return rest_ensure_response(array(
            'companyId' => $this->get_company_id(),
            'storeName' => get_bloginfo('name'),
            'currency' => get_woocommerce_currency(),
            'currencySymbol' => get_woocommerce_currency_symbol()
        ));
    }

    public function get_products(WP_REST_Request $request) {
        $page = max(1, intval($request->get_param('page')));
        $per_page = min(100, intval($request->get_param('per_page')) ?: 20);

        $query = new WP_Query(array(
            'post_type' => 'product',
            'posts_per_page' => $per_page,
            'paged' => $page,
            'post_status' => 'publish'
        ));

        $products = array();
        foreach ($query->posts as $post) {
            $product = wc_get_product($post->ID);
            if ($product) {
                $products[] = $this->format_product($product);
            }
        }

        return rest_ensure_response(array(
            'products' => $products,
            'total' => $query->found_posts,
            'pages' => $query->max_num_pages
        ));
    }

    public function get_orders(WP_REST_Request $request) {
        $customer_id = $request->get_param('customer_id');
        $email = $request->get_param('email');

        $args = array('limit' => 20, 'orderby' => 'date', 'order' => 'DESC');
        if ($customer_id) $args['customer_id'] = $customer_id;
        if ($email) $args['billing_email'] = $email;

        $orders = wc_get_orders($args);
        $formatted = array();

        foreach ($orders as $order) {
            $formatted[] = $this->format_order($order);
        }

        return rest_ensure_response(array('orders' => $formatted));
    }

    public function get_cart() {
        $cart = WC()->cart;
        if (!$cart || $cart->is_empty()) {
            return rest_ensure_response(array('cart' => null));
        }

        return rest_ensure_response(array(
            'cart' => array(
                'items' => $this->get_cart_items(),
                'total' => $cart->get_total(),
                'subtotal' => $cart->get_subtotal(),
                'item_count' => $cart->get_cart_item_count()
            )
        ));
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function get_company_id() {
        $id = get_option('hojai_wc_company_id');
        if ($id) return $id;

        $id = 'wc_' . md5(home_url());
        update_option('hojai_wc_company_id', $id);
        return $id;
    }

    private function get_visitor_id() {
        if (!isset($_COOKIE['hojai_visitor'])) {
            $visitor_id = 'v_' . bin2hex(random_bytes(12));
            setcookie('hojai_visitor', $visitor_id, time() + YEAR_IN_SECONDS, '/');
            return $visitor_id;
        }
        return $_COOKIE['hojai_visitor'];
    }

    private function get_page_type() {
        if (is_shop()) return 'shop';
        if (is_product()) return 'product';
        if (is_cart()) return 'cart';
        if (is_checkout()) return 'checkout';
        if (is_account_page()) return 'account';
        if (is_product_category()) return 'category';
        if (is_front_page()) return 'home';
        return 'other';
    }

    private function get_cart_data() {
        $cart = WC()->cart;
        if (!$cart || $cart->is_empty()) return null;

        return array(
            'items' => $this->get_cart_items(),
            'total' => $cart->get_total(),
            'subtotal' => $cart->get_subtotal(),
            'item_count' => $cart->get_cart_item_count()
        );
    }

    private function get_cart_items() {
        $items = array();
        foreach (WC()->cart->get_cart() as $item_key => $item) {
            $product = $item['data'];
            if ($product) {
                $items[] = array(
                    'id' => $product->get_id(),
                    'name' => $product->get_name(),
                    'price' => $product->get_price(),
                    'quantity' => $item['quantity']
                );
            }
        }
        return $items;
    }

    private function get_cart_total() {
        return WC()->cart ? WC()->cart->get_total() : 0;
    }

    private function get_product_data() {
        if (!is_product()) return null;

        global $product;
        if (!$product) return null;

        return array(
            'id' => $product->get_id(),
            'name' => $product->get_name(),
            'price' => $product->get_price(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'description' => $product->get_description(),
            'short_description' => $product->get_short_description(),
            'sku' => $product->get_sku(),
            'in_stock' => $product->is_in_stock(),
            'stock_quantity' => $product->get_stock_quantity(),
            'image' => wp_get_attachment_url($product->get_image_id()),
            'url' => get_permalink($product->get_id())
        );
    }

    private function format_product($product) {
        return array(
            'id' => $product->get_id(),
            'name' => $product->get_name(),
            'price' => $product->get_price(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'sku' => $product->get_sku(),
            'description' => $product->get_description(),
            'short_description' => $product->get_short_description(),
            'image' => wp_get_attachment_url($product->get_image_id()),
            'url' => get_permalink($product->get_id()),
            'in_stock' => $product->is_in_stock(),
            'stock_quantity' => $product->get_stock_quantity()
        );
    }

    private function format_order($order) {
        $items = array();
        foreach ($order->get_items() as $item) {
            $items[] = array(
                'id' => $item->get_product_id(),
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'total' => $item->get_total()
            );
        }

        return array(
            'id' => $order->get_id(),
            'number' => $order->get_order_number(),
            'status' => $order->get_status(),
            'total' => $order->get_total(),
            'date' => $order->get_date_created()->format('Y-m-d H:i:s'),
            'customer_id' => $order->get_customer_id(),
            'email' => $order->get_billing_email(),
            'items' => $items
        );
    }

    // ─── Admin ───────────────────────────────────────────────────

    public function add_admin_menu() {
        add_menu_page(
            'HOJAI SiteOS',
            'HOJAI SiteOS',
            'manage_options',
            'hojai-wc',
            array($this, 'admin_page'),
            'dashicons-cart',
            56
        );
    }

    public function register_settings() {
        register_setting('hojai_wc_settings', 'hojai_wc_api_key');
        register_setting('hojai_wc_settings', 'hojai_wc_company_id');
        register_setting('hojai_wc_settings', 'hojai_wc_enabled');
        register_setting('hojai_wc_settings', 'hojai_wc_position');
        register_setting('hojai_wc_settings', 'hojai_wc_color');
        register_setting('hojai_wc_settings', 'hojai_wc_greeting');
        register_setting('hojai_wc_settings', 'hojai_wc_track_add_to_cart');
        register_setting('hojai_wc_settings', 'hojai_wc_track_checkout');
        register_setting('hojai_wc_settings', 'hojai_wc_track_purchase');
        register_setting('hojai_wc_settings', 'hojai_wc_track_refund');
    }

    public function admin_page() {
        if (!current_user_can('manage_options')) return;
        ?>
        <div class="wrap">
            <h1>HOJAI SiteOS Settings</h1>

            <form method="post" action="options.php">
                <?php settings_fields('hojai_wc_settings'); ?>

                <h2>General</h2>
                <table class="form-table">
                    <tr>
                        <th>Enable Widget</th>
                        <td><input type="checkbox" name="hojai_wc_enabled" value="1" <?php checked(get_option('hojai_wc_enabled'), '1'); ?>></td>
                    </tr>
                    <tr>
                        <th>API Key</th>
                        <td><input type="text" name="hojai_wc_api_key" value="<?php echo esc_attr(get_option('hojai_wc_api_key')); ?>" class="regular-text"></td>
                    </tr>
                    <tr>
                        <th>Company ID</th>
                        <td><input type="text" name="hojai_wc_company_id" value="<?php echo esc_attr(get_option('hojai_wc_company_id') ?: $this->get_company_id()); ?>" class="regular-text"></td>
                    </tr>
                </table>

                <h2>Appearance</h2>
                <table class="form-table">
                    <tr>
                        <th>Position</th>
                        <td>
                            <select name="hojai_wc_position">
                                <option value="bottom-right" <?php selected(get_option('hojai_wc_position'), 'bottom-right'); ?>>Bottom Right</option>
                                <option value="bottom-left" <?php selected(get_option('hojai_wc_position'), 'bottom-left'); ?>>Bottom Left</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Color</th>
                        <td><input type="color" name="hojai_wc_color" value="<?php echo esc_attr(get_option('hojai_wc_color', '#3B82F6')); ?>"></td>
                    </tr>
                    <tr>
                        <th>Greeting</th>
                        <td><input type="text" name="hojai_wc_greeting" value="<?php echo esc_attr(get_option('hojai_wc_greeting')); ?>" class="regular-text"></td>
                    </tr>
                </table>

                <h2>Event Tracking</h2>
                <table class="form-table">
                    <tr>
                        <th>Track Events</th>
                        <td>
                            <label><input type="checkbox" name="hojai_wc_track_add_to_cart" value="1" <?php checked(get_option('hojai_wc_track_add_to_cart'), '1'); ?>> Add to Cart</label><br>
                            <label><input type="checkbox" name="hojai_wc_track_checkout" value="1" <?php checked(get_option('hojai_wc_track_checkout'), '1'); ?>> Checkout Started</label><br>
                            <label><input type="checkbox" name="hojai_wc_track_purchase" value="1" <?php checked(get_option('hojai_wc_track_purchase'), '1'); ?>> Purchase Completed</label><br>
                            <label><input type="checkbox" name="hojai_wc_track_refund" value="1" <?php checked(get_option('hojai_wc_track_refund'), '1'); ?>> Refund Processed</label>
                        </td>
                    </tr>
                </table>

                <?php submit_button(); ?>
            </form>

            <hr>
            <h2>Shortcode</h2>
            <p>Use <code>[hojai_widget]</code> to embed the widget anywhere on your site.</p>
        </div>
        <?php
    }
}

new HOJAI_WooCommerce();
