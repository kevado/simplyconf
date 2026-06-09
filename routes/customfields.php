<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * This file creates Custom Rest API End Points for custom field CRUD.
 */
class SimplyConf_Custom_Fields_Routes {

	public $custom_fields_tbl;
	public function __construct() {
		global $wpdb;
		$this->custom_fields_tbl = SimplyConf_DB::get_table('custom_fields');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		register_rest_route(
			'simplyconf/v1',
			'/customfields',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_custom_fields' ),
				'permission_callback' => array( $this, 'get_permission' ),
				'args'                => array(
					'event_id' => array(
						'required'          => false,
						'validate_callback' => function ( $param ) {
							return is_numeric($param);
						},
					),
					'usage'    => array(
						'required'          => false,
						'validate_callback' => function ( $param ) {
							return in_array($param, array( 'abstract', 'review', 'user', 'author' ));
						},
					),
				),
			)
		);
		
		// Public endpoint for registration custom fields (no authentication required)
		register_rest_route(
			'simplyconf/v1',
			'/customfields/public',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_custom_fields' ),
				'permission_callback' => '__return_true', // Public access
				'args'                => array(
					'event_id' => array(
						'required'          => false,
						'validate_callback' => function ( $param ) {
							return is_numeric($param);
						},
					),
					'usage'    => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return $param === 'user'; // Only allow user fields for registration
						},
					),
				),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/customfields/(?P<field_id>\\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_custom_field' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/customfields',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_or_update_custom_field' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/customfields/(?P<field_id>\\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_custom_field' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/customfields/(?P<field_id>\\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_custom_field' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/customfields/bulk-delete',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'bulk_delete_custom_fields' ),
				'permission_callback' => array( $this, 'admin_permission' ),
				'args'                => array(
					'field_ids' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_array($param) && ! empty($param);
						},
					),
				),
			)
		);
	}

	public function get_permission( $request ) {
		$is_authenticated = is_user_logged_in();
		return apply_filters('simplyconf_permission_check', $is_authenticated, 'customfields');
	}
	public function admin_permission() {
		return current_user_can('manage_options');
	}

	public function get_custom_fields( $request ) {
		global $wpdb;
		$event_id = $request->get_param('event_id');
		$usage    = $request->get_param('usage');

		$where_conditions = array();
		$prepare_values   = array();

		if ($event_id) {
			$where_conditions[] = '(event_id = %d OR event_id IS NULL)';
			$prepare_values[]   = $event_id;
		}

		if ($usage) {
			$where_conditions[] = '`usage` = %s';
			$prepare_values[]   = $usage;
		}

		$where = count($where_conditions) > 0 ? 'WHERE ' . implode(' AND ', $where_conditions) : '';
		$query = "SELECT * FROM {$this->custom_fields_tbl} {$where} ORDER BY order_num ASC";

		if (count($prepare_values) > 0) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- $query uses $wpdb->prepare(); table name from internal class property.
			$fields = $wpdb->get_results($wpdb->prepare($query, $prepare_values));
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- No user input; table name from internal class property.
			$fields = $wpdb->get_results($query);
		}

		return rest_ensure_response($fields);
	}

	public function get_custom_field( $request ) {
		global $wpdb;
		$field_id = intval($request->get_param('field_id'));
		$field    = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->custom_fields_tbl} WHERE field_id = %d", $field_id));
		if ( ! $field) {
			return new WP_Error('invalid_field_id', 'Could not locate field id', array( 'status' => 404 ));
		}
		return rest_ensure_response($field);
	}

	public function create_or_update_custom_field( $request ) {
		global $wpdb;
		$params = $request->get_json_params();

		// Validate conditional_logic if provided
		if (isset($params['conditional_logic']) && $params['conditional_logic'] !== null) {
			if ( ! is_string($params['conditional_logic'])) {
				return new WP_Error('invalid_conditional_logic', 'Conditional logic must be a JSON string or null', array( 'status' => 400 ));
			}

			// Validate JSON format
			$decoded = json_decode($params['conditional_logic'], true);
			if (json_last_error() !== JSON_ERROR_NONE) {
				return new WP_Error('invalid_conditional_logic', 'Conditional logic must be valid JSON', array( 'status' => 400 ));
			}

			// Basic structure validation
			if ( ! isset($decoded['enabled']) || ! isset($decoded['action']) || ! isset($decoded['rules']) || ! isset($decoded['logic'])) {
				return new WP_Error('invalid_conditional_logic', 'Conditional logic missing required fields', array( 'status' => 400 ));
			}

			// Validate action
			if ( ! in_array($decoded['action'], array( 'show', 'hide' ))) {
				return new WP_Error('invalid_conditional_logic', 'Action must be "show" or "hide"', array( 'status' => 400 ));
			}

			// Validate logic
			if ( ! in_array($decoded['logic'], array( 'all', 'any' ))) {
				return new WP_Error('invalid_conditional_logic', 'Logic must be "all" or "any"', array( 'status' => 400 ));
			}
		}

		if (isset($params['field_id'])) {
			$wpdb->update($this->custom_fields_tbl, $params, array( 'field_id' => $params['field_id'] ));
			$id = $params['field_id'];
		} else {
			$wpdb->insert($this->custom_fields_tbl, $params);
			$id = $wpdb->insert_id;
		}
		$field = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->custom_fields_tbl} WHERE field_id = %d", $id));
		return rest_ensure_response($field);
	}

	public function update_custom_field( $request ) {
		global $wpdb;
		$field_id = intval($request->get_param('field_id'));
		$params   = $request->get_json_params();

		// Validate conditional_logic if provided
		if (isset($params['conditional_logic']) && $params['conditional_logic'] !== null) {
			if ( ! is_string($params['conditional_logic'])) {
				return new WP_Error('invalid_conditional_logic', 'Conditional logic must be a JSON string or null', array( 'status' => 400 ));
			}

			// Validate JSON format
			$decoded = json_decode($params['conditional_logic'], true);
			if (json_last_error() !== JSON_ERROR_NONE) {
				return new WP_Error('invalid_conditional_logic', 'Conditional logic must be valid JSON', array( 'status' => 400 ));
			}

			// Basic structure validation
			if ( ! isset($decoded['enabled']) || ! isset($decoded['action']) || ! isset($decoded['rules']) || ! isset($decoded['logic'])) {
				return new WP_Error('invalid_conditional_logic', 'Conditional logic missing required fields', array( 'status' => 400 ));
			}

			// Validate action
			if ( ! in_array($decoded['action'], array( 'show', 'hide' ))) {
				return new WP_Error('invalid_conditional_logic', 'Action must be "show" or "hide"', array( 'status' => 400 ));
			}

			// Validate logic
			if ( ! in_array($decoded['logic'], array( 'all', 'any' ))) {
				return new WP_Error('invalid_conditional_logic', 'Logic must be "all" or "any"', array( 'status' => 400 ));
			}
		}

		$wpdb->update($this->custom_fields_tbl, $params, array( 'field_id' => $field_id ));
		$field = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->custom_fields_tbl} WHERE field_id = %d", $field_id));
		return rest_ensure_response($field);
	}

	public function delete_custom_field( $request ) {
		global $wpdb;
		$field_id = intval($request->get_param('field_id'));
		$wpdb->delete($this->custom_fields_tbl, array( 'field_id' => $field_id ));
		return rest_ensure_response(array( 'deleted' => true ));
	}

	public function bulk_delete_custom_fields( $request ) {
		global $wpdb;
		$field_ids = $request->get_param('field_ids');

		if ( ! is_array($field_ids) || empty($field_ids)) {
			return new WP_Error('invalid_field_ids', 'Field IDs must be a non-empty array', array( 'status' => 400 ));
		}

		// Sanitize and validate field IDs
		$field_ids = array_map('intval', $field_ids);
		$field_ids = array_filter(
			$field_ids,
			function ( $id ) {
			return $id > 0;
			}
		);

		if (empty($field_ids)) {
			return new WP_Error('invalid_field_ids', 'No valid field IDs provided', array( 'status' => 400 ));
		}

		// Delete the fields
		$placeholders = str_repeat('%d,', count($field_ids) - 1) . '%d';
		$query        = "DELETE FROM {$this->custom_fields_tbl} WHERE field_id IN ({$placeholders})";

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- $query built with %d placeholders and passed to $wpdb->prepare(); table name from internal class property.
		$deleted = $wpdb->query($wpdb->prepare($query, $field_ids));

		if ($deleted === false) {
			return new WP_Error('delete_failed', 'Failed to delete custom fields', array( 'status' => 500 ));
		}

		return rest_ensure_response(
			array(
				'deleted' => true,
				'count'   => $deleted,
			)
		);
	}

	public function toggle_admin_visibility( $request ) {
		global $wpdb;
		$field_id      = intval($request->get_param('field_id'));
		$params        = $request->get_json_params();
		$show_in_admin = isset($params['show_in_admin']) ? (bool) $params['show_in_admin'] : true;

		$wpdb->update(
			$this->custom_fields_tbl,
			array( 'show_in_admin' => $show_in_admin ? 1 : 0 ),
			array( 'field_id' => $field_id )
		);

		$field = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->custom_fields_tbl} WHERE field_id = %d", $field_id));
		return rest_ensure_response($field);
	}
}

new SimplyConf_Custom_Fields_Routes();
