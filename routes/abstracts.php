<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * This file will create Custom Rest API End Points for abstract CRUD.
 */
class SimplyConf_Abstract_Routes {

	public $abstracts_tbl;
	public $reviews_tbl;
	public $custom_values_tbl;
	public function __construct() {
		global $wpdb;
		$this->abstracts_tbl     = SimplyConf_DB::get_table('abstracts');
		$this->reviews_tbl       = SimplyConf_DB::get_table('reviews');
		$this->custom_values_tbl = SimplyConf_DB::get_table('custom_values');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		register_rest_route(
			'simplyconf/v1',
			'/abstracts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_abstracts' ),
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
		register_rest_route(
			'simplyconf/v1',
			'/abstracts/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_abstract' ),
				'permission_callback' => array( $this, 'get_single_abstract_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/abstracts',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_abstract' ),
				'permission_callback' => function () {
					// Allow filtering of permission checks
					return apply_filters('simplyconf_permission_check', is_user_logged_in(), 'create_abstract');
				},
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/abstracts/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_abstract' ),
				'permission_callback' => array( $this, 'update_abstract_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/abstracts/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_abstract' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
	}

	public function get_permission( $request ) {
		$is_authenticated = is_user_logged_in();
		return apply_filters('simplyconf_permission_check', $is_authenticated, 'abstracts');
	}

	public function get_single_abstract_permission( $request ) {
		if ( ! is_user_logged_in() ) {
			return false;
		}
		if ( current_user_can('manage_options') ) {
			return true;
		}
		global $wpdb;
		$abstract_id = intval( $request->get_param('id') );
		$abstract    = $wpdb->get_row(
			$wpdb->prepare( "SELECT submit_by, event_id FROM {$this->abstracts_tbl} WHERE abstract_id = %d", $abstract_id )
		);
		if ( ! $abstract ) {
			return false;
		}
		if ( intval( $abstract->submit_by ) === get_current_user_id() ) {
			return true;
		}
		$roles_tbl = SimplyConf_DB::get_table('event_user_roles');
		$has_role  = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM $roles_tbl WHERE event_id = %d AND user_id = %d",
				$abstract->event_id,
				get_current_user_id()
			)
		);
		return apply_filters( 'simplyconf_permission_check', (bool) $has_role, 'get_abstract' );
	}

	public function update_abstract_permission( $request ) {
		if ( ! is_user_logged_in() ) {
			return false;
		}
		if ( current_user_can('manage_options') ) {
			return true;
		}
		global $wpdb;
		$abstract_id   = intval( $request->get_param('id') );
		$abstracts_tbl = SimplyConf_DB::get_table('abstracts');
		$abstract      = $wpdb->get_row(
			$wpdb->prepare( "SELECT submit_by, event_id FROM $abstracts_tbl WHERE abstract_id = %d", $abstract_id )
		);
		if ( ! $abstract ) {
			return false;
		}
		// Author owns the abstract.
		if ( intval( $abstract->submit_by ) === get_current_user_id() ) {
			return true;
		}
		// User has any event-scoped role (reviewer, track_chair, etc.).
		$roles_tbl = SimplyConf_DB::get_table('event_user_roles');
		$has_role  = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM $roles_tbl WHERE event_id = %d AND user_id = %d",
				$abstract->event_id,
				get_current_user_id()
			)
		);
		return apply_filters( 'simplyconf_permission_check', (bool) $has_role, 'update_abstract' );
	}

	public function get_abstracts( $req ) {
		global $wpdb;
		$query    = $req->get_query_params();
		$event_id = absint($query['event_id'] ?? 0);
		$per_page = isset($query['per_page']) ? absint($query['per_page']) : -1;
		$page     = isset($query['page']) ? max(1, absint($query['page'])) : 1;
		$offset   = $per_page > 0 ? ($page - 1) * $per_page : 0;

		if ( ! $event_id) {
			return new WP_Error('missing_event_id', 'event_id is required', array( 'status' => 400 ));
		}

		// Get status IDs for filtering
		$statuses_tbl = SimplyConf_DB::get_table('statuses');
		$draft_status = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT status_id FROM $statuses_tbl WHERE event_id = %d AND type = 'abstract' AND name = 'draft'",
				$event_id
			)
		);

		// Exclude drafts from admin view - only show submitted and processed abstracts
		$where_parts = array( $wpdb->prepare('a.event_id = %d', $event_id) );
		if ($draft_status && $draft_status->status_id) {
			$where_parts[] = $wpdb->prepare('a.status != %d', absint($draft_status->status_id));
		}
		$where_clause = 'WHERE ' . implode(' AND ', $where_parts);

		// Check if pro plugin is active for reviewer assignments
		$reviewer_assignments_tbl = SimplyConf_DB::get_table('reviewer_assignments');
		$has_pro                  = $wpdb->get_var("SHOW TABLES LIKE '{$reviewer_assignments_tbl}'") === $reviewer_assignments_tbl;

		// Enhanced query to include status information and reviewer count via LEFT JOIN
		if ($has_pro) {
			$sql = "SELECT a.*, 
                           st.name as status_name, st.label as status_label, st.description as status_description, st.color as status_color,
                           COUNT(DISTINCT ra.reviewer_id) as reviewer_count,
                           GROUP_CONCAT(DISTINCT ru.display_name SEPARATOR ', ') as reviewer_names,
                           su.display_name as submitted_by_name, su.user_email as submitted_by_email
                    FROM {$this->abstracts_tbl} a
                    LEFT JOIN {$statuses_tbl} st ON a.status = st.status_id AND st.type = 'abstract'
                    LEFT JOIN {$reviewer_assignments_tbl} ra ON a.abstract_id = ra.abstract_id
                    LEFT JOIN {$wpdb->users} ru ON ra.reviewer_id = ru.ID
                    LEFT JOIN {$wpdb->users} su ON a.submit_by = su.ID
                    $where_clause 
                    GROUP BY a.abstract_id
                    ORDER BY a.abstract_id DESC";
		} else {
			$sql = "SELECT a.*, 
                           st.name as status_name, st.label as status_label, st.description as status_description, st.color as status_color,
                           su.display_name as submitted_by_name, su.user_email as submitted_by_email
                    FROM {$this->abstracts_tbl} a
                    LEFT JOIN {$statuses_tbl} st ON a.status = st.status_id AND st.type = 'abstract'
                    LEFT JOIN {$wpdb->users} su ON a.submit_by = su.ID
                    $where_clause 
                    ORDER BY a.abstract_id DESC";
		}
		// Count total (without LIMIT) for pagination headers
		$count_sql = "SELECT COUNT(DISTINCT a.abstract_id) FROM {$this->abstracts_tbl} a $where_clause";
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table names from internal class property; $where_clause built with $wpdb->prepare() fragments.
		$total     = (int) $wpdb->get_var($count_sql);

		// Apply pagination if requested
		if ($per_page > 0) {
			$sql .= $wpdb->prepare(' LIMIT %d OFFSET %d', $per_page, $offset);
		}
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table names from internal class property; $where_clause built with $wpdb->prepare() fragments.
		$abstracts = $wpdb->get_results($sql, 'ARRAY_A');

		// Fetch custom fields for each abstract
		foreach ($abstracts as &$abstract) {
			$abstract['custom_fields'] = SimplyConf_Helpers::get_entity_custom_fields(
				$abstract['abstract_id'],
				'abstract'
			);
		}

		$response = rest_ensure_response($abstracts);
		$response->header('X-WP-Total', $total);
		$response->header('X-WP-TotalPages', $per_page > 0 ? (int) ceil($total / $per_page) : 1);
		return $response;
	}

	public function get_abstract( $req ) {
		global $wpdb;
		$id = intval($req->get_param('id'));

		// Enhanced query to include track, session, and status information
		$tracks_tbl   = SimplyConf_DB::get_table('tracks');
		$sessions_tbl = SimplyConf_DB::get_table('sessions');
		$statuses_tbl = SimplyConf_DB::get_table('statuses');

		$abstract = $wpdb->get_row(
			$wpdb->prepare(
				"
            SELECT a.*,
                   t.name as track_name, t.description as track_description,
                   s.name as session_name, s.description as session_description,
                   st.name as status_name, st.label as status_label, st.description as status_description, st.color as status_color,
                   su.display_name as submitted_by_name, su.user_email as submitted_by_email
            FROM {$this->abstracts_tbl} a
            LEFT JOIN {$tracks_tbl} t ON a.track_id = t.track_id
            LEFT JOIN {$sessions_tbl} s ON a.session_id = s.session_id
            LEFT JOIN {$statuses_tbl} st ON a.status = st.status_id
            LEFT JOIN {$wpdb->users} su ON a.submit_by = su.ID
            WHERE a.abstract_id = %d
        ",
				$id
			),
			ARRAY_A
		);

		if ( ! $abstract) {
			return new WP_Error('invalid_abstract_id', 'Could not locate abstract id', array( 'status' => 404 ));
		}

		// Add track object if track information exists
		if ($abstract['track_id'] && $abstract['track_name']) {
			$abstract['track'] = array(
				'id'          => $abstract['track_id'],
				'name'        => $abstract['track_name'],
				'description' => $abstract['track_description'],
			);
		}

		// Add session object if session information exists
		if ($abstract['session_id'] && $abstract['session_name']) {
			$abstract['session'] = array(
				'id'          => $abstract['session_id'],
				'name'        => $abstract['session_name'],
				'description' => $abstract['session_description'],
			);
		}

		// Fetch custom fields
		$abstract['custom_fields'] = SimplyConf_Helpers::get_entity_custom_fields($id, 'abstract');
		// Fetch authors with custom fields
		$authors_tbl          = SimplyConf_DB::get_table('authors');
		$abstract_authors_tbl = SimplyConf_DB::get_table('abstract_authors');
		$authors              = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT a.*, aa.author_order, aa.is_corresponding, aa.is_presenter 
            FROM $authors_tbl a 
            JOIN $abstract_authors_tbl aa ON a.author_id = aa.author_id 
            WHERE aa.abstract_id = %d 
            ORDER BY aa.author_order ASC",
				$id
			),
			ARRAY_A
		);

		// Fetch custom fields for each author
		foreach ($authors as &$author) {
			$author['custom_fields'] = SimplyConf_Helpers::get_entity_custom_fields(
				$author['author_id'],
				'author'
			);

			// Allow filtering of author data
			$author = apply_filters('simplyconf_author_data', $author, $id);
		}

		$abstract['authors'] = $authors;

		// Allow filtering of abstract data
		$abstract = apply_filters('simplyconf_abstract_data', $abstract, $id);

		return rest_ensure_response($abstract);
	}

	public function create_abstract( $request ) {
		$params = $request->get_json_params();
		$result = simplyconf_create_abstract($params);

		if (is_wp_error($result)) {
			return $result;
		}

		$response = rest_ensure_response(array( 'abstract_id' => $result ));
		$response->set_status(201);
		return $response;
	}

	public function update_abstract( $req ) {
		$payload = $req->get_json_params();
		$id      = intval($req->get_param('id'));

		$result = simplyconf_update_abstract($id, $payload);

		if (is_wp_error($result)) {
			return $result;
		}

		return rest_ensure_response($result);
	}

	public function delete_abstract( $req ) {
		$id = intval($req->get_param('id'));

		$result = simplyconf_delete_abstract($id);

		if (is_wp_error($result)) {
			return $result;
		}

		return rest_ensure_response($result);
	}
}

new SimplyConf_Abstract_Routes();
