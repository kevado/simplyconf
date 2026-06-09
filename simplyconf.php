<?php
/**
 * Plugin Name: SimplyConf
 * Plugin URI: https://simplyconf.com
 * Description: A lightweight and flexible conference submission and event management plugin for WordPress. Create events, accept submissions, manage users, and export submission data — all from your dashboard.
 * Version: 1.0.0
 * Author: Kevon Adonis
 * Text Domain: simplyconf
 * Domain Path: /languages
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Requires at least: 5.0
 * Tested up to: 7.0
 * Requires PHP: 7.0
 */

defined('ABSPATH') or die("ERROR: You do not have permission to access this page");

/**
 * Define Plugins Contants
 */
define('SIMPLYCONF_PATH', trailingslashit(plugin_dir_path(__FILE__)));
define('SIMPLYCONF_URL', trailingslashit(plugins_url('/', __FILE__)));
define('SIMPLYCONF_VERSION', '1.0.0');
define('SIMPLYCONF_BUILD', '1.0.0-20260602.1461efb');


/**
 * Run register init
 */
register_activation_hook(__FILE__, 'simplyconf_activate');

function simplyconf_activate( $network_wide ) {
	// Check if this is a network-wide activation
	if ( is_multisite() && $network_wide ) {
		// Get all sites in the network
		$sites = get_sites( array( 'number' => 10000 ) );
		
		foreach ( $sites as $site ) {
			// Switch to each site and run activation
			switch_to_blog( $site->blog_id );
			simplyconf_activate_single_site();
			restore_current_blog();
		}
	} else {
		// Single site activation
		simplyconf_activate_single_site();
	}
}

function simplyconf_activate_single_site() {
	// Load database class first (required by db.php)
	require_once SIMPLYCONF_PATH . 'inc/database.php';
	
	// create db tables - use require instead of require_once so it runs on each site
	require SIMPLYCONF_PATH . 'inc/db.php';

	// Load functions to create default event
	require_once SIMPLYCONF_PATH . 'inc/functions.php';
	simplyconf_create_default_event();
}

// Hook for when a new site is created in multisite (WP 5.1+)
add_action( 'wp_initialize_site', 'simplyconf_activate_new_site', 10, 2 );

function simplyconf_activate_new_site( $new_site, $args ) {
	// Check if SimplyConf is network activated
	if ( is_plugin_active_for_network( 'simplyconf/simplyconf.php' ) ) {
		$blog_id = $new_site->blog_id;
		switch_to_blog( $blog_id );
		simplyconf_activate_single_site();
		restore_current_blog();
	}
}
// Runtime migration — creates tables on sub-sites cloned from a WP Ultimo template
// (template cloning copies active_plugins but doesn't trigger activation hooks)
add_action('init', 'simplyconf_maybe_create_tables');
function simplyconf_maybe_create_tables() {
	if ( ! class_exists('SimplyConf_DB') ) {
		return;
	}
	global $wpdb;
	$events_tbl = SimplyConf_DB::get_table('events');
	$table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $events_tbl));
	if ( $table_exists ) {
		return;
	}
	simplyconf_activate_single_site();
}

// load functions and actions
require_once SIMPLYCONF_PATH . 'inc/helpers.php'; // Shared route utilities
require_once SIMPLYCONF_PATH . 'inc/functions.php';
require_once SIMPLYCONF_PATH . 'inc/actions.php';
require_once SIMPLYCONF_PATH . 'inc/addons.php';
require_once SIMPLYCONF_PATH . 'inc/class-simplyconf-feature-registry.php';
require_once SIMPLYCONF_PATH . 'inc/class-simplyconf-feature-manager.php';
require_once SIMPLYCONF_PATH . 'inc/class-simplyconf-license-manager.php';
SimplyConf_License_Manager::instance();

// Load WP Ultimo integration if in multisite
if ( is_multisite() ) {
	require_once SIMPLYCONF_PATH . 'inc/wp-ultimo-integration.php';
	if ( file_exists( SIMPLYCONF_PATH . 'inc/wp-ultimo-site-setup.php' ) ) {
		require_once SIMPLYCONF_PATH . 'inc/wp-ultimo-site-setup.php';
	}
}

require_once SIMPLYCONF_PATH . 'inc/database.php';
require_once SIMPLYCONF_PATH . 'inc/migrations.php'; // Database migrations

require_once SIMPLYCONF_PATH . 'inc/jwt-auth.php'; // JWT authentication helper
SimplyConf_JWT_Auth::init(); // Initialize JWT-based authentication
require_once SIMPLYCONF_PATH . 'inc/class-dashboard-setup.php'; // Dashboard setup helper
// enable APIs
require_once SIMPLYCONF_PATH . 'classes/admin-menu.php';
require_once SIMPLYCONF_PATH . 'classes/frontend-dashboard.php';
// register admin routes
require_once SIMPLYCONF_PATH . 'routes/auth.php';
require_once SIMPLYCONF_PATH . 'routes/events.php';
require_once SIMPLYCONF_PATH . 'routes/tracks.php';
require_once SIMPLYCONF_PATH . 'routes/sessions.php';
require_once SIMPLYCONF_PATH . 'routes/abstracts.php';
require_once SIMPLYCONF_PATH . 'routes/authors.php';
require_once SIMPLYCONF_PATH . 'routes/users.php';
require_once SIMPLYCONF_PATH . 'routes/settings.php';
require_once SIMPLYCONF_PATH . 'routes/customfields.php';
require_once SIMPLYCONF_PATH . 'routes/attachments.php';
require_once SIMPLYCONF_PATH . 'routes/statuses.php';
require_once SIMPLYCONF_PATH . 'routes/preferences.php';
require_once SIMPLYCONF_PATH . 'routes/dashboard.php';
require_once SIMPLYCONF_PATH . 'routes/licenses.php';
require_once SIMPLYCONF_PATH . 'routes/appearance.php';
require_once SIMPLYCONF_PATH . 'routes/features.php';
require_once SIMPLYCONF_PATH . 'routes/dashboard-setup.php'; // Dashboard setup API
// register frontend routes
require_once SIMPLYCONF_PATH . 'routes/frontend.php';

// enable frontend shortcode
require_once SIMPLYCONF_PATH . 'classes/frontend-dashboard.php';

/**
 * Register the SimplyConf Dashboard Gutenberg block
 */
add_action('init', 'simplyconf_register_dashboard_block');
function simplyconf_register_dashboard_block() {
	// Register the block editor script
	wp_register_script(
		'simplyconf-dashboard-block-editor',
		SIMPLYCONF_URL . 'blocks/dashboard/index.js',
		array(
			'wp-blocks',
			'wp-element',
			'wp-block-editor',
			'wp-components',
			'wp-i18n',
		),
		SIMPLYCONF_VERSION,
		true
	);

	// Register the block
	register_block_type(
		SIMPLYCONF_PATH . 'blocks/dashboard',
		array(
			'editor_script' => 'simplyconf-dashboard-block-editor',
			'render_callback' => 'simplyconf_render_dashboard_block',
		)
	);
}

/**
 * Render callback for the dashboard block
 *
 * @param array $attributes Block attributes
 * @return string Rendered block HTML
 */
function simplyconf_render_dashboard_block( $attributes ) {
	// Enqueue the block CSS
	wp_enqueue_style(
		'simplyconf-dashboard-block',
		SIMPLYCONF_URL . 'blocks/dashboard/style.css',
		array(),
		SIMPLYCONF_VERSION
	);

	// Get the event ID from block attributes or use default
	$event_id = isset($attributes['eventId']) ? intval($attributes['eventId']) : 1;
	
	// Get the hideTitle attribute
	$hide_title = isset($attributes['hideTitle']) ? (bool) $attributes['hideTitle'] : false;

	// Reuse the existing dashboard rendering logic
	if (class_exists('SimplyConf_Frontend_Dashboard')) {
		$dashboard_instance = new SimplyConf_Frontend_Dashboard();
		return $dashboard_instance->render_dashboard($event_id, $hide_title);
	}

	return '<p>' . esc_html__('SimplyConf Dashboard is not available.', 'simplyconf') . '</p>';
}

/**
 * Register the SimplyConf Login Gutenberg block
 */
add_action('init', 'simplyconf_register_login_block');
function simplyconf_register_login_block() {
	wp_register_script(
		'simplyconf-login-block-editor',
		SIMPLYCONF_URL . 'blocks/login/index.js',
		array(
			'wp-blocks',
			'wp-element',
			'wp-block-editor',
			'wp-components',
			'wp-i18n',
		),
		SIMPLYCONF_VERSION,
		true
	);

	register_block_type(
		SIMPLYCONF_PATH . 'blocks/login',
		array(
			'editor_script'   => 'simplyconf-login-block-editor',
			'render_callback' => 'simplyconf_render_login_block',
		)
	);
}

function simplyconf_render_login_block( $attributes ) {
	$event_id   = isset($attributes['eventId']) ? intval($attributes['eventId']) : 1;
	$hide_title = isset($attributes['hideTitle']) ? (bool) $attributes['hideTitle'] : false;

	if (class_exists('SimplyConf_Frontend_Dashboard')) {
		$instance = new SimplyConf_Frontend_Dashboard();
		return $instance->render_login($event_id, $hide_title);
	}

	return '<p>' . esc_html__('SimplyConf Login is not available.', 'simplyconf') . '</p>';
}

/**
 * Register the SimplyConf Register Gutenberg block
 */
add_action('init', 'simplyconf_register_register_block');
function simplyconf_register_register_block() {
	wp_register_script(
		'simplyconf-register-block-editor',
		SIMPLYCONF_URL . 'blocks/register/index.js',
		array(
			'wp-blocks',
			'wp-element',
			'wp-block-editor',
			'wp-components',
			'wp-i18n',
		),
		SIMPLYCONF_VERSION,
		true
	);

	register_block_type(
		SIMPLYCONF_PATH . 'blocks/register',
		array(
			'editor_script'   => 'simplyconf-register-block-editor',
			'render_callback' => 'simplyconf_render_register_block',
		)
	);
}

function simplyconf_render_register_block( $attributes ) {
	$event_id   = isset($attributes['eventId']) ? intval($attributes['eventId']) : 1;
	$hide_title = isset($attributes['hideTitle']) ? (bool) $attributes['hideTitle'] : false;

	if (class_exists('SimplyConf_Frontend_Dashboard')) {
		$instance = new SimplyConf_Frontend_Dashboard();
		return $instance->render_register($event_id, $hide_title);
	}

	return '<p>' . esc_html__('SimplyConf Registration is not available.', 'simplyconf') . '</p>';
}

/**
 * Display version info in admin footer (right side)
 */
add_filter('update_footer', 'simplyconf_admin_footer_version', 20);
function simplyconf_admin_footer_version($text) {
	// Only show on SimplyConf admin page
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading GET parameter for page identification only.
	if ( ! isset( $_GET['page'] ) || sanitize_key( $_GET['page'] ) !== 'simplyconf' ) {
		return $text;
	}
	
	$build_parts = explode('.', SIMPLYCONF_BUILD);
	$short_hash = end($build_parts);
	
	$version_text = sprintf(
		'<span id="simplyconf-version-info" style="cursor:pointer;">SimplyConf v%s (%s)</span>',
		SIMPLYCONF_VERSION,
		$short_hash
	);
	
	return $version_text;
}

/**
 * Add version modal markup and script to admin footer
 */
add_action('admin_footer', 'simplyconf_version_modal');
function simplyconf_version_modal() {
	$addons = simplyconf_get_addons();
	?>
	<div id="simplyconf-version-modal" style="display:none; position:fixed; z-index:999999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5);">
		<div style="background-color:#fff; margin:10% auto; padding:20px; border:1px solid #888; width:600px; max-width:90%; border-radius:5px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
			<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #ddd; padding-bottom:10px;">
				<h2 style="margin:0;">SimplyConf Version Info</h2>
				<span id="simplyconf-version-close" style="cursor:pointer; font-size:28px; font-weight:bold; color:#aaa;">&times;</span>
			</div>
			
			<div style="margin-bottom:20px;">
				<h3 style="margin:0 0 10px 0; font-size:14px; color:#666;">Core Plugin</h3>
				<table style="width:100%; border-collapse:collapse;">
					<tr style="border-bottom:1px solid #eee;">
						<td style="padding:8px; font-weight:bold; width:30%;">Version:</td>
						<td style="padding:8px;"><?php echo esc_html(SIMPLYCONF_VERSION); ?></td>
					</tr>
					<tr style="border-bottom:1px solid #eee;">
						<td style="padding:8px; font-weight:bold;">Build:</td>
						<td style="padding:8px; font-family:monospace; font-size:12px;"><?php echo esc_html(SIMPLYCONF_BUILD); ?></td>
					</tr>
				</table>
			</div>
			
			<?php if (!empty($addons)): ?>
			<div>
				<h3 style="margin:0 0 10px 0; font-size:14px; color:#666;">Active Addons</h3>
				<table style="width:100%; border-collapse:collapse;">
					<?php foreach ($addons as $slug => $addon): ?>
						<?php if ($addon['active']): ?>
						<tr style="border-bottom:1px solid #eee;">
							<td style="padding:8px; font-weight:bold; width:30%;"><?php echo esc_html($addon['name']); ?>:</td>
							<td style="padding:8px;">
								v<?php echo esc_html($addon['version']); ?>
								<?php if (isset($addon['build'])): ?>
									<br><span style="font-family:monospace; font-size:11px; color:#666;"><?php echo esc_html($addon['build']); ?></span>
								<?php endif; ?>
							</td>
						</tr>
						<?php endif; ?>
					<?php endforeach; ?>
				</table>
			</div>
			<?php endif; ?>
		</div>
	</div>
	
	<?php
}

/**
 * Loading Necessary Scripts
 */
add_action('admin_enqueue_scripts', 'simplyconf_load_scripts');
function simplyconf_load_scripts() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading GET parameter for page identification only.
	if ( isset( $_GET['page'] ) && sanitize_key( $_GET['page'] ) === 'simplyconf' ) {

		// get the default event and load it
		$default_event = null;
		try {
			$events        = new SimplyConf_Event_Routes();
			$default_event = $events->get_default_event();
		} catch (Exception $e) {
			error_log('SimplyConf: Error loading default event - ' . $e->getMessage());
		}

		// Enqueue WordPress packages with all their dependencies
		wp_enqueue_script('wp-hooks');    // Required by wp-i18n
		wp_enqueue_script('wp-i18n');     // Provides translation functions
		wp_enqueue_script('react');       // Required by wp-element
		wp_enqueue_script('react-dom');   // Required by wp-element
		wp_enqueue_script('wp-element');  // Provides React wrapper

		// Enqueue WordPress Media Library for logo uploads
		wp_enqueue_media();

		wp_enqueue_script('simplyconf-scripts', SIMPLYCONF_URL . 'dist/simplyconf.js', array( 'react', 'react-dom', 'wp-element' ), wp_rand(), true);

		// Version modal toggle — enqueued here to avoid inline <script> in admin_footer output.
		wp_add_inline_script( 'simplyconf-scripts', '(function(){var m=document.getElementById("simplyconf-version-modal"),l=document.getElementById("simplyconf-version-info"),c=document.getElementById("simplyconf-version-close");if(l){l.onclick=function(e){e.preventDefault();if(m)m.style.display="block";};}if(c){c.onclick=function(){if(m)m.style.display="none";};}window.addEventListener("click",function(e){if(e.target===m)m.style.display="none";});})();' );

		// Load translations into our custom i18n utility
		$locale     = get_locale();
		$json_files = glob(plugin_dir_path(__FILE__) . 'languages/simplyconf-' . $locale . '-*.json');

		if ( ! empty($json_files)) {
			// Merge all translation files
			$all_translations = array();
			foreach ($json_files as $file) {
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Reading local translation files, not remote URLs.
			$data = json_decode( file_get_contents( $file ), true );
				if ($data && isset($data['locale_data'])) {
					// Check for both 'simplyconf' and 'messages' keys
					$translations = null;
					if (isset($data['locale_data']['simplyconf'])) {
						$translations = $data['locale_data']['simplyconf'];
					} elseif (isset($data['locale_data']['messages'])) {
						$translations = $data['locale_data']['messages'];
					}

					if ($translations) {
						// Remove metadata entry
						unset($translations['']);
						$all_translations = array_merge($all_translations, $translations);
					}
				}
			}

			// Pass translations to our i18n utility
			wp_localize_script(
				'simplyconf-scripts',
				'simplyconfI18n',
				array(
					'locale'       => $locale,
					'translations' => $all_translations,
				)
			);
		}

		// Get enabled features for current site
		$enabled_features = array();
		if ( class_exists( 'SimplyConf_Feature_Manager' ) ) {
			$manager = SimplyConf_Feature_Manager::instance();
			$enabled_features = $manager->get_enabled_features();
		}

		wp_localize_script(
			'simplyconf-scripts',
			'simplyconf',
			array(
				'apiUrl'     => home_url('/wp-json/simplyconf/v1'),
				'siteUrl'    => site_url(),
				'nonce'      => wp_create_nonce('wp_rest'),
				'eventId'    => isset($default_event) ? $default_event->event_id : 0,
	
				'isSaas'     => simplyconf_is_saas() ? 'true' : 'false',
				'features'   => $enabled_features, // Array of enabled feature slugs
				'addons'     => simplyconf_get_addons(), // Add-on registry
				'locale'     => get_locale(), // Current WordPress locale (e.g., 'en_US', 'fr_FR')
				'dateFormat' => get_option('date_format', 'F j, Y'),
				'timeFormat' => get_option('time_format', 'g:i a'),
		)
		);
	}
}

