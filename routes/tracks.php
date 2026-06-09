<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Custom REST API Endpoints for Track CRUD
 */
class SimplyConf_Track_Routes {

	public $tracks_tbl;

	public function __construct() {
		$this->tracks_tbl = SimplyConf_DB::get_table('tracks');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		register_rest_route(
			'simplyconf/v1',
			'/tracks',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_tracks' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/tracks/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_track' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/tracks',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_track' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/tracks/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_track' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/tracks/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_track' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);

	}

	public function get_permission( $request ) {
		$is_authenticated = is_user_logged_in();
		return apply_filters('simplyconf_permission_check', $is_authenticated, 'tracks');
	}

	public function get_tracks( $req ) {
		global $wpdb;
		$event_id = $req->get_param('event_id');
		$where    = $event_id ? $wpdb->prepare('WHERE event_id = %d', $event_id) : '';
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from internal constant; $where built with $wpdb->prepare().
		$tracks   = $wpdb->get_results("SELECT * FROM {$this->tracks_tbl} $where ORDER BY `order`, name");
		return rest_ensure_response($tracks);
	}

	public function get_track( $req ) {
		global $wpdb;
		$id    = intval($req->get_param('id'));
		$track = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->tracks_tbl} WHERE track_id = %d", $id));
		if ( ! $track) {
			return new WP_Error('invalid_track_id', 'Could not locate track id', array( 'status' => 404 ));
		}
		return rest_ensure_response($track);
	}

	public function create_track( $req ) {
		global $wpdb;
		$payload        = $req->get_json_params();
		$allowed_fields = array( 'event_id', 'name', 'description', 'color', 'order', 'chairs' );
		$data           = array( 'created' => current_time('mysql') );
		foreach ($allowed_fields as $field) {
			if (array_key_exists($field, $payload)) {
				$data[ $field ] = is_int($payload[ $field ]) ? intval($payload[ $field ]) : sanitize_text_field($payload[ $field ]);
			}
		}
		$wpdb->insert($this->tracks_tbl, $data);
		$track_id = $wpdb->insert_id;
		$track    = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->tracks_tbl} WHERE track_id = %d", $track_id));
		$response = rest_ensure_response($track);
		$response->set_status(201);
		return $response;
	}

	public function update_track( $req ) {
		global $wpdb;
		$payload        = $req->get_json_params();
		$id             = intval($req->get_param('id'));
		$allowed_fields = array( 'name', 'description', 'color', 'order', 'chairs' );
		$data           = array( 'modified' => current_time('mysql') );
		foreach ($allowed_fields as $field) {
			if (array_key_exists($field, $payload)) {
				$data[ $field ] = is_int($payload[ $field ]) ? intval($payload[ $field ]) : sanitize_text_field($payload[ $field ]);
			}
		}
		$wpdb->update($this->tracks_tbl, $data, array( 'track_id' => $id ));
		$track = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->tracks_tbl} WHERE track_id = %d", $id));
		return rest_ensure_response($track);
	}

	public function delete_track( $req ) {
		global $wpdb;
		$id = intval($req->get_param('id'));
		$wpdb->delete($this->tracks_tbl, array( 'track_id' => $id ));
		return rest_ensure_response(array( 'id' => $id ));
	}

}
new SimplyConf_Track_Routes();
