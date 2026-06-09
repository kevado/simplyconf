<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class SimplyConf_Frontend_Dashboard {

	private static $hide_title = false;

	public function __construct() {
		add_shortcode('simplyconf', array( $this, 'simplyconf_dashboard_shortcode' ));
		add_shortcode('simplyconf_register', array( $this, 'simplyconf_register_shortcode' ));
		add_shortcode('simplyconf_login', array( $this, 'simplyconf_login_shortcode' ));

		// Add filters early to catch title rendering - template_redirect fires before template loads
		add_action('template_redirect', array( $this, 'maybe_hide_title' ));

		// Enqueue dismiss-notice JS via wp_add_inline_script to avoid inline <script> in notice HTML.
		add_action('admin_enqueue_scripts', array( $this, 'enqueue_dismiss_notice_script' ));
	}

	public function enqueue_dismiss_notice_script() {
		$nonce = wp_create_nonce( 'simplyconf_dismiss_notice' );
		$js    = 'jQuery(document).ready(function($){'
			. '$(".simplyconf-dismiss-notice").on("click",function(){'
			. 'var n=$(this).data("notice");'
			. '$.post(ajaxurl,{action:"simplyconf_dismiss_notice",notice:n,nonce:"' . esc_js( $nonce ) . '"});'
			. '$(this).closest(".notice").fadeOut();'
			. '});});';
		wp_add_inline_script( 'jquery', $js );
	}
	
	/**
	 * Check if we should hide the title and add the filter
	 */
	public function maybe_hide_title() {
		// Check if current page/post has the dashboard block or shortcode with hide_title
		global $post;
		
		if (!$post) {
			return;
		}
		
		$should_hide = false;
		
		// Check for shortcode with hide_title parameter
		if (has_shortcode($post->post_content, 'simplyconf')) {
			// Parse shortcode attributes to check for hide_title
			$pattern = get_shortcode_regex(array('simplyconf'));
			if (preg_match_all('/' . $pattern . '/s', $post->post_content, $matches)) {
				foreach ($matches[3] as $attrs) {
					if (strpos($attrs, 'hide_title') !== false && 
					    (strpos($attrs, 'hide_title="true"') !== false || 
					     strpos($attrs, 'hide_title="1"') !== false ||
					     strpos($attrs, "hide_title='true'") !== false ||
					     strpos($attrs, "hide_title='1'") !== false)) {
						$should_hide = true;
						break;
					}
				}
			}
		}
		
		// Check for block with hideTitle attribute
		if (has_block('simplyconf/dashboard', $post)) {
			if (preg_match('/"hideTitle":true/', $post->post_content)) {
				$should_hide = true;
			}
		}
		
		if ($should_hide) {
			self::$hide_title = true;
			add_filter('the_title', array( $this, 'filter_page_title' ), 10, 2);
			add_action('wp_enqueue_scripts', array( $this, 'enqueue_title_hide_style' ));
		}
	}
	
	/**
	 * Filter to remove the page title
	 */
	public function filter_page_title($title, $id = null) {
		if (is_singular() && in_the_loop() && is_main_query() && $id === get_the_ID()) {
			return '';
		}
		return wp_kses_post($title);
	}
	
	/**
	 * Enqueue a style handle and attach the title-hide rules as inline CSS.
	 * Uses wp_add_inline_style() instead of echoing a raw <style> tag.
	 */
	public function enqueue_title_hide_style() {
		if ( ! self::$hide_title ) {
			return;
		}
		wp_register_style( 'simplyconf-title-hide', false, array(), SIMPLYCONF_VERSION );
		wp_enqueue_style( 'simplyconf-title-hide' );
		wp_add_inline_style(
			'simplyconf-title-hide',
			'h1.entry-title[itemprop="headline"],.entry-title,.page-title,h1.entry-title,h1.page-title,.entry-header .entry-title,.page-header .page-title,header.entry-header,.wp-block-post-title,article header h1,.site-main>article>header,.hentry .entry-header{display:none !important;}'
		);
	}

	/**
	 * Enqueue the SimplyConf React bundle, frontend styles, and translations.
	 * Shared by dashboard, login, and register rendering.
	 */
	private function enqueue_frontend_assets() {
		wp_enqueue_script('wp-element');
		wp_enqueue_script('simplyconf', SIMPLYCONF_URL . 'dist/simplyconf.js', array( 'wp-element' ), wp_rand(), true);
		wp_enqueue_style('simplyconf-frontend', SIMPLYCONF_URL . 'assets/css/frontend.css', array(), SIMPLYCONF_VERSION);

		// Load translations
		$locale     = get_locale();
		$json_files = glob(plugin_dir_path(__DIR__) . 'languages/simplyconf-' . $locale . '-*.json');

		if ( ! empty($json_files)) {
			$all_translations = array();
			foreach ($json_files as $file) {
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Reading local translation files, not remote URLs.
				$data = json_decode( file_get_contents( $file ), true );
				if ($data && isset($data['locale_data']['simplyconf'])) {
					$translations = $data['locale_data']['simplyconf'];
					unset($translations['']);
					$all_translations = array_merge($all_translations, $translations);
				}
			}

			wp_localize_script(
				'simplyconf',
				'simplyconfI18n',
				array(
					'locale'       => $locale,
					'translations' => $all_translations,
				)
			);
		}

		add_filter('edit_post_link', '__return_false');
	}

	/**
	 * Find the URL of the page containing the SimplyConf login form.
	 *
	 * @return string Login page URL or site home URL as fallback.
	 */
	private function get_login_page_url() {
		global $wpdb;
		$login_url     = home_url('/');
		$login_page_id = $wpdb->get_var(
			"SELECT ID FROM {$wpdb->posts}
			 WHERE (post_content LIKE '%[simplyconf_login%' OR post_content LIKE '%simplyconf/login%')
			   AND post_type = 'page' AND post_status = 'publish'
			 LIMIT 1"
		);
		if ($login_page_id) {
			$login_url = get_permalink($login_page_id);
		}
		return $login_url;
	}

	/**
	 * Find the URL of the page containing the SimplyConf dashboard.
	 *
	 * @return string Dashboard page URL or site home URL as fallback.
	 */
	private function get_dashboard_page_url() {
		global $wpdb;
		$dashboard_url     = home_url('/');
		$dashboard_page_id = $wpdb->get_var(
			"SELECT ID FROM {$wpdb->posts}
			 WHERE (post_content LIKE '%[simplyconf%' OR post_content LIKE '%simplyconf/dashboard%')
			   AND post_type = 'page' AND post_status = 'publish'
			 LIMIT 1"
		);
		if ($dashboard_page_id) {
			$dashboard_url = get_permalink($dashboard_page_id);
		}
		return $dashboard_url;
	}

	/**
	 * Render the SimplyConf dashboard.
	 * Used by both the shortcode and the Gutenberg block.
	 *
	 * @param int  $event_id   Event ID to load.
	 * @param bool $hide_title Whether to hide the page title.
	 * @return string HTML output for the dashboard.
	 */
	public function render_dashboard( $event_id = 1, $hide_title = false ) {
		self::$hide_title = $hide_title;

		$this->enqueue_frontend_assets();

		// Get enabled features for frontend
		$enabled_features = array();
		if ( class_exists( 'SimplyConf_Feature_Manager' ) ) {
			$manager = SimplyConf_Feature_Manager::instance();
			$enabled_features = $manager->get_enabled_features();
		}


		// Get reCAPTCHA site key if captcha is enabled for this event
		$recaptcha_site_key = '';
		global $wpdb;
		$settings_tbl = SimplyConf_DB::get_table('settings');
		$captcha_enabled = $wpdb->get_var($wpdb->prepare(
			"SELECT value FROM $settings_tbl WHERE event_id = %d AND name = 'enable_captcha'",
			$event_id
		));
		if ($captcha_enabled === '1') {
			$recaptcha_site_key = $wpdb->get_var($wpdb->prepare(
				"SELECT value FROM $settings_tbl WHERE event_id = %d AND name = 'recaptcha_site_key'",
				$event_id
			)) ?: '';
		}

		wp_localize_script(
			'simplyconf',
			'simplyconf',
			array(
				'apiUrl'           => home_url('/wp-json/simplyconf/v1'),
				'nonce'            => wp_create_nonce('wp_rest'),
				'eventId'          => $event_id,
				'isAdmin'          => current_user_can('manage_options') ? 'true' : 'false',
				'adminUrl'         => current_user_can('manage_options') ? admin_url('admin.php?page=simplyconf') : '',
	
				'features'         => $enabled_features,
				'addons'           => simplyconf_get_addons(),
				'recaptchaSiteKey' => $recaptcha_site_key,
			)
		);

		// Enqueue addon scripts that have frontend support
		$addons = simplyconf_get_addons();
		foreach ($addons as $slug => $addon) {
			if ( ! empty($addon['has_frontend']) && ! empty($addon['js_bundle'])) {
				$bundle_path = trailingslashit($addon['path']) . $addon['js_bundle'];
				$bundle_url  = trailingslashit($addon['url']) . $addon['js_bundle'];

				if (file_exists($bundle_path)) {
					wp_enqueue_script(
						'simplyconf-' . $slug,
						$bundle_url,
						array( 'simplyconf' ),
						$addon['version'],
						true
					);
				}
			}
		}

		return '<div class="wrap"><div id="simplyconf-dashboard"></div></div>';
	}

	/**
	 * Render the SimplyConf login form.
	 * Used by both the shortcode and the Gutenberg block.
	 *
	 * @param int  $event_id   Event ID context.
	 * @param bool $hide_title Whether to hide the page title.
	 * @return string HTML output for the login form.
	 */
	public function render_login( $event_id = 1, $hide_title = false ) {
		self::$hide_title = $hide_title;

		$this->enqueue_frontend_assets();

		// Get reCAPTCHA site key if captcha is enabled
		$recaptcha_site_key = '';
		global $wpdb;
		$settings_tbl = SimplyConf_DB::get_table('settings');
		$captcha_enabled = $wpdb->get_var($wpdb->prepare(
			"SELECT value FROM $settings_tbl WHERE event_id = %d AND name = 'enable_captcha'",
			$event_id
		));
		if ($captcha_enabled === '1') {
			$recaptcha_site_key = $wpdb->get_var($wpdb->prepare(
				"SELECT value FROM $settings_tbl WHERE event_id = %d AND name = 'recaptcha_site_key'",
				$event_id
			)) ?: '';
		}

		wp_localize_script(
			'simplyconf',
			'simplyconf',
			array(
				'apiUrl'           => home_url('/wp-json/simplyconf/v1'),
				'nonce'            => wp_create_nonce('wp_rest'),
				'eventId'          => $event_id,
				'loginOnly'        => true,
				'dashboardUrl'     => $this->get_dashboard_page_url(),
				'recaptchaSiteKey' => $recaptcha_site_key,
			)
		);

		return '<div class="wrap"><div id="simplyconf-login"></div></div>';
	}

	/**
	 * Render the SimplyConf registration form.
	 * Used by both the shortcode and the Gutenberg block.
	 *
	 * @param int  $event_id   Event ID context.
	 * @param bool $hide_title Whether to hide the page title.
	 * @return string HTML output for the registration form.
	 */
	public function render_register( $event_id = 1, $hide_title = false ) {
		self::$hide_title = $hide_title;

		$this->enqueue_frontend_assets();

		// Get reCAPTCHA site key if captcha is enabled
		$recaptcha_site_key = '';
		global $wpdb;
		$settings_tbl = SimplyConf_DB::get_table('settings');
		$captcha_enabled = $wpdb->get_var($wpdb->prepare(
			"SELECT value FROM $settings_tbl WHERE event_id = %d AND name = 'enable_captcha'",
			$event_id
		));
		if ($captcha_enabled === '1') {
			$recaptcha_site_key = $wpdb->get_var($wpdb->prepare(
				"SELECT value FROM $settings_tbl WHERE event_id = %d AND name = 'recaptcha_site_key'",
				$event_id
			)) ?: '';
		}

		wp_localize_script(
			'simplyconf',
			'simplyconf',
			array(
				'apiUrl'           => home_url('/wp-json/simplyconf/v1'),
				'nonce'            => wp_create_nonce('wp_rest'),
				'eventId'          => $event_id,
				'registerOnly'     => true,
				'loginUrl'         => $this->get_login_page_url(),
				'recaptchaSiteKey' => $recaptcha_site_key,
			)
		);

		return '<div class="wrap"><div id="simplyconf-register"></div></div>';
	}

	public function simplyconf_dashboard_shortcode( $atts ) {
		$this->track_shortcode_usage();

		$a = shortcode_atts(array( 'event_id' => 1, 'hide_title' => false ), $atts);

		return $this->render_dashboard(
			intval($a['event_id']),
			filter_var($a['hide_title'], FILTER_VALIDATE_BOOLEAN)
		);
	}

	public function simplyconf_register_shortcode( $atts ) {
		$a = shortcode_atts(array( 'event_id' => 1 ), $atts);

		return $this->render_register(intval($a['event_id']));
	}

	/**
	 * Login shortcode handler
	 */
	public function simplyconf_login_shortcode( $atts ) {
		$a = shortcode_atts(array( 'event_id' => 1 ), $atts);

		return $this->render_login(intval($a['event_id']));
	}

	/**
	 * Track shortcode usage for analytics and migration guidance.
	 */
	private function track_shortcode_usage() {
		$usage_count = get_option('simplyconf_shortcode_usage_count', 0);
		update_option('simplyconf_shortcode_usage_count', $usage_count + 1);
		
		// Show admin notice if not dismissed
		if (current_user_can('manage_options') && ! get_user_meta(get_current_user_id(), 'simplyconf_shortcode_notice_dismissed', true)) {
			add_action('admin_notices', array( $this, 'shortcode_migration_notice' ));
		}
	}

	/**
	 * Display admin notice recommending block migration.
	 */
	public function shortcode_migration_notice() {
		// Only show on relevant admin pages
		$screen = get_current_screen();
		if ( ! $screen || ! in_array($screen->id, array( 'dashboard', 'edit-page', 'page' ))) {
			return;
		}

		?>
		<div class="notice notice-info is-dismissible" data-dismissible="simplyconf-shortcode-notice">
			<p>
				<strong><?php esc_html_e('SimplyConf Dashboard Update', 'simplyconf'); ?></strong>
			</p>
			<p>
				<?php esc_html_e('We noticed you\'re using the [simplyconf] shortcode. For better compatibility and features, we recommend using the SimplyConf Dashboard block instead.', 'simplyconf'); ?>
			</p>
			<p>
				<a href="<?php echo esc_url(admin_url('admin.php?page=simplyconf#/settings')); ?>" class="button button-primary">
					<?php esc_html_e('Set Up Dashboard Page', 'simplyconf'); ?>
				</a>
				<button type="button" class="button button-secondary simplyconf-dismiss-notice" data-notice="simplyconf_shortcode_notice_dismissed">
					<?php esc_html_e('Dismiss', 'simplyconf'); ?>
				</button>
			</p>
		</div>
		<?php
	}
}

// AJAX handler for dismissing notices
add_action('wp_ajax_simplyconf_dismiss_notice', 'simplyconf_dismiss_notice_handler');
function simplyconf_dismiss_notice_handler() {
	check_ajax_referer('simplyconf_dismiss_notice', 'nonce');
	
	if ( ! current_user_can('manage_options')) {
		wp_die();
	}
	
	$notice = sanitize_key( wp_unslash( $_POST['notice'] ) );

	// Only allow known notice meta keys to be dismissed
	$allowed_notices = array(
		'simplyconf_dismiss_welcome',
		'simplyconf_dismiss_setup',
		'simplyconf_dismiss_review',
	);
	if ( ! in_array( $notice, $allowed_notices, true ) ) {
		wp_send_json_error( 'Invalid notice key.' );
		return;
	}

	update_user_meta( get_current_user_id(), $notice, true );
	
	wp_send_json_success();
}

new SimplyConf_Frontend_Dashboard();
