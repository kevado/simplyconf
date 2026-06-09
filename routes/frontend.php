<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Custom REST API Endpoints for Frontend User Dashboard (Authors, Reviewers, Track Chairs)
 */
class SimplyConf_Frontend_Routes {

	public $abstracts_tbl;
	public $reviews_tbl;
	public $tracks_tbl;
	public $sessions_tbl;
	public $users_tbl;
	public $events_tbl;
	public function __construct() {
		global $wpdb;
		$this->abstracts_tbl = SimplyConf_DB::get_table('abstracts');
		$this->reviews_tbl   = SimplyConf_DB::get_table('reviews');
		$this->tracks_tbl    = SimplyConf_DB::get_table('tracks');
		$this->sessions_tbl  = SimplyConf_DB::get_table('sessions');
		$this->users_tbl = $wpdb->users;
		$this->events_tbl    = SimplyConf_DB::get_table('events');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	// Permission check for frontend users (must be logged in)
	// JWT authentication happens automatically via filter, just check if user is set
	/**
	 * Check if user has permission for frontend access
	 */
	public function get_permission( $request ) {
		$is_authenticated = is_user_logged_in();
		return apply_filters('simplyconf_permission_check', $is_authenticated, 'frontend');
	}

	//
	/**
	 * Check if user has a specific event role
	 * Check if user has a specific event role using simplyconf_event_user_roles table
	 */
	public function has_event_role( $role, $event_id = null ) {
		global $wpdb;
		$user = wp_get_current_user();
		if (in_array('administrator', $user->roles)) {
			return true;
		}
		if ( ! $event_id) {
			return false;
		}
		$tbl = SimplyConf_DB::get_table('event_user_roles');
		$row = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM ' . esc_sql($tbl) . ' WHERE user_id = %d AND event_id = %d AND role = %s',
				$user->ID,
				$event_id,
				$role
			)
		);
		return ! ! $row;
	}

	public function create_rest_routes() {
		// Profile: GET/PUT
		register_rest_route(
			'simplyconf/v1',
			'/frontend/profile',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_profile' ),
				'permission_callback' => array( $this, 'get_permission' ),
				'args'                => array(
					'event_id' => array(
						'required'          => false,
						'validate_callback' => function ( $param, $request, $key ) {
							return is_null($param) || is_numeric($param);
						},
					),
				),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/frontend/profile',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_profile' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		// My Submissions (Author)
		register_rest_route(
			'simplyconf/v1',
			'/frontend/submissions',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_my_submissions' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		// Track Chair: Track Submissions
		register_rest_route(
			'simplyconf/v1',
			'/frontend/track/submissions',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_track_submissions' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

		// Frontend Dashboard: My Stats
		register_rest_route(
			'simplyconf/v1',
			'/frontend/dashboard/my-stats',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_my_stats' ),
				'permission_callback' => array( $this, 'get_permission' ),
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

		// Frontend Dashboard: Action Items
		register_rest_route(
			'simplyconf/v1',
			'/frontend/dashboard/action-items',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_action_items' ),
				'permission_callback' => array( $this, 'get_permission' ),
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

		// Frontend Dashboard: Activity
		register_rest_route(
			'simplyconf/v1',
			'/frontend/dashboard/activity',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_activity' ),
				'permission_callback' => array( $this, 'get_permission' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param, $request, $key ) {
							return is_numeric($param);
						},
					),
					'limit'    => array(
						'required'          => false,
						'default'           => 5,
						'validate_callback' => function ( $param, $request, $key ) {
							return is_numeric($param) && $param > 0 && $param <= 5;
						},
					),
				),
			)
		);
	}

	/**
	 * Get user profile data
	 */
	public function get_profile( $req ) {
		global $wpdb;
		$user     = wp_get_current_user();
		$event_id = $req->get_param('event_id');

		// Get event roles for this user for the given event_id
		$event_roles_tbl = SimplyConf_DB::get_table('event_user_roles');
		$roles           = array();
		if ($event_id) {
			$roles = $wpdb->get_col(
				$wpdb->prepare(
					'SELECT role FROM ' . esc_sql($event_roles_tbl) . ' WHERE user_id = %d AND event_id = %d',
					$user->ID,
					$event_id
				)
			);
		}

		// Get custom fields from custom fields system
		$custom_values_tbl = SimplyConf_DB::get_table('custom_values');
		$custom_fields_tbl = SimplyConf_DB::get_table('custom_fields');
		$query             = 'SELECT cf.field_id, cf.name, cv.value 
             FROM ' . esc_sql($custom_values_tbl) . ' cv 
             JOIN ' . esc_sql($custom_fields_tbl) . " cf ON cv.field_id = cf.field_id 
             WHERE cv.entity_id = %d AND cv.entity_type = 'user'";
		$custom_data       = $wpdb->get_results(
			$wpdb->prepare(
				$query, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$user->ID
			),
			ARRAY_A
		);

		// Convert custom fields to array of objects with field_id and value
		$custom_fields_array = array();
		foreach ($custom_data as $field) {
			$custom_fields_array[] = array(
				'field_id' => intval($field['field_id']),
				'value'    => $field['value'],
			);
		}

		// Merge WP user info with custom profile data and event roles
		$profile = array(
			'user_id'       => $user->ID,
			'username'      => $user->user_login,
			'email'         => $user->user_email,
			'display_name'  => $user->display_name,
			'wp_roles'      => $user->roles,
			'event_roles'   => $roles,
			'custom_fields' => $custom_fields_array,
			'status'        => 1, // Always active for SimplyConf users
			'created'       => $user->user_registered,
			'modified'      => $user->user_registered, // Use WordPress user registration date
		);
		return rest_ensure_response($profile);
	}

	public function update_profile( $req ) {
		global $wpdb;
		$user    = wp_get_current_user();
		$payload = $req->get_json_params();

		// Update WP user fields
		$userdata = array( 'ID' => $user->ID );
		if ( ! empty($payload['display_name'])) {
			$userdata['display_name'] = sanitize_text_field($payload['display_name']);
		}
		if ( ! empty($payload['email'])) {
			$userdata['user_email'] = sanitize_email($payload['email']);
		}
		$wp_result = wp_update_user($userdata);
		if (is_wp_error($wp_result)) {
			return new WP_Error('profile_update_failed', 'Failed to update profile', array( 'status' => 400 ));
		}

		// Update custom fields
		if (isset($payload['custom_fields']) && is_array($payload['custom_fields'])) {
			$custom_values_tbl = SimplyConf_DB::get_table('custom_values');

			foreach ($payload['custom_fields'] as $key => $field_data) {
				$field_id = null;
				$value    = null;

				// Handle both formats: array of objects (like registration) or associative array
				if (is_array($field_data) && isset($field_data['field_id']) && isset($field_data['value'])) {
					// Registration format: [{field_id: 1, value: "test"}, ...]
					$field_id = intval($field_data['field_id']);
					$value    = sanitize_text_field($field_data['value']);
				} else {
					// Legacy associative array format: {1: "test", 2: "value", ...}
					$field_id = intval($key);
					$value    = sanitize_text_field($field_data);
				}

				if ( ! empty($field_id)) {
					$query  = 'SELECT id FROM ' . esc_sql($custom_values_tbl) . ' WHERE entity_id = %d AND field_id = %d';
					$exists = $wpdb->get_var(
						$wpdb->prepare(
							$query, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
							$user->ID,
							$field_id
						)
					);

					if ($exists) {
						$wpdb->update(
							$custom_values_tbl,
							array( 'value' => $value ),
							array( 'id' => $exists )
						);
					} else {
						$wpdb->insert(
							$custom_values_tbl,
							array(
								'entity_id'   => $user->ID,
								'entity_type' => 'user',
								'field_id'    => $field_id,
								'value'       => $value,
							)
						);
					}
				}
			}
		}

		// No longer tracking modification time - WordPress handles user updates

		// Return updated profile
		return $this->get_profile($req);
	}

	/**
	 * Get current user's abstract submissions
	 */
	public function get_my_submissions( $req ) {
		global $wpdb;

		$user     = wp_get_current_user();
		$event_id = $req->get_param('event_id');

		if ( ! $event_id ) {
			return new WP_Error(
				'missing_event_id',
				'Event ID is required',
				array( 'status' => 400 )
			);
		}

		// Get abstracts submitted by this user
		$statuses_tbl = SimplyConf_DB::get_table('statuses');

		$query = $wpdb->prepare(
			'SELECT a.*,
				st.name as status_name,
				st.label as status_label,
				st.color as status_color,
				t.name as track_name
			FROM ' . esc_sql($this->abstracts_tbl) . ' a
			LEFT JOIN ' . esc_sql($statuses_tbl) . ' st ON a.status = st.status_id
			LEFT JOIN ' . esc_sql($this->tracks_tbl) . ' t ON a.track_id = t.track_id
			WHERE a.submit_by = %d AND a.event_id = %d
			ORDER BY a.abstract_id DESC',
			$user->ID,
			$event_id
		);

		$submissions = $wpdb->get_results( $query ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		// Fetch custom fields for each abstract
		$custom_values_tbl = SimplyConf_DB::get_table('custom_values');

		foreach ( $submissions as &$submission ) {
			$custom_fields = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT field_id, value FROM {$custom_values_tbl}
					WHERE entity_id = %d AND entity_type = 'abstract'",
					$submission->abstract_id
				),
				ARRAY_A
			);

			// Deserialize JSON values (for checkbox groups)
			foreach ( $custom_fields as &$field ) {
				$decoded = json_decode( $field['value'], true );
				if ( json_last_error() === JSON_ERROR_NONE && is_array( $decoded ) ) {
					$field['value'] = $decoded;
				}
			}

			$submission->custom_fields = $custom_fields;
		}

		return rest_ensure_response( $submissions );
	}

	public function get_track_submissions( $req ) {
		global $wpdb;

		$user     = wp_get_current_user();
		$event_id = $req->get_param('event_id');

		// Validate user permissions
		if ( ! $this->has_event_role('track_chair', $event_id)) {
			return new WP_Error(
				'forbidden',
				'You do not have track chair access for this event',
				array( 'status' => 403 )
			);
		}

		// Get user's assigned tracks
		$track_ids = $this->get_user_track_assignments($user->ID, $event_id);

		if (empty($track_ids)) {
			return rest_ensure_response(array());
		}

		// Get submissions for assigned tracks
		$submissions = $this->get_track_submissions_query($event_id, $track_ids);

		return rest_ensure_response($submissions);
	}

	private function get_user_track_assignments( $user_id, $event_id ) {
		global $wpdb;

		$track_assignments_tbl = SimplyConf_DB::get_table('track_assignments');

		$query = 'SELECT track_id FROM ' . esc_sql($track_assignments_tbl) . ' WHERE user_id = %d AND event_id = %d';

		return $wpdb->get_col(
			$wpdb->prepare(
				$query, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$user_id,
				$event_id
			)
		);
	}

	private function get_draft_status_id( $event_id ) {
		global $wpdb;

		$statuses_tbl = SimplyConf_DB::get_table('statuses');
		$query        = 'SELECT status_id FROM ' . esc_sql($statuses_tbl) . " WHERE event_id = %d AND type = 'abstract' AND name = 'draft'";

		$draft_status = $wpdb->get_row(
			$wpdb->prepare(
				$query, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$event_id
			)
		);

		return $draft_status ? intval($draft_status->status_id) : null;
	}

	private function get_track_submissions_query( $event_id, $track_ids ) {
		global $wpdb;

		$statuses_tbl = SimplyConf_DB::get_table('statuses');
		$placeholders = implode(',', array_fill(0, count($track_ids), '%d'));

		// Check if reviews addon is available
		$has_reviews_addon = class_exists('SimplyConf_Reviews_Routes');

		// Base query
		$query_string = 'SELECT a.*, 
							st.name as status_name, 
							st.label as status_label, 
							st.color as status_color';

		// Add reviewer fields only if reviews addon is available
		if ($has_reviews_addon) {
			$reviewer_assignments_tbl = SimplyConf_DB::get_table('reviewer_assignments');
			$reviews_tbl = SimplyConf_DB::get_table('reviews');
			$review_statuses_tbl = SimplyConf_DB::get_table('statuses');
			$query_string .= ',
							COUNT(DISTINCT ra.reviewer_id) as reviewer_count,
							GROUP_CONCAT(DISTINCT ru.display_name SEPARATOR \', \') as reviewer_names,
							COUNT(DISTINCT CASE WHEN rst.is_final = 1 THEN r.review_id END) as completed_reviews_count';
		}

		$query_string .= ',
							su.display_name as submitted_by_name, su.user_email as submitted_by_email
						 FROM ' . esc_sql($this->abstracts_tbl) . ' a
						 LEFT JOIN ' . esc_sql($statuses_tbl) . " st ON a.status = st.status_id";

		// Add reviewer joins only if reviews addon is available
		if ($has_reviews_addon) {
			$query_string .= '
						 LEFT JOIN ' . esc_sql($reviewer_assignments_tbl) . " ra ON a.abstract_id = ra.abstract_id
						 LEFT JOIN " . esc_sql($this->users_tbl) . " ru ON ra.reviewer_id = ru.ID
						 LEFT JOIN " . esc_sql($reviews_tbl) . " r ON a.abstract_id = r.abstract_id AND ra.reviewer_id = r.reviewer_id
						 LEFT JOIN " . esc_sql($review_statuses_tbl) . " rst ON r.status = rst.status_id";
		}

		$query_string .= '
						 LEFT JOIN ' . esc_sql($this->users_tbl) . " su ON a.submit_by = su.ID
						 WHERE a.track_id IN ($placeholders) 
						   AND a.event_id = %d";

		// Build query arguments
		$args   = array_map('intval', $track_ids);
		$args[] = intval($event_id);

		// Exclude drafts if draft status exists
		$draft_status_id = $this->get_draft_status_id($event_id);
		if ($draft_status_id) {
			$query_string .= ' AND a.status != %d';
			$args[]        = $draft_status_id;
		}

		$query_string .= ' GROUP BY a.abstract_id ORDER BY a.abstract_id DESC';

		// Prepare and execute query
		$query = call_user_func_array(
			array( $wpdb, 'prepare' ),
			array_merge( array( $query_string ), $args ) // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		return $wpdb->get_results($query);
	}

	/**
	 * Get user-specific dashboard statistics
	 */
	public function get_my_stats( $request ) {
		global $wpdb;

		$event_id = $request->get_param('event_id');
		$user_id  = get_current_user_id();

		$stats = array(
			'submissions' => array(
				'total'    => 0,
				'accepted' => 0,
				'pending'  => 0,
				'rejected' => 0,
				'draft'    => 0,
			),
			'reviews'     => array(
				'assigned'  => 0,
				'completed' => 0,
				'pending'   => 0,
				'overdue'   => 0,
			),
			'track'       => array(
				'submissions' => 0,
				'assigned'    => 0,
				'unassigned'  => 0,
			),
		);

		// Get user's submissions
		$abstracts_tbl = SimplyConf_DB::get_table('abstracts');
		$statuses_tbl  = SimplyConf_DB::get_table('statuses');

		// Get draft status ID
		$draft_status = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT status_id FROM $statuses_tbl WHERE event_id = %d AND type = 'abstract' AND name = 'draft'",
				$event_id
			)
		);
		$draft_status_id = $draft_status ? $draft_status->status_id : null;

		// Count total submissions by user
		$stats['submissions']['total'] = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM $abstracts_tbl WHERE event_id = %d AND submit_by = %d",
				$event_id,
				$user_id
			)
		);

		// Count drafts
		if ($draft_status_id) {
			$stats['submissions']['draft'] = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM $abstracts_tbl WHERE event_id = %d AND submit_by = %d AND status = %d",
					$event_id,
					$user_id,
					$draft_status_id
				)
			);
		}

		// Count by status (accepted, pending, rejected)
		$status_counts = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT s.name, COUNT(*) as count 
				FROM $abstracts_tbl a
				JOIN $statuses_tbl s ON a.status = s.status_id
				WHERE a.event_id = %d AND a.submit_by = %d AND s.type = 'abstract'
				GROUP BY s.name",
				$event_id,
				$user_id
			)
		);

		foreach ($status_counts as $status) {
			$status_name = strtolower($status->name);
			if (isset($stats['submissions'][ $status_name ])) {
				$stats['submissions'][ $status_name ] = (int) $status->count;
			}
		}

		// Get user's review assignments (if reviews addon active)
		if (simplyconf_has_addon('reviews')) {
			$reviewer_assignments_tbl = SimplyConf_DB::get_table('reviewer_assignments');
			$reviews_tbl              = SimplyConf_DB::get_table('reviews');

			// Count assigned reviews
			$stats['reviews']['assigned'] = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM $reviewer_assignments_tbl WHERE event_id = %d AND reviewer_id = %d",
					$event_id,
					$user_id
				)
			);

			// Count completed reviews
			$stats['reviews']['completed'] = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM $reviews_tbl WHERE event_id = %d AND reviewer_id = %d",
					$event_id,
					$user_id
				)
			);

			// Count pending (assigned but not completed)
			$stats['reviews']['pending'] = $stats['reviews']['assigned'] - $stats['reviews']['completed'];

			// Count overdue reviews (due_date passed and not completed)
			$stats['reviews']['overdue'] = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) 
					FROM $reviewer_assignments_tbl ra
					LEFT JOIN $reviews_tbl r ON ra.abstract_id = r.abstract_id AND ra.reviewer_id = r.reviewer_id AND ra.event_id = r.event_id
					WHERE ra.event_id = %d AND ra.reviewer_id = %d 
					AND ra.due_date < NOW() 
					AND r.review_id IS NULL",
					$event_id,
					$user_id
				)
			);
		}

		// Get track chair stats
		$track_assignments_tbl = SimplyConf_DB::get_table('track_assignments');
		$is_track_chair        = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM $track_assignments_tbl WHERE event_id = %d AND user_id = %d",
				$event_id,
				$user_id
			)
		);

		if ($is_track_chair > 0) {
			// Get tracks managed by this user
			$managed_tracks = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT track_id FROM $track_assignments_tbl WHERE event_id = %d AND user_id = %d",
					$event_id,
					$user_id
				)
			);

			if ( ! empty($managed_tracks)) {
				$track_ids_placeholder = str_repeat('%d,', count($managed_tracks) - 1) . '%d';

				// Count submissions in managed tracks
				$stats['track']['submissions'] = (int) $wpdb->get_var(
					$wpdb->prepare(
						"SELECT COUNT(*) FROM $abstracts_tbl WHERE event_id = %d AND track_id IN ($track_ids_placeholder)",
						array_merge(array( $event_id ), $managed_tracks)
					)
				);

				// Count assigned submissions (those with reviewers)
				if (simplyconf_has_addon('reviews')) {
					$stats['track']['assigned'] = (int) $wpdb->get_var(
						$wpdb->prepare(
							"SELECT COUNT(DISTINCT a.abstract_id) 
							FROM $abstracts_tbl a
							JOIN $reviewer_assignments_tbl ra ON a.abstract_id = ra.abstract_id
							WHERE a.event_id = %d AND a.track_id IN ($track_ids_placeholder)",
							array_merge(array( $event_id ), $managed_tracks)
						)
					);

					$stats['track']['unassigned'] = $stats['track']['submissions'] - $stats['track']['assigned'];
				}
			}
		}

		return rest_ensure_response($stats);
	}

	/**
	 * Get user-specific action items
	 */
	public function get_action_items( $request ) {
		global $wpdb;

		$event_id = $request->get_param('event_id');
		$user_id  = get_current_user_id();

		$action_items = array();

		// Get user roles for this event
		$event_user_roles_tbl = SimplyConf_DB::get_table('event_user_roles');
		$user_roles           = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT role FROM $event_user_roles_tbl WHERE event_id = %d AND user_id = %d",
				$event_id,
				$user_id
			)
		);

		$is_author      = in_array('author', $user_roles, true);
		$is_reviewer    = in_array('reviewer', $user_roles, true);
		$is_track_chair = in_array('track_chair', $user_roles, true);

		// Author action items
		if ($is_author) {
			$abstracts_tbl = SimplyConf_DB::get_table('abstracts');
			$statuses_tbl  = SimplyConf_DB::get_table('statuses');

			// Get initial status ID 
			$draft_status = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT status_id FROM $statuses_tbl WHERE event_id = %d AND type = 'abstract' AND is_initial = 1",
					$event_id
				)
			);

			if ($draft_status) {
				$draft_count = (int) $wpdb->get_var(
					$wpdb->prepare(
						"SELECT COUNT(*) FROM $abstracts_tbl WHERE event_id = %d AND submit_by = %d AND status = %d",
						$event_id,
						$user_id,
						$draft_status->status_id
					)
				);

				if ($draft_count > 0) {
					$action_items[] = array(
						'id'          => 'draft_submissions',
						'type'        => 'submission',
						'title'       => 'Draft Submissions',
						'description' => sprintf('You have %d unfinished submission%s', $draft_count, $draft_count > 1 ? 's' : ''),
						'priority'    => 'medium',
						'count'       => $draft_count,
						'action'      => 'Continue Editing',
						'actionUrl'   => '/submissions',
					);
				}
			}
		}

		// Reviewer action items
		if ($is_reviewer && simplyconf_has_addon('reviews')) {
			$reviewer_assignments_tbl = SimplyConf_DB::get_table('reviewer_assignments');
			$reviews_tbl              = SimplyConf_DB::get_table('reviews');

			// Count pending reviews
			$pending_count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) 
					FROM $reviewer_assignments_tbl ra
					LEFT JOIN $reviews_tbl r ON ra.abstract_id = r.abstract_id AND ra.reviewer_id = r.reviewer_id AND ra.event_id = r.event_id
					WHERE ra.event_id = %d AND ra.reviewer_id = %d AND r.review_id IS NULL",
					$event_id,
					$user_id
				)
			);

			if ($pending_count > 0) {
				// Check if any are overdue
				$overdue_count = (int) $wpdb->get_var(
					$wpdb->prepare(
						"SELECT COUNT(*) 
						FROM $reviewer_assignments_tbl ra
						LEFT JOIN $reviews_tbl r ON ra.abstract_id = r.abstract_id AND ra.reviewer_id = r.reviewer_id AND ra.event_id = r.event_id
						WHERE ra.event_id = %d AND ra.reviewer_id = %d 
						AND ra.due_date < NOW() 
						AND r.review_id IS NULL",
						$event_id,
						$user_id
					)
				);

				$action_items[] = array(
					'id'          => 'pending_reviews',
					'type'        => 'review',
					'title'       => $overdue_count > 0 ? 'Overdue Reviews' : 'Pending Reviews',
					'description' => sprintf('%d submission%s awaiting your review', $pending_count, $pending_count > 1 ? 's' : ''),
					'priority'    => $overdue_count > 0 ? 'high' : 'medium',
					'count'       => $pending_count,
					'action'      => 'Start Reviewing',
					'actionUrl'   => '/reviews',
				);
			}
		}

		// Track chair action items
		if ($is_track_chair && simplyconf_has_addon('reviews')) {
			$track_assignments_tbl    = SimplyConf_DB::get_table('track_assignments');
			$abstracts_tbl            = SimplyConf_DB::get_table('abstracts');
			$reviewer_assignments_tbl = SimplyConf_DB::get_table('reviewer_assignments');

			// Get tracks managed by this user
			$managed_tracks = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT track_id FROM $track_assignments_tbl WHERE event_id = %d AND user_id = %d",
					$event_id,
					$user_id
				)
			);

			if ( ! empty($managed_tracks)) {
				$track_ids_placeholder = str_repeat('%d,', count($managed_tracks) - 1) . '%d';
				$statuses_tbl = SimplyConf_DB::get_table('statuses');

				// Count unassigned submissions (excluding drafts)
				$unassigned_count = (int) $wpdb->get_var(
					$wpdb->prepare(
						"SELECT COUNT(DISTINCT a.abstract_id) 
						FROM $abstracts_tbl a
						LEFT JOIN $reviewer_assignments_tbl ra ON a.abstract_id = ra.abstract_id
						LEFT JOIN $statuses_tbl s ON a.status = s.status_id
						WHERE a.event_id = %d AND a.track_id IN ($track_ids_placeholder) AND ra.assignment_id IS NULL AND (s.is_initial IS NULL OR s.is_initial = 0)",
						array_merge(array( $event_id ), $managed_tracks)
					)
				);

				if ($unassigned_count > 0) {
					$action_items[] = array(
						'id'          => 'track_assignments',
						'type'        => 'track',
						'title'       => 'Unassigned Submissions',
						'description' => sprintf('%d submission%s need reviewer assignment', $unassigned_count, $unassigned_count > 1 ? 's' : ''),
						'priority'    => 'medium',
						'count'       => $unassigned_count,
						'action'      => 'Manage Tracks',
						'actionUrl'   => '/tracks',
					);
				}
			}
		}

		return rest_ensure_response(
			array(
				'items' => $action_items,
				'total' => count($action_items),
			)
		);
	}

	/**
	 * Get recent activity for the user
	 */
	public function get_activity( $request ) {
		global $wpdb;

		$event_id = $request->get_param('event_id');
		$limit    = $request->get_param('limit') ?? 5;
		$user_id  = get_current_user_id();

		$activities = array();

		// Get user's recent submissions
		$abstracts_tbl = SimplyConf_DB::get_table('abstracts');
		$submissions   = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT abstract_id as entity_id, title, 
				GREATEST(created, COALESCE(modified, created)) as date, 
				'abstract' as type, 
				CASE WHEN modified IS NOT NULL AND modified > created THEN 'updated' ELSE 'submitted' END as action
				FROM $abstracts_tbl 
				WHERE event_id = %d AND submit_by = %d 
				ORDER BY date DESC 
				LIMIT %d",
				$event_id,
				$user_id,
				$limit
			)
		);

		foreach ($submissions as $submission) {
			$activities[] = array(
				'type'      => 'abstract',
				'action'    => $submission->action,
				'entity_id' => $submission->entity_id,
				'title'     => $submission->title,
				'date'      => $submission->date,
				'user'      => wp_get_current_user()->display_name,
				'event_id'  => $event_id,
			);
		}

		// Get user's recent reviews (if reviews addon active)
		if (simplyconf_has_addon('reviews')) {
			$reviews_tbl = SimplyConf_DB::get_table('reviews');
			$reviews     = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT r.review_id as entity_id, a.title, 
					GREATEST(r.created, COALESCE(r.modified, r.created)) as date, 
					'review' as type,
					CASE WHEN r.modified IS NOT NULL AND r.modified > r.created THEN 'updated' ELSE 'submitted' END as action
					FROM $reviews_tbl r
					JOIN $abstracts_tbl a ON r.abstract_id = a.abstract_id
					WHERE r.event_id = %d AND r.reviewer_id = %d 
					ORDER BY date DESC 
					LIMIT %d",
					$event_id,
					$user_id,
					$limit
				)
			);

			foreach ($reviews as $review) {
				$activities[] = array(
					'type'      => 'review',
					'action'    => $review->action,
					'entity_id' => $review->entity_id,
					'title'     => $review->title,
					'date'      => $review->date,
					'user'      => wp_get_current_user()->display_name,
					'event_id'  => $event_id,
				);
			}
		}

		// Sort by date
		usort(
			$activities,
			function ( $a, $b ) {
				return strtotime($b['date']) - strtotime($a['date']);
			}
		);

		// Limit to requested amount
		$activities = array_slice($activities, 0, $limit);

		return rest_ensure_response(
			array(
				'activities' => $activities,
				'total'      => count($activities),
			)
		);
	}
}
new SimplyConf_Frontend_Routes();
