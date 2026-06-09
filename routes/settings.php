<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * This file will create Custom Rest API End Points.
 */
class SimplyConf_Setting_Routes {


	public $settings_tbl;

	public function __construct() {
		global $wpdb;
		$this->settings_tbl = SimplyConf_DB::get_table('settings');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		register_rest_route(
			'simplyconf/v1',
			'/settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_settings' ),
				'permission_callback' => array( $this, 'get_settings_permission' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param, $request, $key ) {
							return is_numeric($param);
						},
					),
				),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/settings/public',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_public_user_settings' ),
				'permission_callback' => '__return_true', // Public access
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param, $request, $key ) {
							return is_numeric($param);
						},
					),
				),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/settings',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_setting' ),
				'permission_callback' => array( $this, 'get_settings_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/settings/category/(?P<category>[a-zA-Z0-9_-]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_settings_by_category' ),
				'permission_callback' => array( $this, 'get_settings_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/settings/(?P<name>[a-zA-Z0-9_-]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_settings_by_name' ),
				'permission_callback' => array( $this, 'get_settings_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/settings/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_settings' ),
				'permission_callback' => array( $this, 'get_settings_permission' ),
			)
		);
	}

	public function get_settings_permission() {
		return current_user_can('manage_options');
	}

	public function get_settings( $req ) {
		global $wpdb;
		$event_id = absint($req->get_param('event_id'));
		$results  = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->settings_tbl} WHERE event_id = %d ORDER BY `order` ASC",
				$event_id
			)
		);
		return rest_ensure_response($results);
	}

	public function get_public_user_settings( $req ) {
		global $wpdb;
		$event_id = absint($req->get_param('event_id'));

		// Only return user category settings for public access
		// Exclude secret key — it must never be exposed to the frontend
		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->settings_tbl} WHERE event_id = %d AND category = 'user' AND name != 'recaptcha_secret_key' ORDER BY `order` ASC",
				$event_id
			)
		);

		return rest_ensure_response($results);
	}

	public function create_setting( $req ) {
		global $wpdb;
		$params = $req->get_json_params();

		// Validate required fields
		if ( ! isset($params['event_id']) || ! isset($params['category']) || ! isset($params['name'])) {
			return new WP_Error('missing_required_fields', 'Missing required fields: event_id, category, name', array( 'status' => 400 ));
		}

		// Insert new setting
		$result = $wpdb->insert(
			$this->settings_tbl,
			array(
				'event_id' => intval($params['event_id']),
				'category' => sanitize_text_field($params['category']),
				'name'     => sanitize_text_field($params['name']),
				'label'    => isset($params['label']) ? sanitize_text_field($params['label']) : '',
				'type'     => isset($params['type']) ? sanitize_text_field($params['type']) : 'text',
				'value'    => isset($params['value']) ? sanitize_text_field($params['value']) : '',
				'order'    => isset($params['order']) ? intval($params['order']) : 0,
			)
		);

		if ($result === false) {
			return new WP_Error('db_error', 'Failed to create setting', array( 'status' => 500 ));
		}

		$setting_id = $wpdb->insert_id;

		// Return the created setting
		$setting  = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->settings_tbl} WHERE setting_id = %d", $setting_id));
		$response = rest_ensure_response($setting);
		$response->set_status(201);
		return $response;
	}

	public function update_settings( $req ) {
		global $wpdb;
		$params  = $req->get_json_params();
		$eventId = intval($req->get_param('id'));
		
		foreach ($params as $id => $value) {
			// Get the setting to check its type
			$setting = $wpdb->get_row($wpdb->prepare(
				"SELECT type FROM {$this->settings_tbl} WHERE setting_id = %d AND event_id = %d",
				intval($id), $eventId
			));
			
			if ($setting) {
				// Sanitize based on setting type
				if ($setting->type === 'number') {
					// For numeric settings, ensure it's a valid number
					$clean_value = is_numeric($value) ? $value : '0';
				} elseif ($setting->type === 'boolean') {
					// For boolean settings, ensure it's 1 or 0
					$clean_value = ($value === '1' || $value === 1 || $value === true) ? '1' : '0';
				} else {
					// For text settings, use regular sanitization
					$clean_value = sanitize_text_field($value);
				}
				
				$wpdb->update(
					$this->settings_tbl,
					array( 'value' => $clean_value ),
					array( 'setting_id' => intval($id), 'event_id' => $eventId ),
				);
			}
		}
		
		return rest_ensure_response('Settings updated successfully');
	}

	public function get_settings_by_category( $request ) {
		global $wpdb;
		$category = $request['category'];
		$results  = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$this->settings_tbl} WHERE category = %s ORDER BY `order` ASC", $category));

		if (empty($results)) {
			return new WP_Error('no_settings', 'No settings found for this category', array( 'status' => 404 ));
		}
		return rest_ensure_response($results);
	}

	// Callback to fetch an individual setting by name
	function get_settings_by_name( $request ) {
		global $wpdb;
		$name   = $request['name'];
		$result = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->settings_tbl} WHERE name = %s", $name));

		if ( ! $result) {
			return new WP_Error('setting_not_found', 'Setting not found', array( 'status' => 404 ));
		}
		return rest_ensure_response($result);
	}
}
new SimplyConf_Setting_Routes();
