<?php

/**
 * Add-On Registry System
 *
 * Manages registration, detection, and validation of SimplyConf add-ons.
 *
 * @package SimplyConf
 * @since 3.0.0
 */

if ( ! defined('ABSPATH')) {
	exit;
}

/**
 * Global storage for registered add-ons
 */
global $simplyconf_addons;
$simplyconf_addons = array();

/**
 * Register an add-on with the core plugin
 *
 * @param string $slug Add-on slug (e.g., 'reviews', 'emails')
 * @param array  $data Add-on configuration data
 * @return boolean True on success, false on failure
 *
 * @since 3.0.0
 */
function simplyconf_register_addon( $slug, $data = array() ) {
	global $simplyconf_addons;

	if ( ! isset($simplyconf_addons)) {
		$simplyconf_addons = array();
	}

	// Validate required fields
	if (empty($slug) || ! is_string($slug)) {
		return false;
	}

	// Parse add-on data with defaults
	$addon = wp_parse_args(
		$data,
		array(
			'name'          => ucfirst($slug),
			'slug'          => $slug,
			'version'       => '1.0.0',
			'build'         => '1.0.0-unknown',
			'active'        => true,
			'path'          => '',
			'url'           => '',
			'main_file'     => '',
			'requires_core' => SIMPLYCONF_VERSION,
			'js_bundle'     => '',
			'has_admin'     => true,
			'has_frontend'  => false,
		)
	);

	// Store add-on
	$simplyconf_addons[ $slug ] = $addon;

	// Fire action hook for extensibility
	do_action('simplyconf_addon_registered', $slug, $addon);

	return true;
}

/**
 * Check if an add-on is registered and active
 *
 * @param string $slug Add-on slug
 * @return boolean True if add-on is active, false otherwise
 *
 * @since 3.0.0
 */
function simplyconf_has_addon( $slug ) {
	global $simplyconf_addons;

	if ( ! isset($simplyconf_addons) || empty($simplyconf_addons)) {
		return false;
	}

	return isset($simplyconf_addons[ $slug ]) &&
		! empty($simplyconf_addons[ $slug ]['active']);
}

/**
 * Get all registered add-ons
 *
 * @return array Associative array of add-ons
 *
 * @since 3.0.0
 */
function simplyconf_get_addons() {
	global $simplyconf_addons;

	if ( ! isset($simplyconf_addons)) {
		$simplyconf_addons = array();
	}

	// Allow filtering of add-ons list
	return apply_filters('simplyconf_addons', $simplyconf_addons);
}

/**
 * Get specific add-on data
 *
 * @param string $slug Add-on slug
 * @return array|null Add-on data or null if not found
 *
 * @since 3.0.0
 */
function simplyconf_get_addon( $slug ) {
	$addons = simplyconf_get_addons();

	return $addons[ $slug ] ?? null;
}

/**
 * Check if add-on version is compatible with core
 *
 * @param string $slug Add-on slug
 * @return boolean True if compatible, false otherwise
 *
 * @since 3.0.0
 */
function simplyconf_is_addon_compatible( $slug ) {
	$addon = simplyconf_get_addon($slug);

	if ( ! $addon) {
		return false;
	}

	$required_version = $addon['requires_core'] ?? '3.0.0';
	$current_version  = SIMPLYCONF_VERSION;

	return version_compare($current_version, $required_version, '>=');
}
/**
 * Display admin notice for incompatible add-on
 *
 * @param string $addon_name       Add-on name
 * @param string $required_version Required core version
 *
 * @since 3.0.0
 */
function simplyconf_addon_incompatible_notice( $addon_name, $required_version ) {
?>
	<div class="notice notice-error">
		<p>
			<strong><?php echo esc_html($addon_name); ?></strong> <?php esc_html_e('requires', 'simplyconf'); ?>
			<?php
			// translators: %s is the required SimplyConf core version number.
			printf( wp_kses( __('SimplyConf version %s or higher.', 'simplyconf'), array( 'strong' => array() ) ), '<strong>' . esc_html($required_version) . '</strong>' );
			?>
			<?php
			// translators: %s is the currently installed SimplyConf core version number.
			printf( wp_kses( __('You are running version %s.', 'simplyconf'), array( 'strong' => array() ) ), '<strong>' . esc_html(SIMPLYCONF_VERSION) . '</strong>' );
			?>
		</p>
		<p>
			<a href="<?php echo esc_url(admin_url('plugins.php')); ?>"><?php esc_html_e('Update SimplyConf', 'simplyconf'); ?></a>
		</p>
	</div>
<?php
}

/**
 * Check all add-on compatibility and display notices
 *
 * @since 3.0.0
 */
function simplyconf_check_addon_compatibility() {
	$addons = simplyconf_get_addons();

	foreach ($addons as $slug => $addon) {
		if ( ! simplyconf_is_addon_compatible($slug)) {
			add_action(
				'admin_notices',
				function () use ( $addon ) {
				simplyconf_addon_incompatible_notice(
					$addon['name'],
					$addon['requires_core']
				);
				}
			);
		}
	}
}
add_action('admin_init', 'simplyconf_check_addon_compatibility');

/**
 * Display admin notice for missing add-on
 *
 * @param string $addon_slug   Add-on slug
 * @param string $feature_name Feature name requiring the add-on
 *
 * @since 3.0.0
 */
function simplyconf_missing_addon_notice( $addon_slug, $feature_name = '' ) {
	$addon_names = array(
		'reviews'   => __('Reviews Add-On', 'simplyconf'),
		'emails'    => __('Emails Add-On', 'simplyconf'),
		'schedules' => __('Schedules Builder Add-On', 'simplyconf'),
		'payments'  => __('Payments & Registration Add-On', 'simplyconf'),
		'exports'   => __('Exports Add-On', 'simplyconf'),
	);

	// translators: %s is the add-on slug/name (e.g. "Reviews").
	$addon_name = $addon_names[ $addon_slug ] ?? sprintf(__('%s Add-On', 'simplyconf'), ucfirst($addon_slug));
	// translators: %s is the feature name that requires the add-on.
	$feature    = $feature_name ? sprintf(__('%s feature', 'simplyconf'), $feature_name) : __('This feature', 'simplyconf');

?>
	<div class="notice notice-warning is-dismissible">
		<p>
			<strong><?php echo esc_html($feature); ?></strong> <?php esc_html_e('requires the', 'simplyconf'); ?>
			<strong><?php echo esc_html($addon_name); ?></strong>.
		</p>
		<p>
			<a href="https://simplyconf.com/addons/<?php echo esc_attr($addon_slug); ?>" target="_blank">
				<?php
			// translators: %s is the add-on name (e.g. "Reviews Add-On").
			echo esc_html( sprintf( __('Get %s →', 'simplyconf'), $addon_name ) );
			?>
			</a>
		</p>
	</div>
<?php
}

/**
 * Get add-on count
 *
 * @return integer Number of registered add-ons
 *
 * @since 3.0.0
 */
function simplyconf_get_addon_count() {
	$addons = simplyconf_get_addons();
	return count($addons);
}

/**
 * Get active add-on count
 *
 * @return integer Number of active add-ons
 *
 * @since 3.0.0
 */
function simplyconf_get_active_addon_count() {
	$addons = simplyconf_get_addons();
	return count(
		array_filter(
			$addons,
			function ( $addon ) {
				return ! empty($addon['active']);
			}
		)
	);
}

/**
 * Deregister an add-on
 *
 * @param string $slug Add-on slug
 * @return boolean True on success, false on failure
 *
 * @since 3.0.0
 */
function simplyconf_deregister_addon( $slug ) {
	global $simplyconf_addons;

	if ( ! isset($simplyconf_addons[ $slug ])) {
		return false;
	}

	unset($simplyconf_addons[ $slug ]);

	do_action('simplyconf_addon_deregistered', $slug);

	return true;
}

/**
 * Debug function: Display all registered add-ons
 * Only works when WP_DEBUG is true
 *
 * @since 3.0.0
 */
function simplyconf_debug_addons() {
	if ( ! defined('WP_DEBUG') || ! WP_DEBUG) {
		return;
	}

	$addons = simplyconf_get_addons();

	echo '<pre>';
	// translators: %d is the number of registered add-ons.
	echo esc_html( sprintf( __('SimplyConf Add-Ons (%d registered)', 'simplyconf'), count($addons) ) ) . "\n";
	echo esc_html( str_repeat('=', 50) ) . "\n\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal newlines are safe.

	if (empty($addons)) {
		echo 'No add-ons registered.' . "\n";
	} else {
		foreach ($addons as $slug => $addon) {
			echo esc_html( sprintf(
				"[%s] %s v%s %s\n",
				$slug,
				$addon['name'],
				$addon['version'],
				$addon['active'] ? '✓ Active' : '✗ Inactive'
			) );
		}
	}

	echo '</pre>';
}
