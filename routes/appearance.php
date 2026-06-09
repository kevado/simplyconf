<?php
/**
 * SimplyConf Appearance Settings REST API Routes
 * Handles theme customization settings via REST API
 */

defined('ABSPATH') or die('ERROR: You do not have permission to access this page');

class SimplyConf_Appearance_API {
	public function __construct() {
		add_action('rest_api_init', array( $this, 'register_routes' ));
	}

	/**
	 * Register REST API routes
	 */
	public function register_routes() {

		register_rest_route(
			'simplyconf/v1',
			'/appearance-settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_appearance_settings' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => array(),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'update_appearance_settings' ),
					'permission_callback' => array( $this, 'check_admin_permissions' ),
					'args'                => array(
						'settings' => array(
							'required'          => true,
							'validate_callback' => array( $this, 'validate_settings' ),
						),
					),
				),
			)
		);

		register_rest_route(
			'simplyconf/v1',
			'/appearance-settings/presets',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_theme_presets' ),
				'permission_callback' => array( $this, 'check_permissions' ),
				'args'                => array(),
			)
		);
	}

	/**
	 * Check if user has permission to view appearance settings
	 * Allow all users (including non-logged-in) to view appearance settings
	 * since these are just theme customizations
	 */
	public function check_permissions( $request ) {
		return true;
	}

	/**
	 * Check if user has admin permission to update appearance settings
	 */
	public function check_admin_permissions( $request ) {
		return current_user_can('manage_options');
	}

	/**
	 * Validate settings data
	 */
	public function validate_settings( $settings ) {
		// Accept any array or object structure
		// The settings will be stored as-is and merged with defaults on retrieval
		if ( ! is_array($settings) && ! is_object($settings)) {
			return false;
		}

		return true;
	}

	/**
	 * Get appearance settings
	 */
	public function get_appearance_settings( $request ) {
		global $wpdb;

		try {
			$table_name = SimplyConf_DB::get_table('appearance_settings');

			// Check if table exists
			$table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;

			if ( ! $table_exists) {
				// Return default settings if table doesn't exist
				return new WP_REST_Response(
					array(
						'version'    => '1.0',
						'branding'   => array(
							'logo_url'          => '',
							'organization_name' => get_bloginfo('name'),
						),
						'colors'     => array(
							'primary' => '#41618d',
							'success' => '#10B981',
							'warning' => '#F59E0B',
							'error'   => '#EF4444',
							'info'    => '#41618d',
						),
						'typography' => array(
							'fontFamily'   => 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
							'baseFontSize' => 14,
						),
						'layout'     => array(
							'borderRadius'    => 12,
							'shadowIntensity' => 'medium',
						),
						'preset'     => 'default',
					),
					200
				);
			}

			$settings = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT setting_value FROM {$table_name} WHERE setting_key = %s",
					'theme_config'
				)
			);

			if ( ! $settings) {
				// Return default settings if none exist
				return new WP_REST_Response(
					array(
						'version'    => '1.0',
						'branding'   => array(
							'logo_url'          => '',
							'organization_name' => get_bloginfo('name'),
						),
						'colors'     => array(
							'primary' => '#41618d',
							'success' => '#10B981',
							'warning' => '#F59E0B',
							'error'   => '#EF4444',
							'info'    => '#41618d',
						),
						'typography' => array(
							'fontFamily'   => 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
							'baseFontSize' => 14,
						),
						'layout'     => array(
							'borderRadius'    => 12,
							'shadowIntensity' => 'medium',
						),
						'preset'     => 'default',
					),
					200
				);
			}

			$parsed_settings = json_decode($settings->setting_value, true);

			if (json_last_error() !== JSON_ERROR_NONE) {
				return new WP_Error('invalid_settings', 'Invalid JSON in settings', array( 'status' => 500 ));
			}

			return new WP_REST_Response($parsed_settings, 200);

		} catch (Exception $e) {
			return new WP_Error('database_error', 'Failed to retrieve settings: ' . $e->getMessage(), array( 'status' => 500 ));
		}
	}

	/**
	 * Update appearance settings
	 */
	public function update_appearance_settings( $request ) {
		global $wpdb;

		try {
			$settings        = $request->get_param('settings');
			$current_user_id = get_current_user_id();

			if ( ! $current_user_id) {
				return new WP_Error('unauthorized', 'User not authenticated', array( 'status' => 401 ));
			}

			$table_name = SimplyConf_DB::get_table('appearance_settings');

			// Check if table exists
			$table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;

			if ( ! $table_exists) {
				return new WP_Error('table_missing', 'Database table does not exist', array( 'status' => 500 ));
			}

			// Encode settings as JSON
			$settings_json = wp_json_encode($settings);

			if ($settings_json === false) {
				return new WP_Error('invalid_json', 'Failed to encode settings as JSON', array( 'status' => 400 ));
			}

			// Update or insert settings
			$result = $wpdb->replace(
				$table_name,
				array(
					'setting_key'   => 'theme_config',
					'setting_value' => $settings_json,
					'updated_by'    => $current_user_id,
				),
				array( '%s', '%s', '%d' )
			);

			if ($result === false) {
				return new WP_Error('database_error', 'Failed to save settings', array( 'status' => 500 ));
			}

			// Clear any caches that might exist
			wp_cache_flush();

			return new WP_REST_Response(
				array(
					'success' => true,
					'message' => 'Appearance settings updated successfully',
					'data'    => $settings,
				),
				200
			);

		} catch (Exception $e) {
			return new WP_Error('update_error', 'Failed to update settings: ' . $e->getMessage(), array( 'status' => 500 ));
		}
	}

	/**
	 * Get theme presets
	 * Note: Dark mode is not currently implemented. All presets use light backgrounds.
	 * To add dark mode support, implement theme algorithm switching in theme.js
	 */
	public function get_theme_presets( $request ) {
		$presets = array(
			'default'      => array(
				'name'        => 'Default',
				'description' => 'Clean and professional default theme',
				'colors'      => array(
					'primary' => '#41618d',
					'success' => '#10B981',
					'warning' => '#F59E0B',
					'error'   => '#EF4444',
				),
				'typography'  => array(
					'fontFamily'   => 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
					'baseFontSize' => 14,
					'fontWeight'   => 400,
					'lineHeight'   => 1.5,
					'letterSpacing' => 0,
				),
				'layout'      => array(
					'borderRadius'    => 12,
					'shadowIntensity' => 'medium',
				),
			),
			'modern'       => array(
				'name'        => 'Modern',
				'description' => 'Contemporary design with vibrant indigo and rounded corners',
				'colors'      => array(
					'primary' => '#6366f1',
					'success' => '#10b981',
					'warning' => '#f59e0b',
					'error'   => '#ef4444',
				),
				'typography'  => array(
					'fontFamily'   => 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
					'baseFontSize' => 14,
					'fontWeight'   => 400,
					'lineHeight'   => 1.6,
					'letterSpacing' => 0,
				),
				'layout'      => array(
					'borderRadius'    => 12,
					'shadowIntensity' => 'subtle',
				),
			),
			'professional' => array(
				'name'        => 'Professional',
				'description' => 'Corporate theme with navy blue and minimal styling',
				'colors'      => array(
					'primary' => '#1e3a8a',
					'success' => '#059669',
					'warning' => '#d97706',
					'error'   => '#dc2626',
				),
				'typography'  => array(
					'fontFamily'   => 'Georgia, "Times New Roman", serif',
					'baseFontSize' => 14,
					'fontWeight'   => 400,
					'lineHeight'   => 1.6,
					'letterSpacing' => 0.2,
				),
				'layout'      => array(
					'borderRadius'    => 4,
					'shadowIntensity' => 'medium',
				),
			),
			'vibrant'      => array(
				'name'        => 'Vibrant',
				'description' => 'Bold orange theme with energetic colors and large text',
				'colors'      => array(
					'primary' => '#f97316',
					'success' => '#22c55e',
					'warning' => '#eab308',
					'error'   => '#ef4444',
				),
				'typography'  => array(
					'fontFamily'   => '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
					'baseFontSize' => 15,
					'fontWeight'   => 500,
					'lineHeight'   => 1.5,
					'letterSpacing' => 0,
				),
				'layout'      => array(
					'borderRadius'    => 12,
					'shadowIntensity' => 'medium',
				),
			),
			'elegant'      => array(
				'name'        => 'Elegant',
				'description' => 'Sophisticated purple theme with refined typography',
				'colors'      => array(
					'primary' => '#7c3aed',
					'success' => '#059669',
					'warning' => '#d97706',
					'error'   => '#dc2626',
				),
				'typography'  => array(
					'fontFamily'   => '"Playfair Display", Georgia, serif',
					'baseFontSize' => 14,
					'fontWeight'   => 400,
					'lineHeight'   => 1.7,
					'letterSpacing' => 0.3,
				),
				'layout'      => array(
					'borderRadius'    => 6,
					'shadowIntensity' => 'subtle',
				),
			),
			'minimal'      => array(
				'name'        => 'Minimal',
				'description' => 'Clean black and white theme with sharp edges',
				'colors'      => array(
					'primary' => '#000000',
					'success' => '#16a34a',
					'warning' => '#ca8a04',
					'error'   => '#dc2626',
				),
				'typography'  => array(
					'fontFamily'   => '"Helvetica Neue", Helvetica, Arial, sans-serif',
					'baseFontSize' => 14,
					'fontWeight'   => 300,
					'lineHeight'   => 1.5,
					'letterSpacing' => 0.5,
				),
				'layout'      => array(
					'borderRadius'    => 2,
					'shadowIntensity' => 'none',
				),
			),
			'ocean'        => array(
				'name'        => 'Ocean',
				'description' => 'Calming teal and blue theme inspired by the sea',
				'colors'      => array(
					'primary' => '#0891b2',
					'success' => '#14b8a6',
					'warning' => '#f59e0b',
					'error'   => '#ef4444',
				),
				'typography'  => array(
					'fontFamily'   => 'Roboto, "Segoe UI", sans-serif',
					'baseFontSize' => 14,
					'fontWeight'   => 400,
					'lineHeight'   => 1.6,
					'letterSpacing' => 0,
				),
				'layout'      => array(
					'borderRadius'    => 10,
					'shadowIntensity' => 'subtle',
				),
			),
			'sunset'       => array(
				'name'        => 'Sunset',
				'description' => 'Warm rose and pink theme with soft shadows',
				'colors'      => array(
					'primary' => '#e11d48',
					'success' => '#16a34a',
					'warning' => '#f59e0b',
					'error'   => '#dc2626',
				),
				'typography'  => array(
					'fontFamily'   => 'Inter, -apple-system, sans-serif',
					'baseFontSize' => 14,
					'fontWeight'   => 400,
					'lineHeight'   => 1.5,
					'letterSpacing' => 0,
				),
				'layout'      => array(
					'borderRadius'    => 12,
					'shadowIntensity' => 'subtle',
				),
			),
		);

		return new WP_REST_Response($presets, 200);
	}
}

// Initialize the API
new SimplyConf_Appearance_API();
