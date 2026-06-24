<?php
/**
 * Plugin Name:       HOJAI AI Widget
 * Plugin URI:        https://hojai.ai/widget
 * Description:       Drop the HOJAI AI Widget on every page of your WordPress site. Visitors get a 5KB chat bubble that routes to your company's SUTAR agents — sales, support, booking, commerce.
 * Version:           1.0.0
 * Requires at least: 5.5
 * Requires PHP:      7.4
 * Author:            HOJAI AI
 * License:           MIT
 * Text Domain:       hojai-widget
 *
 * @package HojaiWidget
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'HOJAI_WIDGET_VERSION', '1.0.0' );
define( 'HOJAI_WIDGET_URL', 'https://cdn.hojai.ai/widget.js' );

/**
 * Register settings via WP Settings API.
 */
add_action( 'admin_init', 'hojai_widget_register_settings' );
function hojai_widget_register_settings() {
	register_setting( 'hojai_widget_options', 'hojai_widget_api_key', array(
		'type'              => 'string',
		'sanitize_callback' => 'sanitize_text_field',
		'default'           => '',
	) );
	register_setting( 'hojai_widget_options', 'hojai_widget_company_id', array(
		'type'              => 'string',
		'sanitize_callback' => 'sanitize_text_field',
		'default'           => '',
	) );
	register_setting( 'hojai_widget_options', 'hojai_widget_color', array(
		'type'              => 'string',
		'sanitize_callback' => 'sanitize_hex_color',
		'default'           => '#3B82F6',
	) );
	register_setting( 'hojai_widget_options', 'hojai_widget_position', array(
		'type'              => 'string',
		'sanitize_callback' => 'hojai_widget_sanitize_position',
		'default'           => 'bottom-right',
	) );
	register_setting( 'hojai_widget_options', 'hojai_widget_name', array(
		'type'              => 'string',
		'sanitize_callback' => 'sanitize_text_field',
		'default'           => '',
	) );
	register_setting( 'hojai_widget_options', 'hojai_widget_pages', array(
		'type'              => 'string',
		'sanitize_callback' => 'sanitize_text_field',
		'default'           => 'all',
	) );
}

function hojai_widget_sanitize_position( $value ) {
	return in_array( $value, array( 'bottom-right', 'bottom-left' ), true ) ? $value : 'bottom-right';
}

/**
 * Add settings menu under Settings → HOJAI Widget.
 */
add_action( 'admin_menu', 'hojai_widget_add_settings_page' );
function hojai_widget_add_settings_page() {
	add_options_page(
		__( 'HOJAI Widget', 'hojai-widget' ),
		__( 'HOJAI Widget', 'hojai-widget' ),
		'manage_options',
		'hojai-widget',
		'hojai_widget_render_settings_page'
	);
}

function hojai_widget_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to view this page.', 'hojai-widget' ) );
	}
	$api_key     = get_option( 'hojai_widget_api_key' );
	$company_id  = get_option( 'hojai_widget_company_id' );
	$color       = get_option( 'hojai_widget_color', '#3B82F6' );
	$position    = get_option( 'hojai_widget_position', 'bottom-right' );
	$name        = get_option( 'hojai_widget_name' );
	$pages       = get_option( 'hojai_widget_pages', 'all' );
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'HOJAI AI Widget', 'hojai-widget' ); ?></h1>
		<p>
			<?php esc_html_e( 'Drop the HOJAI AI chat bubble on every page of your site. Visitors get instant AI assistance powered by your SUTAR agents.', 'hojai-widget' ); ?>
		</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'hojai_widget_options' ); ?>
			<table class="form-table">
				<tr>
					<th scope="row"><label for="hojai_widget_api_key"><?php esc_html_e( 'Public API key', 'hojai-widget' ); ?></label></th>
					<td>
						<input
							type="text"
							id="hojai_widget_api_key"
							name="hojai_widget_api_key"
							value="<?php echo esc_attr( $api_key ); ?>"
							class="regular-text"
							placeholder="pk_live_..."
						/>
						<p class="description">
							<?php
							printf(
								/* translators: %s: URL to HOJAI dashboard */
								wp_kses( __( 'Get your key from <a href="%s" target="_blank" rel="noopener">hojai.ai/widget</a>.', 'hojai-widget' ),
									array( 'a' => array( 'href' => array(), 'target' => array(), 'rel' => array() ) )
								),
								'https://hojai.ai/widget'
							);
							?>
						</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="hojai_widget_company_id"><?php esc_html_e( 'Company ID', 'hojai-widget' ); ?></label></th>
					<td>
						<input type="text" id="hojai_widget_company_id" name="hojai_widget_company_id" value="<?php echo esc_attr( $company_id ); ?>" class="regular-text" />
						<p class="description"><?php esc_html_e( 'Defaults to your site URL if empty.', 'hojai-widget' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="hojai_widget_color"><?php esc_html_e( 'Widget color', 'hojai-widget' ); ?></label></th>
					<td>
						<input type="color" id="hojai_widget_color" name="hojai_widget_color" value="<?php echo esc_attr( $color ); ?>" />
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="hojai_widget_position"><?php esc_html_e( 'Position', 'hojai-widget' ); ?></label></th>
					<td>
						<select id="hojai_widget_position" name="hojai_widget_position">
							<option value="bottom-right" <?php selected( $position, 'bottom-right' ); ?>><?php esc_html_e( 'Bottom right', 'hojai-widget' ); ?></option>
							<option value="bottom-left" <?php selected( $position, 'bottom-left' ); ?>><?php esc_html_e( 'Bottom left', 'hojai-widget' ); ?></option>
						</select>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="hojai_widget_name"><?php esc_html_e( 'Assistant name', 'hojai-widget' ); ?></label></th>
					<td>
						<input type="text" id="hojai_widget_name" name="hojai_widget_name" value="<?php echo esc_attr( $name ); ?>" class="regular-text" placeholder="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?> Assistant" />
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="hojai_widget_pages"><?php esc_html_e( 'Show on', 'hojai-widget' ); ?></label></th>
					<td>
						<select id="hojai_widget_pages" name="hojai_widget_pages">
							<option value="all" <?php selected( $pages, 'all' ); ?>><?php esc_html_e( 'All pages', 'hojai-widget' ); ?></option>
							<option value="front" <?php selected( $pages, 'front' ); ?>><?php esc_html_e( 'Front page only', 'hojai-widget' ); ?></option>
							<option value="none" <?php selected( $pages, 'none' ); ?>><?php esc_html_e( 'Disabled (use shortcode)', 'hojai-widget' ); ?></option>
						</select>
						<p class="description"><?php esc_html_e( 'Or use the [hojai_widget] shortcode on any page.', 'hojai-widget' ); ?></p>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<hr />
		<h2><?php esc_html_e( 'Shortcode', 'hojai-widget' ); ?></h2>
		<p><?php esc_html_e( 'Drop this shortcode on any page or post to embed the widget inline:', 'hojai-widget' ); ?></p>
		<code>[hojai_widget]</code>
		<p><?php esc_html_e( 'With overrides:', 'hojai-widget' ); ?></p>
		<code>[hojai_widget api_key="pk_live_..." color="#FF0000" position="bottom-left"]</code>
	</div>
	<?php
}

/**
 * Render the widget <script> in the site footer.
 */
add_action( 'wp_footer', 'hojai_widget_render_script', 99 );
function hojai_widget_render_script() {
	$pages = get_option( 'hojai_widget_pages', 'all' );
	if ( 'none' === $pages ) {
		return;
	}
	if ( 'front' === $pages && ! is_front_page() ) {
		return;
	}
	if ( 'all' !== $pages && 'front' !== $pages ) {
		return;
	}

	hojai_widget_render_tag(
		array(
			'api_key'    => get_option( 'hojai_widget_api_key' ),
			'company_id' => get_option( 'hojai_widget_company_id', home_url( '/' ) ),
			'color'      => get_option( 'hojai_widget_color', '#3B82F6' ),
			'position'   => get_option( 'hojai_widget_position', 'bottom-right' ),
			'name'       => get_option( 'hojai_widget_name', get_bloginfo( 'name' ) . ' Assistant' ),
		)
	);
}

/**
 * Shortcode: [hojai_widget api_key="..." color="..." position="..."]
 * Mounts an inline chat panel inside the page content.
 */
add_shortcode( 'hojai_widget', 'hojai_widget_shortcode' );
function hojai_widget_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'api_key'    => get_option( 'hojai_widget_api_key' ),
			'company_id' => get_option( 'hojai_widget_company_id', home_url( '/' ) ),
			'color'      => get_option( 'hojai_widget_color', '#3B82F6' ),
			'position'   => 'inline',
			'name'       => get_option( 'hojai_widget_name', get_bloginfo( 'name' ) . ' Assistant' ),
		),
		$atts,
		'hojai_widget'
	);

	$container_id = 'hojai-widget-' . wp_generate_uuid4();
	ob_start();
	?>
	<div id="<?php echo esc_attr( $container_id ); ?>" class="hojai-widget-shortcode" style="min-height:520px"></div>
	<script>
		(function () {
			var cfg = <?php echo wp_json_encode( $atts ); ?>;
			cfg.containerId = '#<?php echo esc_js( $container_id ); ?>';
			var s = document.createElement('script');
			s.src = '<?php echo esc_url( HOJAI_WIDGET_URL ); ?>';
			s.defer = true;
			s.onload = function () {
				new window.HojaiWidget(cfg).render();
			};
			document.head.appendChild(s);
		})();
	</script>
	<?php
	return ob_get_clean();
}

/**
 * Render the actual <script> tag with widget config.
 */
function hojai_widget_render_tag( $opts ) {
	if ( empty( $opts['api_key'] ) ) {
		return;
	}
	?>
	<script
		src="<?php echo esc_url( HOJAI_WIDGET_URL ); ?>"
		data-key="<?php echo esc_attr( $opts['api_key'] ); ?>"
		data-company="<?php echo esc_attr( $opts['company_id'] ); ?>"
		data-color="<?php echo esc_attr( $opts['color'] ); ?>"
		data-position="<?php echo esc_attr( $opts['position'] ); ?>"
		data-name="<?php echo esc_attr( $opts['name'] ); ?>"
		defer
	></script>
	<?php
}

/**
 * Add settings link on plugin list page.
 */
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'hojai_widget_settings_link' );
function hojai_widget_settings_link( $links ) {
	$settings_link = '<a href="' . esc_url( admin_url( 'options-general.php?page=hojai-widget' ) ) . '">' . esc_html__( 'Settings', 'hojai-widget' ) . '</a>';
	array_unshift( $links, $settings_link );
	return $links;
}