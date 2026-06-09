<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * File Upload and Attachment Management REST API Routes
 */
class SimplyConf_Attachment_Routes {

	public $attachments_tbl;
	public $file_logs_tbl;

	public function __construct() {
		global $wpdb;
		$this->attachments_tbl = SimplyConf_DB::get_table('attachments');
		$this->file_logs_tbl   = SimplyConf_DB::get_table('file_logs');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		// Get attachments for an entity or event (admin query)
		register_rest_route(
			'simplyconf/v1',
			'/attachments',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_attachments' ),
				'permission_callback' => array( $this, 'get_permission' ),
				'args'                => array(
					'entity_type' => array(
						'required'          => false,
						'validate_callback' => function ( $param ) {
							return $param === null || in_array($param, array( 'abstract', 'review', 'user', 'event' ));
						},
					),
					'entity_id'   => array(
						'required'          => false,
						'validate_callback' => function ( $param ) {
							return $param === null || is_numeric($param);
						},
					),
					'event_id'    => array(
						'required'          => false,
						'validate_callback' => function ( $param ) {
							return $param === null || is_numeric($param);
						},
					),
				),
			)
		);

		// Upload file
		register_rest_route(
			'simplyconf/v1',
			'/attachments/upload',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'upload_file' ),
				'permission_callback' => array( $this, 'upload_permission' ),
			)
		);

		// Get single attachment by ID
		register_rest_route(
			'simplyconf/v1',
			'/attachments/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_attachment' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

		// Download file
		register_rest_route(
			'simplyconf/v1',
			'/attachments/(?P<id>\d+)/download',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'download_file' ),
				'permission_callback' => array( $this, 'download_permission' ),
			)
		);

		// Delete attachment
		register_rest_route(
			'simplyconf/v1',
			'/attachments/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_attachment' ),
				'permission_callback' => array( $this, 'delete_permission' ),
			)
		);

		// Update attachment metadata
		register_rest_route(
			'simplyconf/v1',
			'/attachments/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_attachment' ),
				'permission_callback' => array( $this, 'update_permission' ),
			)
		);
	}

	public function get_permission( $request ) {
		$is_authenticated = is_user_logged_in();
		return apply_filters('simplyconf_permission_check', $is_authenticated, 'attachments');
	}

	public function upload_permission( $request ) {
		// Allow any logged-in user to upload files for their abstracts
		// Admin capability check is handled separately if needed
		return is_user_logged_in();
	}

	public function download_permission( $request ) {
		return is_user_logged_in();
	}

	public function delete_permission() {
		// Ownership is verified inside the callback via can_delete_file()
		return is_user_logged_in();
	}

	public function update_permission() {
		// Ownership is verified inside the callback via can_edit_file()
		return is_user_logged_in();
	}

	/**
	 * Get attachments for an entity or event (admin query)
	 */
	public function get_attachments( $request ) {
		global $wpdb;

		$entity_type = sanitize_text_field($request->get_param('entity_type'));
		$entity_id   = intval($request->get_param('entity_id'));
		$event_id    = intval($request->get_param('event_id'));

		// Build WHERE clause based on provided parameters
		$where_clauses = array();
		$params        = array();

		// Admin can query all attachments for an event
		if ($event_id && ! $entity_type && ! $entity_id && current_user_can('manage_options')) {
			$where_clauses[] = 'event_id = %d';
			$params[]        = $event_id;
		}
		// Regular entity-specific query
		elseif ($entity_type && $entity_id) {
			$where_clauses[] = 'entity_type = %s';
			$where_clauses[] = 'entity_id = %d';
			$params[]        = $entity_type;
			$params[]        = $entity_id;

			if ($event_id) {
				$where_clauses[] = 'event_id = %d';
				$params[]        = $event_id;
			}
		} else {
			return new WP_Error('invalid_params', 'Invalid parameters provided', array( 'status' => 400 ));
		}

		$where_clause = count($where_clauses) > 0 ? 'WHERE ' . implode(' AND ', $where_clauses) : '';

		$sql = $wpdb->prepare(
			"SELECT a.*, wp.post_title, wp.guid, u.display_name, u.user_email, u.user_login
             FROM {$this->attachments_tbl} a 
             LEFT JOIN {$wpdb->posts} wp ON a.wp_attachment_id = wp.ID 
             LEFT JOIN {$wpdb->users} u ON a.upload_by = u.ID
             {$where_clause} 
             ORDER BY a.created DESC",
			...$params
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- $sql built with $wpdb->prepare(); table names from internal class property.
		$attachments = $wpdb->get_results($sql);

		// Add download URLs and format response
		foreach ($attachments as &$attachment) {
			$attachment->download_url = rest_url("simplyconf/v1/attachments/{$attachment->attachment_id}/download");
			$attachment->file_url     = wp_get_attachment_url($attachment->wp_attachment_id);
			$attachment->metadata     = $attachment->metadata ? json_decode($attachment->metadata, true) : array();
			
			// Add formatted uploader info
			$attachment->uploader = array(
				'id'           => $attachment->upload_by,
				'display_name' => $attachment->display_name ?? __('Unknown User', 'simplyconf'),
				'email'        => $attachment->user_email ?? '',
				'username'     => $attachment->user_login ?? '',
			);
		}

		return rest_ensure_response($attachments);
	}

	/**
	 * Get single attachment by ID
	 */
	public function get_attachment( $request ) {
		global $wpdb;

		$attachment_id = intval($request->get_param('id'));

		$sql = $wpdb->prepare(
			"SELECT a.*, wp.post_title, wp.guid, u.display_name, u.user_email, u.user_login
			 FROM {$this->attachments_tbl} a
			 LEFT JOIN {$wpdb->posts} wp ON a.wp_attachment_id = wp.ID
			 LEFT JOIN {$wpdb->users} u ON a.upload_by = u.ID
			 WHERE a.attachment_id = %d",
			$attachment_id
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- $sql built with $wpdb->prepare(); table names from internal class property.
		$attachment = $wpdb->get_row($sql);

		if ( ! $attachment ) {
			return new WP_Error('not_found', 'Attachment not found', array( 'status' => 404 ));
		}

		$attachment->download_url = rest_url("simplyconf/v1/attachments/{$attachment->attachment_id}/download");
		$attachment->file_url     = wp_get_attachment_url($attachment->wp_attachment_id);
		$attachment->metadata     = $attachment->metadata ? json_decode($attachment->metadata, true) : array();

		$attachment->uploader = array(
			'id'           => $attachment->upload_by,
			'display_name' => $attachment->display_name ?? __('Unknown User', 'simplyconf'),
			'email'        => $attachment->user_email ?? '',
			'username'     => $attachment->user_login ?? '',
		);

		return rest_ensure_response($attachment);
	}

	/**
	 * Upload file
	 */
	public function upload_file( $request ) {
		global $wpdb;

		$files  = $request->get_file_params();
		$params = $request->get_params();

		if (empty($files['file'])) {
			return new WP_Error('no_file', 'No file uploaded', array( 'status' => 400 ));
		}

		$file         = $files['file'];
		$entity_type  = sanitize_text_field($params['entity_type']);
		$entity_id    = intval($params['entity_id']);
		$event_id     = intval($params['event_id']);
		$file_purpose = sanitize_text_field($params['file_purpose'] ?? 'other');
		$access_level = sanitize_text_field($params['access_level'] ?? 'private');

		// Validate file type and size
		$allowed_types = $this->get_allowed_file_types();
		$max_size      = $this->get_max_file_size();

		if ( ! $this->validate_file_type($file, $allowed_types)) {
			return new WP_Error('invalid_file_type', 'File type not allowed', array( 'status' => 400 ));
		}

		if ($file['size'] > $max_size) {
			return new WP_Error('file_too_large', 'File size exceeds limit', array( 'status' => 400 ));
		}

		// Handle WordPress file upload
		if ( ! function_exists('wp_handle_upload')) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}

		$upload_overrides = array(
			'test_form' => false,
		);

		$movefile = wp_handle_upload($file, $upload_overrides);

		if ($movefile && ! isset($movefile['error'])) {
			// Create WordPress attachment
			$attachment = array(
				'guid'           => $movefile['url'],
				'post_mime_type' => $movefile['type'],
				'post_title'     => sanitize_file_name(pathinfo($file['name'], PATHINFO_FILENAME)),
				'post_content'   => '',
				'post_status'    => 'inherit',
			);

			$wp_attachment_id = wp_insert_attachment($attachment, $movefile['file']);

			if ( ! is_wp_error($wp_attachment_id)) {
				// Generate metadata
				if ( ! function_exists('wp_generate_attachment_metadata')) {
					require_once ABSPATH . 'wp-admin/includes/image.php';
				}
				$attach_data = wp_generate_attachment_metadata($wp_attachment_id, $movefile['file']);
				wp_update_attachment_metadata($wp_attachment_id, $attach_data);

				// Insert into our attachments table
				$attachment_data = array(
					'entity_id'        => $entity_id,
					'entity_type'      => $entity_type,
					'event_id'         => $event_id,
					'wp_attachment_id' => $wp_attachment_id,
					'file_name'        => $file['name'],
					'file_type'        => $file['type'],
					'file_size'        => $file['size'],
					'file_category'    => $this->determine_file_category($file['type']),
					'file_purpose'     => $file_purpose,
					'upload_by'        => get_current_user_id(),
					'access_level'     => $access_level,
					'metadata'         => json_encode($attach_data),
					'created'          => current_time('mysql'),
				);

				$result = $wpdb->insert($this->attachments_tbl, $attachment_data);

				if ($result) {
					$attachment_id = $wpdb->insert_id;

					// Log the upload
					$this->log_file_action($attachment_id, 'upload');

					// Return the created attachment
					$new_attachment = $wpdb->get_row(
						$wpdb->prepare(
							"SELECT * FROM {$this->attachments_tbl} WHERE attachment_id = %d",
							$attachment_id
						)
					);

					$new_attachment->download_url = rest_url("simplyconf/v1/attachments/{$attachment_id}/download");
					$new_attachment->file_url     = wp_get_attachment_url($wp_attachment_id);

					return rest_ensure_response($new_attachment);
				}
			}
		}

		return new WP_Error('upload_failed', 'File upload failed', array( 'status' => 500 ));
	}

	/**
	 * Download file
	 */
	public function download_file( $request ) {
		global $wpdb;

		$attachment_id = intval($request->get_param('id'));

		$attachment = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->attachments_tbl} WHERE attachment_id = %d",
				$attachment_id
			)
		);

		if ( ! $attachment) {
			return new WP_Error('not_found', 'Attachment not found', array( 'status' => 404 ));
		}

		// Check permissions
		if ( ! $this->can_access_file($attachment)) {
			return new WP_Error('access_denied', 'Access denied', array( 'status' => 403 ));
		}

		// Log the download
		$this->log_file_action($attachment_id, 'download');

		// Increment download count
		$wpdb->update(
			$this->attachments_tbl,
			array( 'download_count' => $attachment->download_count + 1 ),
			array( 'attachment_id' => $attachment_id )
		);

		// Get file path
		$file_path = get_attached_file($attachment->wp_attachment_id);

		if (file_exists($file_path)) {
			// Set headers for file download
			header('Content-Type: ' . $attachment->file_type);
			header('Content-Disposition: attachment; filename="' . $attachment->file_name . '"');
			header('Content-Length: ' . filesize($file_path));

			readfile($file_path); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile -- WP_Filesystem is not suitable for streaming binary file downloads in a REST API response.
			exit;
		}

		return new WP_Error('file_not_found', 'File not found on server', array( 'status' => 404 ));
	}

	/**
	 * Delete attachment
	 */
	public function delete_attachment( $request ) {
		global $wpdb;

		$attachment_id = intval($request->get_param('id'));

		$attachment = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->attachments_tbl} WHERE attachment_id = %d",
				$attachment_id
			)
		);

		if ( ! $attachment) {
			return new WP_Error('not_found', 'Attachment not found', array( 'status' => 404 ));
		}

		// Check permissions
		if ( ! $this->can_delete_file($attachment)) {
			return new WP_Error('access_denied', 'Access denied', array( 'status' => 403 ));
		}

		// Delete WordPress attachment
		wp_delete_attachment($attachment->wp_attachment_id, true);

		// Delete from our table
		$wpdb->delete($this->attachments_tbl, array( 'attachment_id' => $attachment_id ));

		// Log the deletion
		$this->log_file_action($attachment_id, 'delete');

		return rest_ensure_response(array( 'success' => true ));
	}

	/**
	 * Update attachment metadata
	 */
	public function update_attachment( $request ) {
		global $wpdb;

		$attachment_id = intval($request->get_param('id'));
		$params        = $request->get_json_params();

		$attachment = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->attachments_tbl} WHERE attachment_id = %d",
				$attachment_id
			)
		);

		if ( ! $attachment) {
			return new WP_Error('not_found', 'Attachment not found', array( 'status' => 404 ));
		}

		// Check permissions
		if ( ! $this->can_edit_file($attachment)) {
			return new WP_Error('access_denied', 'Access denied', array( 'status' => 403 ));
		}

		$update_data = array();

		if (isset($params['file_purpose'])) {
			$update_data['file_purpose'] = sanitize_text_field($params['file_purpose']);
		}

		if (isset($params['access_level'])) {
			$update_data['access_level'] = sanitize_text_field($params['access_level']);
		}

		if (isset($params['metadata'])) {
			$update_data['metadata'] = json_encode($params['metadata']);
		}

		if ( ! empty($update_data)) {
			$update_data['modified'] = current_time('mysql');
			$wpdb->update($this->attachments_tbl, $update_data, array( 'attachment_id' => $attachment_id ));
		}

		return rest_ensure_response(array( 'success' => true ));
	}

	/**
	 * Helper methods
	 */
	private function get_allowed_file_types() {
		return apply_filters(
			'simplyconf_allowed_file_types',
			array(
				'pdf'  => 'application/pdf',
				'doc'  => 'application/msword',
				'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'xls'  => 'application/vnd.ms-excel',
				'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'ppt'  => 'application/vnd.ms-powerpoint',
				'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'jpg'  => 'image/jpeg',
				'jpeg' => 'image/jpeg',
				'png'  => 'image/png',
				'gif'  => 'image/gif',
				'mp4'  => 'video/mp4',
				'avi'  => 'video/avi',
				'mov'  => 'video/quicktime',
			)
		);
	}

	private function get_max_file_size() {
		return apply_filters('simplyconf_max_file_size', 50 * 1024 * 1024); // 50MB default
	}

	private function validate_file_type( $file, $allowed_types ) {
		$file_type = $file['type'];
		$file_ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

		return in_array($file_type, $allowed_types) || array_key_exists($file_ext, $allowed_types);
	}

	private function determine_file_category( $mime_type ) {
		if (strpos($mime_type, 'image/') === 0) {
return 'image';
		}
		if (strpos($mime_type, 'video/') === 0) {
return 'video';
		}
		if (strpos($mime_type, 'audio/') === 0) {
return 'audio';
		}
		return 'document';
	}

	private function can_access_file( $attachment ) {
		$current_user = wp_get_current_user();

		// Admin can access everything
		if (current_user_can('manage_options')) {
			return true;
		}

		// Check access level
		switch ($attachment->access_level) {
			case 'public':
				return true;
			case 'private':
				// Owner can always access their own files
				if ($current_user->ID == $attachment->upload_by) {
					return true;
				}
				// Reviewers/track chairs can access private files on abstracts for review
				return $this->is_reviewer_for_entity($current_user->ID, $attachment->entity_type, $attachment->entity_id);
			case 'reviewers_only':
				return $this->is_reviewer_for_entity($current_user->ID, $attachment->entity_type, $attachment->entity_id);
			case 'admin_only':
				return current_user_can('manage_options');
			default:
				return false;
		}
	}

	private function can_delete_file( $attachment ) {
		$current_user = wp_get_current_user();

		// Admin or original uploader can always delete
		if (current_user_can('manage_options') || $current_user->ID == $attachment->upload_by) {
			return true;
		}

		// Entity owner can delete attachments on their own entities
		return $this->is_entity_owner($current_user->ID, $attachment->entity_type, $attachment->entity_id);
	}

	private function is_entity_owner( $user_id, $entity_type, $entity_id ) {
		global $wpdb;

		if ($entity_type === 'abstract') {
			$abstracts_tbl = SimplyConf_DB::get_table('abstracts');
			return (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$abstracts_tbl} WHERE abstract_id = %d AND submit_by = %d",
					$entity_id,
					$user_id
				)
			) > 0;
		}

		if ($entity_type === 'user') {
			return (int) $entity_id === $user_id;
		}

		if ($entity_type === 'review') {
			$reviews_tbl = SimplyConf_DB::get_table('reviews');
			return (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$reviews_tbl} WHERE review_id = %d AND reviewer_id = %d",
					$entity_id,
					$user_id
				)
			) > 0;
		}

		return false;
	}

	private function can_edit_file( $attachment ) {
		return $this->can_delete_file($attachment);
	}

	private function is_reviewer_for_entity( $user_id, $entity_type, $entity_id ) {
		global $wpdb;

		if ($entity_type === 'abstract') {
			$event_user_roles_tbl = SimplyConf_DB::get_table('event_user_roles');
			$abstracts_tbl        = SimplyConf_DB::get_table('abstracts');

			// Check if user is the abstract author
			$is_author = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$abstracts_tbl} WHERE abstract_id = %d AND submit_by = %d",
					$entity_id,
					$user_id
				)
			);
			if ($is_author > 0) {
				return true;
			}

			// Check if user is a reviewer or track chair for this abstract's event
			$count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$event_user_roles_tbl} eur
                 JOIN {$abstracts_tbl} a ON eur.event_id = a.event_id
                 WHERE a.abstract_id = %d AND eur.user_id = %d AND eur.role IN ('reviewer', 'track_chair')",
					$entity_id,
					$user_id
				)
			);

			return $count > 0;
		}

		if ($entity_type === 'review') {
			$reviews_tbl          = SimplyConf_DB::get_table('reviews');
			$event_user_roles_tbl = SimplyConf_DB::get_table('event_user_roles');

			// Check if user is the reviewer who submitted this review
			$is_reviewer = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$reviews_tbl} WHERE review_id = %d AND reviewer_id = %d",
					$entity_id,
					$user_id
				)
			);
			if ($is_reviewer > 0) {
				return true;
			}

			// Check if user is a track chair for the review's event
			$is_track_chair = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$event_user_roles_tbl} eur
					 JOIN {$reviews_tbl} r ON eur.event_id = r.event_id
					 WHERE r.review_id = %d AND eur.user_id = %d AND eur.role = 'track_chair'",
					$entity_id,
					$user_id
				)
			);
			if ($is_track_chair > 0) {
				return true;
			}

			return false;
		}

		// For user entity type, allow users to access their own attachments
		if ($entity_type === 'user' && (int) $entity_id === $user_id) {
			return true;
		}

		return false;
	}

	private function log_file_action( $attachment_id, $action ) {
		global $wpdb;

		$wpdb->insert(
			$this->file_logs_tbl,
			array(
				'attachment_id' => $attachment_id,
				'user_id'       => get_current_user_id(),
				'action'        => $action,
				'ip_address'    => sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) ),
				'user_agent'    => sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ?? '' ) ),
				'created'       => current_time('mysql'),
			)
		);
	}
}

new SimplyConf_Attachment_Routes();
