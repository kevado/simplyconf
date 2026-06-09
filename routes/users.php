<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * This file will create Custom Rest API End Points for users CRUD.
 */
class SimplyConf_Users_Routes {

	public $event_user_roles_tbl;
	public $custom_values_tbl;
	public function __construct() {
		global $wpdb;
		$this->event_user_roles_tbl = SimplyConf_DB::get_table('event_user_roles');
		$this->custom_values_tbl    = SimplyConf_DB::get_table('custom_values');
		add_action('rest_api_init', array( $this, 'create_user_routes' ), 20);
	}

	public function create_user_routes() {
		register_rest_route(
			'simplyconf/v1',
			'/users',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_users' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/users/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_user' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/users',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_user' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/users/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_user' ),
				'permission_callback' => array( $this, 'own_or_admin_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/users/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_user' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
		// Event role management
		register_rest_route(
			'simplyconf/v1',
			'/event-users',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_event_users' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/event-users/role',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'set_event_user_role' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/event-users/roles',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'set_event_user_roles' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/users/sync',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'sync_users' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
	}

	public function get_permission( $request ) {
		$is_authenticated = is_user_logged_in();
		return apply_filters('simplyconf_permission_check', $is_authenticated, 'users');
	}

	public function admin_permission( $request ) {
		return current_user_can('manage_options');
	}

	public function own_or_admin_permission( $request ) {
		if ( ! is_user_logged_in() ) {
			return false;
		}
		$id = intval( $request->get_param('id') );
		if ( get_current_user_id() === $id ) {
			return true;
		}
		return current_user_can('manage_options');
	}

	public function get_users( $request ) {
		global $wpdb;

		// Get query parameters
		$params      = $request->get_query_params();
		$role_filter = isset($params['role']) ? $params['role'] : null;

		// Get WordPress users for current site only (multisite-aware)
		$wp_user_args = array();

		// In multisite, only get users from current site
		if ( is_multisite() ) {
			$wp_user_args['blog_id'] = get_current_blog_id();
		}

		// If role filter is provided, add it to the query
		if ($role_filter) {
			$wp_user_args['role'] = $role_filter;
		}

		$wp_users = get_users($wp_user_args);
		$users    = array();

		foreach ($wp_users as $wp_user) {
			// Skip admin users ONLY if no role filter is specified (legacy behavior)
			if ( ! $role_filter && in_array('administrator', (array) $wp_user->roles, true)) {
				continue;
			}

			$user_data = array(
				'ID'           => $wp_user->ID, // WordPress standard
				'user_id'      => $wp_user->ID,
				'user_email'   => $wp_user->user_email, // WordPress standard
				'email'        => $wp_user->user_email,
				'display_name' => $wp_user->display_name,
				'username'     => $wp_user->user_login,
				'status'       => 1, // Always active for SimplyConf users
				'created'      => $wp_user->user_registered,
				'modified'     => $wp_user->user_registered, // Use WordPress user registration date
			);

			// Fetch custom fields for each user
			$user_data['custom_fields'] = SimplyConf_Helpers::get_entity_custom_fields($wp_user->ID, 'user');

			$users[] = $user_data;
		}

		return rest_ensure_response($users);
	}

	public function get_user( $req ) {
		global $wpdb;
		$id = intval($req->get_param('id'));

		$wp_user = get_userdata($id);
		if ( ! $wp_user) {
			return new WP_Error('invalid_user_id', 'Could not locate user id', array( 'status' => 404 ));
		}

		$user_data = array(
			'user_id'      => $wp_user->ID,
			'email'        => $wp_user->user_email,
			'display_name' => $wp_user->display_name,
			'username'     => $wp_user->user_login,
			'status'       => 1, // Always active for SimplyConf users
			'created'      => $wp_user->user_registered,
			'modified'     => $wp_user->user_registered, // Use WordPress user registration date
		);

		// Fetch custom fields for response
		$user_data['custom_fields'] = SimplyConf_Helpers::get_entity_custom_fields($id, 'user');

		return rest_ensure_response($user_data);
	}

	public function create_user( $req ) {
		global $wpdb;
		$payload = $req->get_json_params();

		$payload['login']    = sanitize_text_field($payload['login']);
		$payload['email']    = sanitize_email($payload['email']);
		$payload['password'] = sanitize_text_field($payload['password']);

		// Extract custom fields from payload
		$custom_fields = isset($payload['custom_fields']) ? $payload['custom_fields'] : array();
		unset($payload['custom_fields']); // Remove from main payload

		// Insert user into WordPress
		$user_data = array(
			'user_login' => $payload['login'],
			'user_email' => $payload['email'],
			'user_pass'  => $payload['password'],
		);
		$user_id   = wp_insert_user($user_data);

		// Handle errors
		if (is_wp_error($user_id)) {
			return rest_ensure_response(
				array(
					'error' => $user_id->get_error_message(),
				)
			);
		}

		// Set SimplyConf user metadata - no longer needed, using WordPress core functionality

		// Insert custom field values
		if ( ! empty($custom_fields)) {
			foreach ($custom_fields as $field) {
				// Handle array values (like checkbox groups) by JSON encoding
				$value = is_array($field['value']) ? json_encode($field['value']) : $field['value'];

				$wpdb->insert(
					$this->custom_values_tbl,
					array(
						'entity_id'   => $user_id,
						'entity_type' => 'user',
						'field_id'    => $field['field_id'],
						'value'       => $value,
					)
				);
			}
		}

		// Get the created user data for response
		$wp_user       = get_userdata($user_id);
		$user_response = array(
			'user_id'      => $wp_user->ID,
			'email'        => $wp_user->user_email,
			'display_name' => $wp_user->display_name,
			'username'     => $wp_user->user_login,
			'status'       => 1,
			'created'      => $wp_user->user_registered,
		);

		// Fetch custom fields for response
		$user_response['custom_fields'] = SimplyConf_Helpers::get_entity_custom_fields($user_id, 'user');

		// Return response
		$response = rest_ensure_response($user_response);
		$response->set_status(201);
		return $response;
	}

	public function update_user( $req ) {
		global $wpdb;
		$payload = $req->get_json_params();
		$id      = intval($req->get_param('id'));

		// Extract custom fields from payload
		$custom_fields = isset($payload['custom_fields']) ? $payload['custom_fields'] : array();
		unset($payload['custom_fields']); // Remove from main payload

		// Update WordPress user if basic fields are provided
		if (isset($payload['display_name']) || isset($payload['email'])) {
			$userdata = array( 'ID' => $id );
			if ( ! empty($payload['display_name'])) {
				$userdata['display_name'] = sanitize_text_field($payload['display_name']);
			}
			if ( ! empty($payload['email'])) {
				$userdata['user_email'] = sanitize_email($payload['email']);
			}

			$wp_result = wp_update_user($userdata);
			if (is_wp_error($wp_result)) {
				return new WP_Error('update_failed', 'Failed to update user', array( 'status' => 400 ));
			}
		}

		// Update custom fields
		if ( ! empty($custom_fields)) {
			foreach ($custom_fields as $field) {
				// Handle array values (like checkbox groups) by JSON encoding
				$value = is_array($field['value']) ? json_encode($field['value']) : $field['value'];

				$exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->custom_values_tbl} WHERE entity_id = %d AND entity_type = 'user' AND field_id = %d", $id, $field['field_id']));
				if ($exists) {
					$wpdb->update($this->custom_values_tbl, array( 'value' => $value ), array( 'entity_id' => $id, 'entity_type' => 'user', 'field_id' => $field['field_id'] ));
				} else {
					$wpdb->insert($this->custom_values_tbl, array( 'entity_id' => $id, 'entity_type' => 'user', 'field_id' => $field['field_id'], 'value' => $value ));
				}
			}
		}

		// Update metadata - no longer tracking modification time

		// Get updated user data for response
		$wp_user       = get_userdata($id);
		$user_response = array(
			'user_id'      => $wp_user->ID,
			'email'        => $wp_user->user_email,
			'display_name' => $wp_user->display_name,
			'username'     => $wp_user->user_login,
			'status'       => 1, // Always active for SimplyConf users
			'created'      => $wp_user->user_registered,
			'modified'     => $wp_user->user_registered, // Use WordPress user registration date
		);

		// Fetch custom fields for response
		$user_response['custom_fields'] = SimplyConf_Helpers::get_entity_custom_fields($id, 'user');

		return rest_ensure_response($user_response);
	}

	public function delete_user( $req ) {
		if ( ! function_exists('wp_delete_user')) {
			require_once ABSPATH . 'wp-includes/pluggable.php';
		}
		global $wpdb;

		$id      = intval($req->get_param('id'));
		$wp_user = get_userdata($id);
		if ( ! $id || ! $wp_user) {
			return rest_ensure_response(
				array(
					'success' => false,
					'message' => 'Invalid user ID.',
				)
			);
		}
		// Prevent deleting WordPress admins
		if (in_array('administrator', (array) $wp_user->roles, true)) {
			return rest_ensure_response(
				array(
					'success' => false,
					'message' => 'Cannot delete a WordPress admin user.',
				)
			);
		}

		// Delete custom field values first
		$custom_deleted = $wpdb->delete($this->custom_values_tbl, array( 'entity_id' => $id, 'entity_type' => 'user' ));

		// Delete event roles
		$roles_deleted = $wpdb->delete($this->event_user_roles_tbl, array( 'user_id' => $id ));

		// Attempt to delete the WordPress user
		require_once ABSPATH . 'wp-admin/includes/user.php';
		$user_deleted = wp_delete_user($id);

		if ($user_deleted) {
			return rest_ensure_response(
				array(
					'success' => true,
					'message' => 'User deleted successfully.',
				)
			);
		} else {
			return rest_ensure_response(
				array(
					'success' => false,
					'message' => 'Failed to delete user.',
				)
			);
		}
	}

	public function sync_users() {
		global $wpdb;
		// Get users from current site only (multisite-aware)
		$user_args = array();
		if ( is_multisite() ) {
			$user_args['blog_id'] = get_current_blog_id();
		}
		$users = get_users($user_args);
		$count = 0;
		foreach ($users as $user) {
			// Skip admin users
			if (in_array('administrator', (array) $user->roles, true)) {
				continue;
			}

			// Check if user already has SimplyConf-specific data (check event roles instead)
			$existing_roles = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$this->event_user_roles_tbl} WHERE user_id = %d",
					$user->ID
				)
			);

			if ( ! $existing_roles) {
				// Set default event role as 'author' for all events
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name uses $wpdb->prefix + hardcoded suffix; no user input.
				$events = $wpdb->get_results("SELECT event_id FROM {$wpdb->prefix}simplyconf_events where status = 1");
				if ( ! $events) {
					continue; // No events to assign roles
				}
				foreach ($events as $event) {
					$wpdb->insert(
						$this->event_user_roles_tbl,
						array(
							'event_id' => $event->event_id,
							'user_id'  => $user->ID,
							'role'     => 'author',
						),
						array( '%d', '%d', '%s' )
					);
				}
				++$count;
			}
		}
		return rest_ensure_response($count);
	}

	/**
	 * Get users with their event roles
	 */
	public function get_event_users( $req ) {
		global $wpdb;
		$event_id = intval($req->get_param('event_id'));

		// Get WordPress users from current site only (multisite-aware)
		$user_args = array();
		if ( is_multisite() ) {
			$user_args['blog_id'] = get_current_blog_id();
		}
		$wp_users = get_users($user_args);
		$filtered = array();

		foreach ($wp_users as $wp_user) {
			// Skip admin users
			if (in_array('administrator', (array) $wp_user->roles, true)) {
				continue;
			}

			// Get all event roles for this user and event
			$roles = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT role FROM {$this->event_user_roles_tbl} WHERE user_id = %d AND event_id = %d",
					$wp_user->ID,
					$event_id
				),
				ARRAY_A
			);

			// Extract role values into an array
			$role_array = array_column($roles, 'role');

			// If no roles assigned, default to viewer
			if (empty($role_array)) {
				$role_array = array( 'viewer' );
			}

			$user_data = array(
				'user_id'      => $wp_user->ID,
				'email'        => $wp_user->user_email,
				'display_name' => $wp_user->display_name,
				'username'     => $wp_user->user_login,
				'status'       => 1, // Always active for SimplyConf users
				'created'      => $wp_user->user_registered,
				'modified'     => $wp_user->user_registered, // Use WordPress user registration date
				'roles'        => $role_array, // Array of roles
				'role'         => $role_array[0], // Primary role for backward compatibility
				'is_wp_admin'  => 0,
			);

			// Fetch custom fields for each user
			$user_data['custom_fields'] = SimplyConf_Helpers::get_entity_custom_fields($wp_user->ID, 'user');

			$filtered[] = $user_data;
		}

		return rest_ensure_response($filtered);
	}

	public function set_event_user_role( $req ) {
		global $wpdb;
		$payload  = $req->get_json_params();
		$event_id = intval($payload['event_id']);
		$user_id  = intval($payload['user_id']);
		$role     = sanitize_text_field($payload['role']);
		// Remove admin from allowed roles (enforced at UI and here)
		$allowed_roles = array( 'track_chair', 'reviewer', 'author', 'viewer' );
		if ( ! in_array($role, $allowed_roles, true)) {
			return new WP_Error('invalid_role', 'Role not allowed', array( 'status' => 400 ));
		}
		// Upsert role
		$existing = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->event_user_roles_tbl} WHERE event_id = %d AND user_id = %d",
				$event_id,
				$user_id
			)
		);
		if ($existing) {
			$wpdb->update(
				$this->event_user_roles_tbl,
				array( 'role' => $role ),
				array( 'event_id' => $event_id, 'user_id' => $user_id )
			);
		} else {
			$wpdb->insert(
				$this->event_user_roles_tbl,
				array( 'event_id' => $event_id, 'user_id' => $user_id, 'role' => $role )
			);
		}
		return rest_ensure_response(array( 'event_id' => $event_id, 'user_id' => $user_id, 'role' => $role ));
	}

	public function set_event_user_roles( $req ) {
		global $wpdb;
		$payload  = $req->get_json_params();
		$event_id = intval($payload['event_id']);
		$user_id  = intval($payload['user_id']);

		// Handle both single role (legacy) and multiple roles
		$roles = array();
		if (isset($payload['roles']) && is_array($payload['roles'])) {
			$roles = $payload['roles'];
		} elseif (isset($payload['role'])) {
			$roles = array( sanitize_text_field($payload['role']) );
		} else {
			$roles = array( 'viewer' ); // Default role
		}

		// Remove admin from allowed roles (enforced at UI and here)
		$allowed_roles = array( 'track_chair', 'reviewer', 'author', 'viewer' );
		$valid_roles   = array_intersect($roles, $allowed_roles);

		if (empty($valid_roles)) {
			return new WP_Error('invalid_roles', 'No valid roles provided', array( 'status' => 400 ));
		}

		// Remove existing roles for this user and event
		$wpdb->delete(
			$this->event_user_roles_tbl,
			array( 'event_id' => $event_id, 'user_id' => $user_id ),
			array( '%d', '%d' )
		);

		// Insert new roles
		foreach ($valid_roles as $role) {
			$wpdb->insert(
				$this->event_user_roles_tbl,
				array(
					'event_id' => $event_id,
					'user_id'  => $user_id,
					'role'     => sanitize_text_field($role),
				),
				array( '%d', '%d', '%s' )
			);
		}

		return rest_ensure_response(
			array(
				'event_id' => $event_id,
				'user_id'  => $user_id,
				'roles'    => $valid_roles,
			)
		);
	}
}
new SimplyConf_Users_Routes();
