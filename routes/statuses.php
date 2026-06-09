<?php
defined('ABSPATH') or die('ERROR: You do not have permission to access this page');

/**
 * Status Routes
 * Handles dynamic status management for abstracts and reviews
 */

class SimplyConf_Status_Routes {


	public $statuses_tbl;

	public function __construct() {
		global $wpdb;
		$this->statuses_tbl = SimplyConf_DB::get_table('statuses');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		// Get statuses for an event
		register_rest_route(
			'simplyconf/v1',
			'/statuses',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_statuses' ),
				'permission_callback' => array( $this, 'get_permission' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric($param);
						},
					),
					'type'     => array(
						'default'           => 'abstract',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		// Get a specific status by ID
		register_rest_route(
			'simplyconf/v1',
			'/statuses/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_status' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

		// Get status by name
		register_rest_route(
			'simplyconf/v1',
			'/statuses/by-name',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_status_by_name' ),
				'permission_callback' => array( $this, 'get_permission' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric($param);
						},
					),
					'type'     => array(
						'default'           => 'abstract',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'name'     => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		// Get default status
		register_rest_route(
			'simplyconf/v1',
			'/statuses/default',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_default_status' ),
				'permission_callback' => array( $this, 'get_permission' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric($param);
						},
					),
					'type'     => array(
						'default'           => 'abstract',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		// Get initial status
		register_rest_route(
			'simplyconf/v1',
			'/statuses/initial',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_initial_status' ),
				'permission_callback' => array( $this, 'get_permission' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric($param);
						},
					),
					'type'     => array(
						'default'           => 'abstract',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		// Create a new status
		register_rest_route(
			'simplyconf/v1',
			'/statuses',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_status' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);

		// Initialize default statuses for an event
		register_rest_route(
			'simplyconf/v1',
			'/statuses/initialize',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'initialize_default_statuses' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);

		// Update a status
		register_rest_route(
			'simplyconf/v1',
			'/statuses/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_status' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);

		// Delete a status
		register_rest_route(
			'simplyconf/v1',
			'/statuses/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_status' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
	}

	// Statuses (names, labels, colors) are intentionally public so the
	// frontend schedule/registration pages can display them without auth.
	public function get_permission( $request ) {
		return true;
	}

	public function admin_permission() {
		return current_user_can('manage_options');
	}

	public function get_statuses( $request ) {
		global $wpdb;

		$event_id = $request->get_param('event_id');
		$type     = $request->get_param('type');

		$statuses = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$this->statuses_tbl} 
             WHERE event_id = %d AND type = %s 
             ORDER BY order_num ASC, name ASC",
				$event_id,
				$type
			),
			ARRAY_A
		);

		return rest_ensure_response($statuses);
	}

	public function get_status( $request ) {
		global $wpdb;

		$status_id = $request->get_param('id');

		$status = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->statuses_tbl} WHERE status_id = %d",
				$status_id
			),
			ARRAY_A
		);

		if ( ! $status) {
			return new WP_Error('invalid_status_id', 'Status not found', array( 'status' => 404 ));
		}

		return rest_ensure_response($status);
	}

	public function get_status_by_name( $request ) {
		global $wpdb;

		$event_id = $request->get_param('event_id');
		$type     = $request->get_param('type');
		$name     = $request->get_param('name');

		$status = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->statuses_tbl} 
             WHERE event_id = %d AND type = %s AND name = %s",
				$event_id,
				$type,
				$name
			),
			ARRAY_A
		);

		if ( ! $status) {
			return new WP_Error('status_not_found', 'Status not found', array( 'status' => 404 ));
		}

		return rest_ensure_response($status);
	}

	public function get_default_status( $request ) {
		global $wpdb;

		$event_id = $request->get_param('event_id');
		$type     = $request->get_param('type');

		$status = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->statuses_tbl} 
             WHERE event_id = %d AND type = %s AND is_default = 1",
				$event_id,
				$type
			),
			ARRAY_A
		);

		if ( ! $status) {
			// If no default, get the first one ordered
			$status = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$this->statuses_tbl} 
                 WHERE event_id = %d AND type = %s 
                 ORDER BY order_num ASC, name ASC 
                 LIMIT 1",
					$event_id,
					$type
				),
				ARRAY_A
			);
		}

		if ( ! $status) {
			return new WP_Error('no_status_found', 'No status found for this event', array( 'status' => 404 ));
		}

		return rest_ensure_response($status);
	}

	public function get_initial_status( $request ) {
		global $wpdb;

		$event_id = $request->get_param('event_id');
		$type     = $request->get_param('type');

		$status = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->statuses_tbl} 
             WHERE event_id = %d AND type = %s AND is_initial = 1",
				$event_id,
				$type
			),
			ARRAY_A
		);

		if ( ! $status) {
			// If no initial status marked, use the first one
			$status = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$this->statuses_tbl} 
                 WHERE event_id = %d AND type = %s 
                 ORDER BY order_num ASC, name ASC 
                 LIMIT 1",
					$event_id,
					$type
				),
				ARRAY_A
			);
		}

		if ( ! $status) {
			return new WP_Error('no_status_found', 'No status found for this event', array( 'status' => 404 ));
		}

		return rest_ensure_response($status);
	}

	public function create_status( $request ) {
		global $wpdb;

		$data = $request->get_json_params();

		$required_fields = array( 'event_id', 'type', 'name', 'label' );
		foreach ($required_fields as $field) {
			if (empty($data[ $field ])) {
				return new WP_Error('missing_field', "$field is required", array( 'status' => 400 ));
			}
		}

		// Check if status name already exists for this event/type
		$existing = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT status_id FROM {$this->statuses_tbl} 
             WHERE event_id = %d AND type = %s AND name = %s",
				$data['event_id'],
				$data['type'],
				$data['name']
			)
		);

		if ($existing) {
			return new WP_Error('duplicate_status', 'Status name already exists for this event', array( 'status' => 400 ));
		}

		$insert_data = array(
			'event_id'       => intval($data['event_id']),
			'type'           => sanitize_text_field($data['type']),
			'name'           => sanitize_text_field($data['name']),
			'label'          => sanitize_text_field($data['label']),
			'description'    => isset($data['description']) ? sanitize_textarea_field($data['description']) : null,
			'color'          => isset($data['color']) ? sanitize_hex_color($data['color']) : '#666666',
			'icon'           => isset($data['icon']) ? sanitize_text_field($data['icon']) : null,
			'is_default'     => isset($data['is_default']) ? intval($data['is_default']) : 0,
			'is_initial'     => isset($data['is_initial']) ? intval($data['is_initial']) : 0,
			'is_final'       => isset($data['is_final']) ? intval($data['is_final']) : 0,
			'order_num'      => isset($data['order_num']) ? intval($data['order_num']) : 0,
			'workflow_rules' => isset($data['workflow_rules']) ? wp_json_encode($data['workflow_rules']) : null,
			'permissions'    => isset($data['permissions']) ? wp_json_encode($data['permissions']) : null,
			'created'        => current_time('mysql'),
		);

		$result = $wpdb->insert($this->statuses_tbl, $insert_data);

		if ($result === false) {
			return new WP_Error('create_failed', 'Failed to create status', array( 'status' => 500 ));
		}

		$status_id = $wpdb->insert_id;
		$status    = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->statuses_tbl} WHERE status_id = %d",
				$status_id
			),
			ARRAY_A
		);

		$response = rest_ensure_response($status);
		$response->set_status(201);
		return $response;
	}

	public function initialize_default_statuses( $request ) {
		$data = $request->get_json_params();

		$event_id = isset($data['event_id']) ? intval($data['event_id']) : 0;
		$type     = isset($data['type']) ? sanitize_text_field($data['type']) : 'abstract';

		if ( ! $event_id) {
			return new WP_Error('missing_event_id', 'Event ID is required', array( 'status' => 400 ));
		}

		$statuses = $this->initialize_default_statuses_internal($event_id, $type);
		return rest_ensure_response($statuses);
	}

	public function initialize_default_statuses_internal( $event_id, $type = 'abstract' ) {
		global $wpdb;

		if ($type === 'abstract') {
			$default_statuses = array(
				array(
					'name'        => 'draft',
					'label'       => 'Draft',
					'description' => 'Abstract is being prepared',
					'color'       => '#6c757d',
					'icon'        => 'edit',
					'is_initial'  => 1,
					'order_num'   => 1,
				),
				array(
					'name'        => 'submitted',
					'label'       => 'Submitted',
					'description' => 'Abstract has been submitted for review',
					'color'       => '#007bff',
					'icon'        => 'send',
					'is_default'  => 1,
					'order_num'   => 2,
				),
				array(
					'name'        => 'under_review',
					'label'       => 'Under Review',
					'description' => 'Abstract is being reviewed',
					'color'       => '#ffc107',
					'icon'        => 'eye',
					'order_num'   => 3,
				),
				array(
					'name'        => 'accepted',
					'label'       => 'Accepted',
					'description' => 'Abstract has been accepted',
					'color'       => '#28a745',
					'icon'        => 'check',
					'is_final'    => 1,
					'order_num'   => 4,
				),
				array(
					'name'        => 'rejected',
					'label'       => 'Rejected',
					'description' => 'Abstract has been rejected',
					'color'       => '#dc3545',
					'icon'        => 'times',
					'is_final'    => 1,
					'order_num'   => 5,
				),
				array(
					'name'        => 'revision_required',
					'label'       => 'Revision Required',
					'description' => 'Abstract needs revisions',
					'color'       => '#fd7e14',
					'icon'        => 'edit',
					'order_num'   => 6,
				),
			);
		} else { // review
			$default_statuses = array(
				array(
					'name'        => 'pending',
					'label'       => 'Pending',
					'description' => 'Review is pending',
					'color'       => '#6c757d',
					'icon'        => 'clock',
					'is_initial'  => 1,
					'is_default'  => 1,
					'order_num'   => 1,
				),
				array(
					'name'        => 'in_progress',
					'label'       => 'In Progress',
					'description' => 'Review is in progress',
					'color'       => '#007bff',
					'icon'        => 'edit',
					'order_num'   => 2,
				),
				array(
					'name'        => 'completed',
					'label'       => 'Completed',
					'description' => 'Review has been completed',
					'color'       => '#28a745',
					'icon'        => 'check',
					'is_final'    => 1,
					'order_num'   => 3,
				),
				array(
					'name'        => 'declined',
					'label'       => 'Declined',
					'description' => 'Reviewer declined to review',
					'color'       => '#dc3545',
					'icon'        => 'times',
					'is_final'    => 1,
					'order_num'   => 4,
				),
			);
		}

		$created_statuses = array();

		foreach ($default_statuses as $status_data) {
			$insert_data = array_merge(
				$status_data,
				array(
					'event_id' => $event_id,
					'type'     => $type,
					'created'  => current_time('mysql'),
				)
			);

			$result = $wpdb->insert($this->statuses_tbl, $insert_data);

			if ($result !== false) {
				$status_id          = $wpdb->insert_id;
				$created_statuses[] = $wpdb->get_row(
					$wpdb->prepare(
						"SELECT * FROM {$this->statuses_tbl} WHERE status_id = %d",
						$status_id
					),
					ARRAY_A
				);
			}
		}

		return $created_statuses;
	}

	public function update_status( $request ) {
		global $wpdb;

		$status_id = $request->get_param('id');
		$data      = $request->get_json_params();

		if ( ! $status_id) {
			return new WP_Error('missing_status_id', 'Status ID is required', array( 'status' => 400 ));
		}

		// Check if status exists
		$existing_status = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->statuses_tbl} WHERE status_id = %d",
				$status_id
			),
			ARRAY_A
		);

		if ( ! $existing_status) {
			return new WP_Error('status_not_found', 'Status not found', array( 'status' => 404 ));
		}

		// Prepare update data - only update fields that are provided
		$update_data    = array();
		$allowed_fields = array(
			'name',
			'label',
			'description',
			'color',
			'icon',
			'is_default',
			'is_initial',
			'is_final',
			'order_num',
			'workflow_rules',
			'permissions',
		);

		foreach ($allowed_fields as $field) {
			if (isset($data[ $field ])) {
				switch ($field) {
					case 'name':
					case 'label':
					case 'icon':
						$update_data[ $field ] = sanitize_text_field($data[ $field ]);
						break;
					case 'description':
						$update_data[ $field ] = sanitize_textarea_field($data[ $field ]);
						break;
					case 'color':
						$update_data[ $field ] = sanitize_hex_color($data[ $field ]) ?: '#666666';
						break;
					case 'is_default':
					case 'is_initial':
					case 'is_final':
					case 'order_num':
						$update_data[ $field ] = intval($data[ $field ]);
						break;
					case 'workflow_rules':
					case 'permissions':
						$update_data[ $field ] = is_array($data[ $field ]) ? wp_json_encode($data[ $field ]) : $data[ $field ];
						break;
				}
			}
		}

		// If no valid update data provided
		if (empty($update_data)) {
			return new WP_Error('no_update_data', 'No valid data provided for update', array( 'status' => 400 ));
		}

		// Check for duplicate status name if name is being updated
		if (isset($update_data['name']) && $update_data['name'] !== $existing_status['name']) {
			$duplicate_check = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT status_id FROM {$this->statuses_tbl} 
                 WHERE event_id = %d AND type = %s AND name = %s AND status_id != %d",
					$existing_status['event_id'],
					$existing_status['type'],
					$update_data['name'],
					$status_id
				)
			);

			if ($duplicate_check) {
				return new WP_Error('duplicate_status_name', 'Status name already exists for this event', array( 'status' => 400 ));
			}
		}

		// Handle special logic for is_default and is_initial flags
		if (isset($update_data['is_default']) && $update_data['is_default'] == 1) {
			// Remove default flag from other statuses of the same type for this event
			$wpdb->update(
				$this->statuses_tbl,
				array( 'is_default' => 0 ),
				array(
					'event_id' => $existing_status['event_id'],
					'type'     => $existing_status['type'],
				)
			);
		}

		if (isset($update_data['is_initial']) && $update_data['is_initial'] == 1) {
			// Remove initial flag from other statuses of the same type for this event
			$wpdb->update(
				$this->statuses_tbl,
				array( 'is_initial' => 0 ),
				array(
					'event_id' => $existing_status['event_id'],
					'type'     => $existing_status['type'],
				)
			);
		}

		// Add updated timestamp
		$update_data['modified'] = current_time('mysql');

		// Perform the update
		$result = $wpdb->update(
			$this->statuses_tbl,
			$update_data,
			array( 'status_id' => $status_id )
		);

		if ($result === false) {
			return new WP_Error('update_failed', 'Failed to update status', array( 'status' => 500 ));
		}

		// Fetch and return the updated status
		$updated_status = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->statuses_tbl} WHERE status_id = %d",
				$status_id
			),
			ARRAY_A
		);

		return rest_ensure_response($updated_status);
	}

	public function delete_status( $request ) {
		global $wpdb;

		$status_id = $request->get_param('id');

		if ( ! $status_id) {
			return new WP_Error('missing_status_id', 'Status ID is required', array( 'status' => 400 ));
		}

		// Check if status exists
		$existing_status = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->statuses_tbl} WHERE status_id = %d",
				$status_id
			),
			ARRAY_A
		);

		if ( ! $existing_status) {
			return new WP_Error('status_not_found', 'Status not found', array( 'status' => 404 ));
		}

		// Check if status is being used by any abstracts or reviews
		global $wpdb;
		$abstracts_table = SimplyConf_DB::get_table('abstracts');
		$reviews_table   = SimplyConf_DB::get_table('reviews');

		$usage_count = 0;

		// Check abstracts usage
		if ($existing_status['type'] === 'abstract') {
			$usage_count += $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$abstracts_table} WHERE status = %d",
					$status_id
				)
			);
		}

		// Check reviews usage (if reviews table exists)
		if ($existing_status['type'] === 'review') {
			$table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$reviews_table}'");
			if ($table_exists) {
				$usage_count += $wpdb->get_var(
					$wpdb->prepare(
						"SELECT COUNT(*) FROM {$reviews_table} WHERE status = %d",
						$status_id
					)
				);
			}
		}

		if ($usage_count > 0) {
			return new WP_Error(
				'status_in_use',
				"Cannot delete status: it is currently being used by {$usage_count} record(s)",
				array( 'status' => 400 )
			);
		}

		// Delete the status
		$result = $wpdb->delete(
			$this->statuses_tbl,
			array( 'status_id' => $status_id )
		);

		if ($result === false) {
			return new WP_Error('delete_failed', 'Failed to delete status', array( 'status' => 500 ));
		}

		return rest_ensure_response(
			array(
				'deleted'   => true,
				'status_id' => $status_id,
				'message'   => 'Status deleted successfully',
			)
		);
	}

	// Helper functions for backward compatibility with older code
	public static function get_status_id_by_name( $event_id, $type, $name ) {
		global $wpdb;

		$statuses_tbl = SimplyConf_DB::get_table('statuses');

		$status_id = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT status_id FROM $statuses_tbl 
             WHERE event_id = %d AND type = %s AND name = %s",
				$event_id,
				$type,
				$name
			)
		);

		return $status_id ? intval($status_id) : null;
	}

	public static function get_status_name_by_id( $status_id ) {
		global $wpdb;

		$statuses_tbl = SimplyConf_DB::get_table('statuses');

		$name = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT name FROM $statuses_tbl WHERE status_id = %d",
				$status_id
			)
		);

		return $name;
	}
}

new SimplyConf_Status_Routes();
