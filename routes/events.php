<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * This file will create Custom Rest API End Points for Event CRUD.
 */
class SimplyConf_Event_Routes {

	public $events_tbl;
	public $abstracts_tbl;
	public $reviews_tbl;
	public $settings_tbl;
	public function __construct() {
		global $wpdb;
		$this->events_tbl    = SimplyConf_DB::get_table('events');
		$this->abstracts_tbl = SimplyConf_DB::get_table('abstracts');
		$this->reviews_tbl   = SimplyConf_DB::get_table('reviews');
		$this->settings_tbl  = SimplyConf_DB::get_table('settings');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		register_rest_route(
			'simplyconf/v1',
			'/events',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_events' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/events/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_event' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/events',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_event' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/events/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_event' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/events/default/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'set_default_event' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/events/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_event' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/events/(?P<id>\d+)/status',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_event_status' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);
	}

	public function get_permission( $request ) {
		$is_authenticated = is_user_logged_in();
		return apply_filters('simplyconf_permission_check', $is_authenticated, 'events');
	}

	public function admin_permission( $request ) {
		return current_user_can('manage_options');
	}

	public function get_events( $req ) {
		global $wpdb;

		// Get events with submission counts
		$events = $wpdb->get_results(
			"
            SELECT e.*, 
                   COALESCE(a.submission_count, 0) as submission_count
            FROM {$this->events_tbl} e
            LEFT JOIN (
                SELECT event_id, COUNT(*) as submission_count 
                FROM {$this->abstracts_tbl} 
                GROUP BY event_id
            ) a ON e.event_id = a.event_id
            ORDER BY e.event_id DESC
        "
		);

		return rest_ensure_response($events);
	}

	public function get_event( $req ) {
		global $wpdb;
		$payload = $req->get_json_params();
		$id      = intval($req->get_param('id'));

		// Get event with submission count
		$event = $wpdb->get_row(
			$wpdb->prepare(
				"
            SELECT e.*, 
                   COALESCE(a.submission_count, 0) as submission_count
            FROM {$this->events_tbl} e
            LEFT JOIN (
                SELECT event_id, COUNT(*) as submission_count 
                FROM {$this->abstracts_tbl} 
                WHERE event_id = %d
                GROUP BY event_id
            ) a ON e.event_id = a.event_id
            WHERE e.event_id = %d
        ",
				$id,
				$id
			)
		);

		if ( ! $event) {
			return new WP_Error('invalid_event_id', 'Could not locate event id', array( 'status' => 404 ));
		}
		return rest_ensure_response($event);
	}

	public function get_default_event() {
		global $wpdb;
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from internal constant; no user input.
		$event = $wpdb->get_row("SELECT * FROM {$this->events_tbl} WHERE `default` = 1");
		return $event;
	}

	public function set_default_event( $req ) {
		global $wpdb;
		$event_id = intval($req->get_param('id'));

		// Set the current default event to non-default (0)
		$wpdb->update(
			$this->events_tbl,
			array( 'default' => 0 ), // Set default to 0
			array( 'default' => 1 ), // Where the current default event is
			array( '%d' ),
			array( '%d' )
		);

		// Set the new event to default (1)
		$wpdb->update(
			$this->events_tbl,
			array( 'default' => 1 ), // Set new event to default
			array( 'event_id' => $event_id ), // Find the new default event by ID
			array( '%d' ),
			array( '%d' )
		);
	}


	public function create_event( $req ) {
		global $wpdb;
		$payload = $req->get_json_params();

		// Use centralized event creation function
		$event_id = simplyconf_create_event($payload);

		if (is_wp_error($event_id)) {
			return $event_id;
		}

		// Return the created event
		$event    = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->events_tbl} WHERE event_id = %d", $event_id));
		$response = rest_ensure_response($event);
		$response->set_status(201);
		return $response;
	}

	public function update_event( $req ) {
		global $wpdb;
		$payload = $req->get_json_params();
		$id      = intval($req->get_param('id'));

		$event_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->events_tbl} WHERE event_id = %d", $id));
		if ( ! $event_count) {
			return new WP_Error('invalid_event_id', 'Could not locate event id', array( 'status' => 404 ));
		}

		// Allowlist of columns that callers may update
		$allowed_fields = array(
			'name', 'initials', 'description', 'address', 'city', 'country',
			'start_date', 'end_date', 'submission_start', 'submission_end',
			'website', 'contact_email', 'status', 'default', 'timezone',
			'max_submissions', 'allow_multiple_submissions',
		);

		$data = array();
		foreach ($allowed_fields as $field) {
			if (array_key_exists($field, $payload)) {
				$data[ $field ] = sanitize_text_field($payload[ $field ]);
			}
		}

		$data = apply_filters('simplyconf_create_event', $data);
		$data['modified'] = current_time('mysql');

		$wpdb->update($this->events_tbl, $data, array( 'event_id' => $id ));
		$event = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->events_tbl} WHERE event_id = %d", $id));
		return rest_ensure_response($event);
	}

	public function update_event_status( $req ) {
		global $wpdb;
		$payload = $req->get_json_params();
		$id      = intval($req->get_param('id'));

		// Validate event exists
		$event_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->events_tbl} WHERE event_id = %d", $id));
		if ( ! $event_count) {
			return new WP_Error('invalid_event_id', 'Could not locate event id', array( 'status' => 404 ));
		}

		// Validate status value - convert string to tinyint
		$status = isset($payload['status']) ? $payload['status'] : '';
		if ($status === 'active') {
			$status_value = 1;
		} elseif ($status === 'archived') {
			$status_value = 0;
		} else {
			return new WP_Error('invalid_status', 'Status must be either "active" or "archived"', array( 'status' => 400 ));
		}

		// Update event status
		$data = array(
			'status'   => $status_value,
			'modified' => current_time('mysql'),
		);

		$updated = $wpdb->update($this->events_tbl, $data, array( 'event_id' => $id ));

		if ($updated === false) {
			return new WP_Error('update_failed', 'Failed to update event status', array( 'status' => 500 ));
		}

		// Return updated event
		$event = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->events_tbl} WHERE event_id = %d", $id));
		return rest_ensure_response($event);
	}

	public function delete_event( $req ) {
		global $wpdb;
		// ensure at least one event is available
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from internal constant; no user input.
		$count = $wpdb->get_var("SELECT COUNT(*) FROM {$this->events_tbl}");
		if ($count == 1) {
			return new WP_Error('invalid_event_action', 'You need at last one event for the system to work', array( 'status' => 400 ));
		}
		$id    = intval($req->get_param('id'));
		$found = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->events_tbl} WHERE event_id = %d", $id));
		if ( ! $found) {
			return new WP_Error('invalid_event_id', 'Could not locate event id', array( 'status' => 404 ));
		}

		// Remember whether this was the default event before deleting anything
		$was_default = (bool) $wpdb->get_var(
			$wpdb->prepare("SELECT `default` FROM {$this->events_tbl} WHERE event_id = %d", $id)
		);

		// Let addons clean up their own data first
		do_action('simplyconf_before_delete_event', $id);

		$fmt = array( '%d' );

		// --- Collect WP attachment IDs before deleting DB rows ---
		$attachments_tbl = SimplyConf_DB::get_table('attachments');
		$file_logs_tbl   = SimplyConf_DB::get_table('file_logs');

		$sc_attachments = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT attachment_id, wp_attachment_id FROM $attachments_tbl WHERE event_id = %d",
				$id
			)
		);

		// --- File logs (must run before attachments row delete) ---
		if ( ! empty($sc_attachments)) {
			$sc_ids = implode(',', array_map(function ( $r ) { return (int) $r->attachment_id; }, $sc_attachments));
			$wpdb->query("DELETE FROM $file_logs_tbl WHERE attachment_id IN ($sc_ids)");
		}

		// --- Abstract junction tables (must run before abstracts are deleted) ---
		$abstract_ids = $wpdb->get_col(
			$wpdb->prepare("SELECT abstract_id FROM {$this->abstracts_tbl} WHERE event_id = %d", $id)
		);
		if ( ! empty($abstract_ids)) {
			$abstract_authors_tbl = SimplyConf_DB::get_table('abstract_authors');
			$custom_values_tbl    = SimplyConf_DB::get_table('custom_values');
			$ids_str              = implode(',', array_map('intval', $abstract_ids));
			$wpdb->query("DELETE FROM $abstract_authors_tbl WHERE abstract_id IN ($ids_str)");
			$wpdb->query("DELETE FROM $custom_values_tbl WHERE entity_type = 'abstract' AND entity_id IN ($ids_str)");
		}

		// --- All event-scoped table cleanup (DB only, no WP API calls) ---
		$wpdb->delete($attachments_tbl, array( 'event_id' => $id ), $fmt);
		$abstracts     = $wpdb->delete($this->abstracts_tbl, array( 'event_id' => $id ), $fmt);
		$settings      = $wpdb->delete($this->settings_tbl, array( 'event_id' => $id ), $fmt);
		$custom_fields = $wpdb->delete(SimplyConf_DB::get_table('custom_fields'), array( 'event_id' => $id ), $fmt);
		$wpdb->delete(SimplyConf_DB::get_table('statuses'), array( 'event_id' => $id ), $fmt);
		$wpdb->delete(SimplyConf_DB::get_table('tracks'), array( 'event_id' => $id ), $fmt);
		$wpdb->delete(SimplyConf_DB::get_table('sessions'), array( 'event_id' => $id ), $fmt);
		$wpdb->delete(SimplyConf_DB::get_table('track_assignments'), array( 'event_id' => $id ), $fmt);
		$wpdb->delete(SimplyConf_DB::get_table('event_user_roles'), array( 'event_id' => $id ), $fmt);
		$wpdb->delete(SimplyConf_DB::get_table('user_preferences'), array( 'event_id' => $id ), $fmt);

		// --- Event row ---
		$wpdb->delete($this->events_tbl, array( 'event_id' => $id ), $fmt);

		// --- WP media file deletion (runs AFTER all DB cleanup so a failure
		//     here cannot leave orphaned rows in SimplyConf tables) ---
		if ( ! empty($sc_attachments)) {
			foreach ($sc_attachments as $att) {
				wp_delete_attachment((int) $att->wp_attachment_id, true);
			}
		}

		// --- Re-assign default if needed ---
		if ($was_default) {
			$next_id = $wpdb->get_var(
				"SELECT event_id FROM {$this->events_tbl} ORDER BY event_id DESC LIMIT 1"
			);
			if ($next_id) {
				$wpdb->update($this->events_tbl, array( 'default' => 1 ), array( 'event_id' => (int) $next_id ));
			}
		}

		$results                = new stdClass();
		$results->id            = $id;
		$results->abstracts     = $abstracts;
		$results->settings      = $settings;
		$results->custom_fields = $custom_fields;

		return rest_ensure_response($results);
	}

	/**
	 * Initialize default statuses for a new event
	 */
	public function initialize_event_statuses( $event_id ) {
		// Use the SimplyConf_Status_Routes class to initialize statuses
		if (class_exists('SimplyConf_Status_Routes')) {
			$status_handler = new SimplyConf_Status_Routes();

			// Initialize abstract statuses
			$status_handler->initialize_default_statuses_internal($event_id, 'abstract');

			// Initialize review statuses
			$status_handler->initialize_default_statuses_internal($event_id, 'review');
		} else {
			// Fallback: directly initialize statuses if class not available
			$this->initialize_statuses_fallback($event_id);
		}
	}

	/**
	 * Fallback method to initialize statuses if Status_Routes class is not available
	 */
	public function initialize_statuses_fallback( $event_id ) {
		global $wpdb;
		$statuses_tbl = SimplyConf_DB::get_table('statuses');

		$abstract_statuses = array(
			array( 'name' => 'draft', 'label' => 'Draft', 'description' => 'Abstract is being prepared', 'color' => '#6c757d', 'icon' => 'edit', 'is_initial' => 1, 'order_num' => 1 ),
			array( 'name' => 'submitted', 'label' => 'Submitted', 'description' => 'Abstract has been submitted for review', 'color' => '#007bff', 'icon' => 'send', 'is_default' => 1, 'order_num' => 2 ),
			array( 'name' => 'under_review', 'label' => 'Under Review', 'description' => 'Abstract is being reviewed', 'color' => '#ffc107', 'icon' => 'eye', 'order_num' => 3 ),
			array( 'name' => 'accepted', 'label' => 'Accepted', 'description' => 'Abstract has been accepted', 'color' => '#28a745', 'icon' => 'check', 'is_final' => 1, 'order_num' => 4 ),
			array( 'name' => 'rejected', 'label' => 'Rejected', 'description' => 'Abstract has been rejected', 'color' => '#dc3545', 'icon' => 'times', 'is_final' => 1, 'order_num' => 5 ),
			array( 'name' => 'revision_required', 'label' => 'Revision Required', 'description' => 'Abstract needs revisions', 'color' => '#fd7e14', 'icon' => 'edit', 'order_num' => 6 ),
		);

		$review_statuses = array(
			array( 'name' => 'pending', 'label' => 'Pending', 'description' => 'Review is pending', 'color' => '#6c757d', 'icon' => 'clock', 'is_initial' => 1, 'is_default' => 1, 'order_num' => 1 ),
			array( 'name' => 'in_progress', 'label' => 'In Progress', 'description' => 'Review is in progress', 'color' => '#007bff', 'icon' => 'edit', 'order_num' => 2 ),
			array( 'name' => 'completed', 'label' => 'Completed', 'description' => 'Review has been completed', 'color' => '#28a745', 'icon' => 'check', 'is_final' => 1, 'order_num' => 3 ),
			array( 'name' => 'declined', 'label' => 'Declined', 'description' => 'Reviewer declined to review', 'color' => '#dc3545', 'icon' => 'times', 'is_final' => 1, 'order_num' => 4 ),
		);

		foreach (array( $abstract_statuses, $review_statuses ) as $type_idx => $statuses) {
			$type = $type_idx === 0 ? 'abstract' : 'review';
			foreach ($statuses as $status_data) {
				$insert_data = array_merge(
					$status_data,
					array(
						'event_id' => $event_id,
						'type'     => $type,
						'created'  => current_time('mysql'),
					)
				);
				$wpdb->insert($statuses_tbl, $insert_data);
			}
		}
	}

	/**
	 * Seed default author custom fields for a new event
	 */
	public function seed_author_fields( $event_id ) {
		global $wpdb;
		$custom_fields_tbl = SimplyConf_DB::get_table('custom_fields');

		$default_fields = array(
			array( 'name' => 'affiliation', 'label' => 'Affiliation', 'type' => 'text', 'required' => 1, 'order_num' => 1, 'help_text' => 'Organization or institution' ),
			array( 'name' => 'orcid', 'label' => 'ORCID', 'type' => 'text', 'required' => 0, 'order_num' => 2, 'help_text' => 'ORCID iD (e.g., 0000-0002-1825-0097)' ),
			array( 'name' => 'department', 'label' => 'Department', 'type' => 'text', 'required' => 0, 'order_num' => 3, 'help_text' => 'Department or division' ),
			array( 'name' => 'country', 'label' => 'Country', 'type' => 'text', 'required' => 0, 'order_num' => 4, 'help_text' => 'Country of affiliation' ),

		);

		foreach ($default_fields as $field) {
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT field_id FROM $custom_fields_tbl WHERE event_id = %d AND name = %s AND `usage` = 'author'",
					$event_id,
					$field['name']
				)
			);

			if ( ! $exists) {
				$wpdb->insert(
					$custom_fields_tbl,
					array(
						'event_id'         => $event_id,
						'name'             => $field['name'],
						'label'            => $field['label'],
						'type'             => $field['type'],
						'usage'            => 'author',
						'required'         => $field['required'],
						'order_num'        => $field['order_num'],
						'help_text'        => $field['help_text'],
						'show_in_admin'    => 1,
						'show_in_frontend' => 1,
					),
					array( '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%d', '%d' )
				);
			}
		}
	}

	/**
	 * Seed default abstract custom fields for a new event
	 */
	public function seed_abstract_fields( $event_id ) {
		global $wpdb;
		$custom_fields_tbl = SimplyConf_DB::get_table('custom_fields');

		$default_fields = array(
			array( 'name' => 'keywords', 'label' => 'Keywords', 'type' => 'text', 'required' => 0, 'order_num' => 1, 'help_text' => 'Keywords or tags for the abstract (comma-separated)', 'options' => null ),
			array( 'name' => 'presentation_type', 'label' => 'Presentation Type', 'type' => 'select', 'required' => 1, 'order_num' => 2, 'help_text' => 'Type of presentation', 'options' => 'Oral,Poster,Workshop,Symposium' ),
			array( 'name' => 'funding_source', 'label' => 'Funding Source', 'type' => 'text', 'required' => 0, 'order_num' => 3, 'help_text' => 'Grant or funding information', 'options' => null ),
			array( 'name' => 'ethics_approval', 'label' => 'Ethics Approval', 'type' => 'radio', 'required' => 0, 'order_num' => 4, 'help_text' => 'Has this research received ethics approval?', 'options' => 'Yes,No,N/A' ),
		);

		foreach ($default_fields as $field) {
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT field_id FROM $custom_fields_tbl WHERE event_id = %d AND name = %s AND `usage` = 'abstract'",
					$event_id,
					$field['name']
				)
			);

			if ( ! $exists) {
				$wpdb->insert(
					$custom_fields_tbl,
					array(
						'event_id'         => $event_id,
						'name'             => $field['name'],
						'label'            => $field['label'],
						'type'             => $field['type'],
						'usage'            => 'abstract',
						'required'         => $field['required'],
						'order_num'        => $field['order_num'],
						'help_text'        => $field['help_text'],
						'options'          => $field['options'],
						'show_in_admin'    => 1,
						'show_in_frontend' => 1,
					),
					array( '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s', '%d', '%d' )
				);
			}
		}
	}

	/**
	 * Seed default review custom fields for a new event
	 */
	public function seed_review_fields( $event_id ) {
		global $wpdb;
		$custom_fields_tbl = SimplyConf_DB::get_table('custom_fields');

		$default_fields = array(
			array( 'name' => 'scientific_quality', 'label' => 'Scientific Quality', 'type' => 'rating', 'required' => 1, 'order_num' => 1, 'help_text' => 'Rate the scientific quality and rigor', 'options' => json_encode(array( 'max' => 5 )) ),
			array( 'name' => 'originality', 'label' => 'Originality', 'type' => 'rating', 'required' => 1, 'order_num' => 2, 'help_text' => 'Rate the originality and novelty', 'options' => json_encode(array( 'max' => 5 )) ),
			array( 'name' => 'clarity', 'label' => 'Clarity of Presentation', 'type' => 'rating', 'required' => 1, 'order_num' => 3, 'help_text' => 'Rate the clarity and organization', 'options' => json_encode(array( 'max' => 5 )) ),
			array( 'name' => 'relevance', 'label' => 'Relevance', 'type' => 'rating', 'required' => 1, 'order_num' => 4, 'help_text' => 'Rate the relevance to the conference theme', 'options' => json_encode(array( 'max' => 5 )) ),
			array( 'name' => 'strengths', 'label' => 'Strengths', 'type' => 'textarea', 'required' => 0, 'order_num' => 5, 'help_text' => 'What are the main strengths?', 'options' => null ),
			array( 'name' => 'weaknesses', 'label' => 'Weaknesses', 'type' => 'textarea', 'required' => 0, 'order_num' => 6, 'help_text' => 'What are the main weaknesses?', 'options' => null ),
			array( 'name' => 'comments', 'label' => 'Additional Comments', 'type' => 'textarea', 'required' => 0, 'order_num' => 7, 'help_text' => 'Any additional feedback for the organizers', 'options' => null ),
		);

		foreach ($default_fields as $field) {
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT field_id FROM $custom_fields_tbl WHERE event_id = %d AND name = %s AND `usage` = 'review'",
					$event_id,
					$field['name']
				)
			);

			if ( ! $exists) {
				$wpdb->insert(
					$custom_fields_tbl,
					array(
						'event_id'         => $event_id,
						'name'             => $field['name'],
						'label'            => $field['label'],
						'type'             => $field['type'],
						'usage'            => 'review',
						'required'         => $field['required'],
						'order_num'        => $field['order_num'],
						'help_text'        => $field['help_text'],
						'options'          => $field['options'],
						'show_in_admin'    => 1,
						'show_in_frontend' => 1,
					),
					array( '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s', '%d', '%d' )
				);
			}
		}
	}

	/**
	 * Seed default user custom fields for a new event
	 */
	public function seed_user_fields( $event_id ) {
		global $wpdb;
		$custom_fields_tbl = SimplyConf_DB::get_table('custom_fields');

		$default_fields = array(
			array( 'name' => 'institution', 'label' => 'Institution', 'type' => 'text', 'required' => 0, 'order_num' => 1, 'help_text' => 'Your current institution or organization' ),
			array( 'name' => 'job_title', 'label' => 'Job Title', 'type' => 'text', 'required' => 0, 'order_num' => 2, 'help_text' => 'Your current position or title' ),
			array( 'name' => 'phone', 'label' => 'Phone Number', 'type' => 'text', 'required' => 0, 'order_num' => 3, 'help_text' => 'Contact phone number' ),
			array( 'name' => 'bio', 'label' => 'Biography', 'type' => 'textarea', 'required' => 0, 'order_num' => 4, 'help_text' => 'A brief professional biography' ),
			array( 'name' => 'dietary_requirements', 'label' => 'Dietary Requirements', 'type' => 'textarea', 'required' => 0, 'order_num' => 5, 'help_text' => 'Any dietary restrictions or preferences' ),
		);

		foreach ($default_fields as $field) {
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT field_id FROM $custom_fields_tbl WHERE event_id = %d AND name = %s AND `usage` = 'user'",
					$event_id,
					$field['name']
				)
			);

			if ( ! $exists) {
				$wpdb->insert(
					$custom_fields_tbl,
					array(
						'event_id'         => $event_id,
						'name'             => $field['name'],
						'label'            => $field['label'],
						'type'             => $field['type'],
						'usage'            => 'user',
						'required'         => $field['required'],
						'order_num'        => $field['order_num'],
						'help_text'        => $field['help_text'],
						'show_in_admin'    => 1,
						'show_in_frontend' => 1,
					),
					array( '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%d', '%d' )
				);
			}
		}
	}

	/**
	 * Seed default track and session for a new event
	 */
	public function seed_default_track( $event_id ) {
		global $wpdb;
		$tracks_tbl   = SimplyConf_DB::get_table('tracks');
		$sessions_tbl = SimplyConf_DB::get_table('sessions');

		// Check if track already exists
		$track_exists = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT track_id FROM $tracks_tbl WHERE event_id = %d LIMIT 1",
				$event_id
			)
		);

		if ( ! $track_exists) {
			// Create default track
			$wpdb->insert(
				$tracks_tbl,
				array(
					'event_id'    => $event_id,
					'name'        => 'General Track',
					'description' => 'Default track for all submissions',
					'order'       => 1,
					'created'     => current_time('mysql'),
					'modified'    => current_time('mysql'),
				),
				array( '%d', '%s', '%s', '%d', '%s', '%s' )
			);

			$track_id = $wpdb->insert_id;

			// Create default session for the track
			if ($track_id) {
				$wpdb->insert(
					$sessions_tbl,
					array(
						'event_id'    => $event_id,
						'track_id'    => $track_id,
						'name'        => 'General Session',
						'description' => 'Default session for presentations',
						'location'    => 'TBD',
						'order'       => 1,
						'created'     => current_time('mysql'),
						'modified'    => current_time('mysql'),
					),
					array( '%d', '%d', '%s', '%s', '%s', '%d', '%s', '%s' )
				);
			}
		}
	}
}
new SimplyConf_Event_Routes();
