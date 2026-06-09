<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * User Preferences REST API Routes
 */
class SimplyConf_Preferences_Routes {

	private $preferences_tbl;

	public function __construct() {
		global $wpdb;
		$this->preferences_tbl = SimplyConf_DB::get_table('user_preferences');
	}

	public function register_routes() {
		// GET /preferences?event_id={id}&context={context}
		register_rest_route(
			'simplyconf/v1',
			'/preferences',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_preferences' ),
				'permission_callback' => function () {
					return is_user_logged_in();
				},
			)
		);

		// POST /preferences
		register_rest_route(
			'simplyconf/v1',
			'/preferences',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'save_preference' ),
				'permission_callback' => function () {
					return is_user_logged_in();
				},
			)
		);

		// DELETE /preferences/{id}
		register_rest_route(
			'simplyconf/v1',
			'/preferences/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_preference' ),
				'permission_callback' => function () {
					return is_user_logged_in();
				},
			)
		);
	}

	/**
	 * Get user preferences
	 * Query params: event_id (required), context (optional), preference_key (optional)
	 */
	public function get_preferences( $request ) {
		global $wpdb;
		$user_id        = get_current_user_id();
		$event_id       = $request->get_param('event_id');
		$context        = $request->get_param('context');
		$preference_key = $request->get_param('preference_key');

		if ( ! $event_id) {
			return new WP_Error('missing_params', 'Event ID is required', array( 'status' => 400 ));
		}

		$where = $wpdb->prepare('user_id = %d AND event_id = %d', $user_id, $event_id);

		if ($context) {
			$where .= $wpdb->prepare(' AND context = %s', $context);
		}

		if ($preference_key) {
			$where .= $wpdb->prepare(' AND preference_key = %s', $preference_key);
		}

		$query       = 'SELECT * FROM ' . esc_sql($this->preferences_tbl) . ' WHERE ' . $where;
		$preferences = $wpdb->get_results(
			$query, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			ARRAY_A
		);

		// Decode JSON values
		foreach ($preferences as &$pref) {
			$pref['preference_value'] = json_decode($pref['preference_value'], true);
		}

		return rest_ensure_response($preferences);
	}

	/**
	 * Save or update preference
	 * Body: { event_id, context, preference_key, preference_value }
	 */
	public function save_preference( $request ) {
		global $wpdb;
		$user_id          = get_current_user_id();
		$event_id         = $request->get_param('event_id');
		$context          = $request->get_param('context');
		$preference_key   = $request->get_param('preference_key');
		$preference_value = $request->get_param('preference_value');

		if ( ! $event_id || ! $context || ! $preference_key || ! $preference_value) {
			return new WP_Error('missing_params', 'Required fields: event_id, context, preference_key, preference_value', array( 'status' => 400 ));
		}

		// Encode value as JSON
		$value_json = wp_json_encode($preference_value);

		// Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
		$query = 'INSERT INTO ' . esc_sql($this->preferences_tbl) . ' (user_id, event_id, context, preference_key, preference_value, created, modified) VALUES (%d, %d, %s, %s, %s, NOW(), NOW()) ON DUPLICATE KEY UPDATE preference_value = VALUES(preference_value), modified = NOW()';

		$result = $wpdb->query(
			$wpdb->prepare(
				$query, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$user_id,
				$event_id,
				$context,
				$preference_key,
				$value_json
			)
		);

		if ($result === false) {
			return new WP_Error('save_failed', 'Failed to save preference', array( 'status' => 500 ));
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Preference saved successfully',
			)
		);
	}

	/**
	 * Delete preference
	 */
	public function delete_preference( $request ) {
		global $wpdb;
		$user_id       = get_current_user_id();
		$preference_id = $request->get_param('id');

		// Ensure user can only delete their own preferences
		$result = $wpdb->delete(
			$this->preferences_tbl,
			array(
				'preference_id' => $preference_id,
				'user_id'       => $user_id,
			),
			array( '%d', '%d' )
		);

		if ($result === false) {
			return new WP_Error('delete_failed', 'Failed to delete preference', array( 'status' => 500 ));
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Preference deleted successfully',
			)
		);
	}
}

// Initialize routes
add_action(
	'rest_api_init',
	function () {
	$preferences_routes = new SimplyConf_Preferences_Routes();
	$preferences_routes->register_routes();
	}
);
