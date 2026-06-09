<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * REST API endpoints for Author CRUD operations
 * Handles hybrid author model - WordPress users and external collaborators
 */
class SimplyConf_Author_Routes {

	public $authors_tbl;
	public $abstract_authors_tbl;
	public $abstracts_tbl;
	public $custom_fields_tbl;
	public $custom_values_tbl;

	public function __construct() {
		global $wpdb;
		$this->authors_tbl          = SimplyConf_DB::get_table('authors');
		$this->abstract_authors_tbl = SimplyConf_DB::get_table('abstract_authors');
		$this->abstracts_tbl        = SimplyConf_DB::get_table('abstracts');
		$this->custom_fields_tbl    = SimplyConf_DB::get_table('custom_fields');
		$this->custom_values_tbl    = SimplyConf_DB::get_table('custom_values');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		// List authors with filtering and search
		register_rest_route(
			'simplyconf/v1',
			'/authors',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_authors' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

		// Get single author with custom fields
		register_rest_route(
			'simplyconf/v1',
			'/authors/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_author' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

		// Create new author
		register_rest_route(
			'simplyconf/v1',
			'/authors',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_author' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

		// Update author
		register_rest_route(
			'simplyconf/v1',
			'/authors/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_author' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

		// Delete author
		register_rest_route(
			'simplyconf/v1',
			'/authors/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_author' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

		// Get author's abstracts
		register_rest_route(
			'simplyconf/v1',
			'/authors/(?P<id>\d+)/abstracts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_author_abstracts' ),
				'permission_callback' => array( $this, 'admin_permission' ),
			)
		);

		// Link author to WordPress user by email
		register_rest_route(
			'simplyconf/v1',
			'/authors/(?P<id>\d+)/link-user',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'link_author_to_user' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

		// Search authors by email (for duplicate checking)
		register_rest_route(
			'simplyconf/v1',
			'/authors/search',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'search_authors' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
	}

	public function get_permission( $request ) {
		$is_authenticated = is_user_logged_in();
		return apply_filters('simplyconf_permission_check', $is_authenticated, 'authors');
	}

	public function admin_permission( $request ) {
		return current_user_can('manage_options');
	}

	/**
	 * Get all authors with optional filtering
	 * Query params: event_id, search, has_user, limit, offset
	 */
	public function get_authors( $req ) {
		global $wpdb;


		$event_id = $req->get_param('event_id');
		$search   = $req->get_param('search');
		$has_user = $req->get_param('has_user'); // 'true' or 'false'
		$limit    = intval($req->get_param('limit')) ?: 50;
		$offset   = intval($req->get_param('offset')) ?: 0;

		$where_clauses = array();
		$params        = array();

		// Filter by event_id (via abstract_authors -> abstracts)
		if ($event_id) {
			$where_clauses[] = "a.author_id IN (
                SELECT DISTINCT aa.author_id 
                FROM {$this->abstract_authors_tbl} aa
                INNER JOIN {$this->abstracts_tbl} abs ON aa.abstract_id = abs.abstract_id
                WHERE abs.event_id = %d
            )";
			$params[]        = intval($event_id);
		}

		// Search by name or email
		if ($search) {
			$where_clauses[] = '(a.first_name LIKE %s OR a.last_name LIKE %s OR a.email LIKE %s)';
			$search_term     = '%' . $wpdb->esc_like($search) . '%';
			$params[]        = $search_term;
			$params[]        = $search_term;
			$params[]        = $search_term;
		}

		// Filter by WordPress user linkage
		if ($has_user === 'true') {
			$where_clauses[] = 'a.user_id IS NOT NULL';
		} elseif ($has_user === 'false') {
			$where_clauses[] = 'a.user_id IS NULL';
		}

		$where_sql = ! empty($where_clauses) ? 'WHERE ' . implode(' AND ', $where_clauses) : '';
		$params[]  = $limit;
		$params[]  = $offset;

		$query = "
            SELECT a.*, 
                   u.display_name as wp_display_name,
                   COUNT(DISTINCT aa.abstract_id) as abstract_count,
                   GROUP_CONCAT(
                       DISTINCT CONCAT(abs.abstract_id, ':', abs.title) 
                       ORDER BY abs.created DESC 
                       SEPARATOR '||'
                   ) as abstracts_info
            FROM {$this->authors_tbl} a
            LEFT JOIN {$wpdb->users} u ON a.user_id = u.ID
            LEFT JOIN {$this->abstract_authors_tbl} aa ON a.author_id = aa.author_id
            LEFT JOIN {$this->abstracts_tbl} abs ON aa.abstract_id = abs.abstract_id
            $where_sql
            GROUP BY a.author_id
            ORDER BY a.author_id DESC
            LIMIT %d OFFSET %d
        ";

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- $query built with %d placeholders and passed to $wpdb->prepare(); table names from internal class properties.
		$authors = $wpdb->get_results($wpdb->prepare($query, $params));

		// Get custom field values for each author and parse abstracts
		foreach ($authors as &$author) {
			$author->custom_fields = $this->get_author_custom_fields($author->author_id);

			// Parse abstracts_info into structured array
			if ( ! empty($author->abstracts_info)) {
				$abstracts      = array();
				$abstract_parts = explode('||', $author->abstracts_info);
				foreach ($abstract_parts as $part) {
					if (strpos($part, ':') !== false) {
						list($id, $title) = explode(':', $part, 2);
						$abstracts[]      = array(
							'abstract_id' => intval($id),
							'title'       => $title,
						);
					}
				}
				$author->abstracts = $abstracts;
			} else {
				$author->abstracts = array();
			}
			unset($author->abstracts_info); // Remove raw concatenated string
		}

		return rest_ensure_response($authors);
	}

	/**
	 * Get single author by ID with custom fields
	 */
	public function get_author( $req ) {
		global $wpdb;
		$author_id = intval($req->get_param('id'));

		$author = $wpdb->get_row(
			$wpdb->prepare(
				"
            SELECT a.*, 
                   u.display_name as wp_display_name,
                   u.user_email as wp_email
            FROM {$this->authors_tbl} a
            LEFT JOIN {$wpdb->users} u ON a.user_id = u.ID
            WHERE a.author_id = %d
        ",
				$author_id
			)
		);

		if ( ! $author) {
			return new WP_Error('author_not_found', 'Author not found', array( 'status' => 404 ));
		}

		// Get custom fields
		$author->custom_fields = $this->get_author_custom_fields($author_id);

		// Get abstracts
		$author->abstracts = $wpdb->get_results(
			$wpdb->prepare(
				"
            SELECT abs.abstract_id, abs.title, abs.event_id,
                   aa.author_order, aa.is_corresponding, aa.is_presenter
            FROM {$this->abstract_authors_tbl} aa
            INNER JOIN {$this->abstracts_tbl} abs ON aa.abstract_id = abs.abstract_id
            WHERE aa.author_id = %d
            ORDER BY abs.created DESC
        ",
				$author_id
			)
		);

		return rest_ensure_response($author);
	}

	/**
	 * Create new author
	 * Payload: first_name, last_name, email, custom_fields (array)
	 */
	public function create_author( $req ) {
		global $wpdb;

		$payload = $req->get_json_params();

		// Validate required fields
		if (empty($payload['first_name']) || empty($payload['last_name']) || empty($payload['email'])) {
			return new WP_Error('missing_fields', 'First name, last name, and email are required', array( 'status' => 400 ));
		}

		// Check for duplicate email
		$existing = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT author_id FROM {$this->authors_tbl} WHERE email = %s",
				$payload['email']
			)
		);

		if ($existing) {
			return new WP_Error('duplicate_email', 'An author with this email already exists', array( 'status' => 400 ));
		}

		// Attempt to auto-link to WordPress user if setting is enabled
		$user_id = null;
		$event_id = isset($payload['event_id']) ? intval($payload['event_id']) : simplyconf_get_current_event_id();
		$auto_link_setting = simplyconf_get_setting('auto_link_authors_to_users', $event_id, 'author');
		$auto_link_enabled = $auto_link_setting ? intval($auto_link_setting) === 1 : true; // Default to true for backwards compatibility
		
		if ($auto_link_enabled) {
			$user    = get_user_by('email', $payload['email']);
			$user_id = $user ? $user->ID : null;
		}

		$data = array(
			'first_name' => sanitize_text_field($payload['first_name']),
			'last_name'  => sanitize_text_field($payload['last_name']),
			'email'      => sanitize_email($payload['email']),
			'user_id'    => $user_id,
			'created'    => current_time('mysql'),
		);

		$wpdb->insert($this->authors_tbl, $data);
		$author_id = $wpdb->insert_id;

		// Save custom fields if provided
		if ( ! empty($payload['custom_fields'])) {
			$this->save_author_custom_fields($author_id, $payload['custom_fields']);
		}

		do_action('simplyconf_author_created', $author_id);

		// Fetch and return created author
		$new_author = $wpdb->get_row(
			$wpdb->prepare(
				"
            SELECT a.*, 
                   u.display_name as wp_display_name,
                   u.user_email as wp_email
            FROM {$this->authors_tbl} a
            LEFT JOIN {$wpdb->users} u ON a.user_id = u.ID
            WHERE a.author_id = %d
        ",
				$author_id
			)
		);

		if ($new_author) {
			$new_author->custom_fields = $this->get_author_custom_fields($author_id);

			// Get abstracts (will be empty for new author)
			$new_author->abstracts = $wpdb->get_results(
				$wpdb->prepare(
					"
                SELECT abs.abstract_id, abs.title, abs.event_id,
                       aa.author_order, aa.is_corresponding, aa.is_presenter
                FROM {$this->abstract_authors_tbl} aa
                INNER JOIN {$this->abstracts_tbl} abs ON aa.abstract_id = abs.abstract_id
                WHERE aa.author_id = %d
                ORDER BY abs.created DESC
            ",
					$author_id
				)
			);
		}

		$response = rest_ensure_response($new_author);
		$response->set_status(201);
		return $response;
	}

	/**
	 * Update author
	 * Payload: first_name, last_name, email, custom_fields (array)
	 */
	public function update_author( $req ) {
		global $wpdb;

		$author_id = intval($req->get_param('id'));
		$payload   = $req->get_json_params();

		// Check author exists
		$author = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->authors_tbl} WHERE author_id = %d",
				$author_id
			)
		);

		if ( ! $author) {
			return new WP_Error('author_not_found', 'Author not found', array( 'status' => 404 ));
		}

		// Check for duplicate email (excluding current author)
		if ( ! empty($payload['email']) && $payload['email'] !== $author->email) {
			$existing = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT author_id FROM {$this->authors_tbl} WHERE email = %s AND author_id != %d",
					$payload['email'],
					$author_id
				)
			);

			if ($existing) {
				return new WP_Error('duplicate_email', 'An author with this email already exists', array( 'status' => 400 ));
			}
		}

		$data = array( 'modified' => current_time('mysql') );

		if (isset($payload['first_name'])) {
			$data['first_name'] = sanitize_text_field($payload['first_name']);
		}
		if (isset($payload['last_name'])) {
			$data['last_name'] = sanitize_text_field($payload['last_name']);
		}
		if (isset($payload['email'])) {
			$data['email'] = sanitize_email($payload['email']);
			// Attempt to auto-link to WordPress user if email changed and setting is enabled
			$event_id = isset($payload['event_id']) ? intval($payload['event_id']) : simplyconf_get_current_event_id();
			$auto_link_setting = simplyconf_get_setting('auto_link_authors_to_users', $event_id, 'author');
			$auto_link_enabled = $auto_link_setting ? intval($auto_link_setting) === 1 : true; // Default to true for backwards compatibility
			
			if ($auto_link_enabled) {
				$user            = get_user_by('email', $data['email']);
				$data['user_id'] = $user ? $user->ID : null;
			}
		}

		$wpdb->update($this->authors_tbl, $data, array( 'author_id' => $author_id ));

		// Update custom fields if provided
		if (isset($payload['custom_fields'])) {
			$this->save_author_custom_fields($author_id, $payload['custom_fields']);
		}

		do_action('simplyconf_author_updated', $author_id);

		// Fetch and return updated author
		$updated_author = $wpdb->get_row(
			$wpdb->prepare(
				"
            SELECT a.*, 
                   u.display_name as wp_display_name,
                   u.user_email as wp_email
            FROM {$this->authors_tbl} a
            LEFT JOIN {$wpdb->users} u ON a.user_id = u.ID
            WHERE a.author_id = %d
        ",
				$author_id
			)
		);

		if ($updated_author) {
			$updated_author->custom_fields = $this->get_author_custom_fields($author_id);

			// Get abstracts
			$updated_author->abstracts = $wpdb->get_results(
				$wpdb->prepare(
					"
                SELECT abs.abstract_id, abs.title, abs.event_id,
                       aa.author_order, aa.is_corresponding, aa.is_presenter
                FROM {$this->abstract_authors_tbl} aa
                INNER JOIN {$this->abstracts_tbl} abs ON aa.abstract_id = abs.abstract_id
                WHERE aa.author_id = %d
                ORDER BY abs.created DESC
            ",
					$author_id
				)
			);
		}

		return rest_ensure_response($updated_author);
	}

	/**
	 * Delete author
	 * Only if not linked to any abstracts
	 */
	public function delete_author( $req ) {
		global $wpdb;
		$author_id = intval($req->get_param('id'));

		// Check author exists
		$author = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->authors_tbl} WHERE author_id = %d",
				$author_id
			)
		);

		if ( ! $author) {
			return new WP_Error('author_not_found', 'Author not found', array( 'status' => 404 ));
		}

		// Check if author is linked to any abstracts
		$abstract_count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->abstract_authors_tbl} WHERE author_id = %d",
				$author_id
			)
		);

		if ($abstract_count > 0) {
			return new WP_Error(
				'author_in_use',
				"Cannot delete author. They are linked to {$abstract_count} abstract(s).",
				array( 'status' => 400 )
			);
		}

		// Delete custom field values
		$wpdb->delete(
			$this->custom_values_tbl,
			array( 'entity_id' => $author_id, 'entity_type' => 'author' )
		);

		// Delete author
		$wpdb->delete($this->authors_tbl, array( 'author_id' => $author_id ));

		do_action('simplyconf_author_deleted', $author_id);

		return rest_ensure_response(array( 'success' => true, 'author_id' => $author_id ));
	}

	/**
	 * Get author's abstracts with details
	 */
	public function get_author_abstracts( $req ) {
		global $wpdb;
		$author_id = intval($req->get_param('id'));

		$abstracts = $wpdb->get_results(
			$wpdb->prepare(
				"
            SELECT abs.*, 
                   aa.author_order, 
                   aa.is_corresponding, 
                   aa.is_presenter,
                   e.name as event_name
            FROM {$this->abstract_authors_tbl} aa
            INNER JOIN {$this->abstracts_tbl} abs ON aa.abstract_id = abs.abstract_id
            LEFT JOIN {$wpdb->prefix}simplyconf_events e ON abs.event_id = e.event_id
            WHERE aa.author_id = %d
            ORDER BY abs.created DESC
        ",
				$author_id
			)
		);

		return rest_ensure_response($abstracts);
	}

	/**
	 * Manually link author to WordPress user
	 */
	public function link_author_to_user( $req ) {
		global $wpdb;
		$author_id = intval($req->get_param('id'));

		// Get author
		$author = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->authors_tbl} WHERE author_id = %d",
				$author_id
			)
		);

		if ( ! $author) {
			return new WP_Error('author_not_found', 'Author not found', array( 'status' => 404 ));
		}

		// Find WordPress user by email
		$user = get_user_by('email', $author->email);

		if ( ! $user) {
			return new WP_Error(
				'user_not_found',
				'No WordPress user found with email: ' . $author->email,
				array( 'status' => 404 )
			);
		}

		// Link author to user
		$wpdb->update(
			$this->authors_tbl,
			array( 'user_id' => $user->ID, 'modified' => current_time('mysql') ),
			array( 'author_id' => $author_id )
		);

		do_action('simplyconf_author_linked', $author_id, $user->ID);

		return rest_ensure_response(
			array(
				'success'           => true,
				'author_id'         => $author_id,
				'user_id'           => $user->ID,
				'user_display_name' => $user->display_name,
			)
		);
	}

	/**
	 * Search authors by email (for duplicate checking)
	 */
	public function search_authors( $req ) {
		global $wpdb;
		$email = $req->get_param('email');

		if (empty($email)) {
			return new WP_Error('missing_email', 'Email parameter is required', array( 'status' => 400 ));
		}

		$authors = $wpdb->get_results(
			$wpdb->prepare(
				"
            SELECT author_id, first_name, last_name, email, user_id
            FROM {$this->authors_tbl}
            WHERE email = %s
        ",
				$email
			)
		);

		return rest_ensure_response($authors);
	}

	/**
	 * Get custom field values for an author
	 */
	private function get_author_custom_fields( $author_id ) {
		global $wpdb;

		$fields = $wpdb->get_results(
			$wpdb->prepare(
				"
            SELECT cf.field_id, cf.name, cf.label, cf.type, cf.required,
                   cv.value
            FROM {$this->custom_values_tbl} cv
            INNER JOIN {$this->custom_fields_tbl} cf ON cv.field_id = cf.field_id
            WHERE cv.entity_id = %d AND cv.entity_type = 'author'
            ORDER BY cf.order_num ASC
        ",
				$author_id
			)
		);

		// JSON-decode array values (e.g. checkbox groups stored as JSON strings)
		foreach ($fields as &$field) {
			$decoded = json_decode($field->value, true);
			if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
				$field->value = $decoded;
			}
		}

		return $fields;
	}

	/**
	 * Save custom field values for an author
	 * @param integer $author_id
	 * @param array   $custom_fields Array of ['field_id' => value]
	 */
	private function save_author_custom_fields( $author_id, $custom_fields ) {
		global $wpdb;

		$custom_fields = simplyconf_normalize_custom_fields($custom_fields);
		foreach ($custom_fields as $field_id => $value) {
			// JSON-encode array values (e.g. checkbox groups) to match the
			// encoding done in simplyconf_create_abstract / simplyconf_update_abstract
			$stored_value = is_array($value) ? json_encode($value) : $value;

			// Check if value exists
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"
                SELECT id FROM {$this->custom_values_tbl}
                WHERE entity_id = %d AND entity_type = 'author' AND field_id = %d
            ",
					$author_id,
					$field_id
				)
			);

			if ($exists) {
				// Update existing value
				$wpdb->update(
					$this->custom_values_tbl,
					array( 'value' => $stored_value ),
					array( 'id' => $exists )
				);
			} else {
				// Insert new value
				$wpdb->insert(
					$this->custom_values_tbl,
					array(
						'field_id'    => $field_id,
						'entity_id'   => $author_id,
						'entity_type' => 'author',
						'value'       => $stored_value,
					)
				);
			}
		}
	}
}

new SimplyConf_Author_Routes();
