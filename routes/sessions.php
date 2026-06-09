<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Custom REST API Endpoints for Session CRUD
 */
class SimplyConf_Session_Routes {

	public $sessions_tbl;
	public $abstracts_tbl;

	public function __construct() {
		global $wpdb;
		$this->sessions_tbl  = SimplyConf_DB::get_table('sessions');
		$this->abstracts_tbl = SimplyConf_DB::get_table('abstracts');
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		register_rest_route(
			'simplyconf/v1',
			'/sessions',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_sessions' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/sessions/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_session' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/sessions',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_session' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/sessions/(?P<id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_session' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/sessions/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_session' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/sessions/(?P<id>\d+)/abstracts',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'assign_abstracts' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/sessions/conflicts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'check_conflicts' ),
				'permission_callback' => array( $this, 'get_permission' ),
			)
		);
	}

	public function get_permission( $request ) {
		$is_authenticated = is_user_logged_in() && current_user_can('manage_options');
		return apply_filters('simplyconf_permission_check', $is_authenticated, 'sessions');
	}

	public function get_sessions( $req ) {
		global $wpdb;
		$event_id = $req->get_param('event_id');
		$track_id = $req->get_param('track_id');
		$where    = array();
		if ($event_id) {
$where[] = $wpdb->prepare('s.event_id = %d', $event_id);
		}
		if ($track_id) {
$where[] = $wpdb->prepare('s.track_id = %d', $track_id);
		}
		$where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

		// Get sessions
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from internal constant; $where_sql fragments built with $wpdb->prepare().
		$sessions = $wpdb->get_results("SELECT s.* FROM {$this->sessions_tbl} s $where_sql ORDER BY s.`order`, s.start_time, s.name");

		// For each session, get assigned abstracts
		foreach ($sessions as $session) {
			$abstracts          = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT abstract_id, title, status FROM {$this->abstracts_tbl} WHERE session_id = %d",
					$session->session_id
				)
			);
			$session->abstracts = $abstracts;
		}

		return rest_ensure_response($sessions);
	}

	public function get_session( $req ) {
		global $wpdb;
		$id      = intval($req->get_param('id'));
		$session = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->sessions_tbl} WHERE session_id = %d", $id));
		if ( ! $session) {
			return new WP_Error('invalid_session_id', 'Could not locate session id', array( 'status' => 404 ));
		}
		return rest_ensure_response($session);
	}

	public function create_session( $req ) {
		global $wpdb;
		$payload             = $req->get_json_params();
		$payload['created']  = current_time('mysql');
		$payload['modified'] = current_time('mysql');
		$wpdb->insert($this->sessions_tbl, $payload);
		$session_id = $wpdb->insert_id;
		$session  = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->sessions_tbl} WHERE session_id = %d", $session_id));
		$response = rest_ensure_response($session);
		$response->set_status(201);
		return $response;
	}

	public function update_session( $req ) {
		global $wpdb;
		$payload             = $req->get_json_params();
		$payload['modified'] = current_time('mysql');
		$id                  = intval($req->get_param('id'));
		$wpdb->update($this->sessions_tbl, $payload, array( 'session_id' => $id ));
		$session = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->sessions_tbl} WHERE session_id = %d", $id));
		return rest_ensure_response($session);
	}

	public function delete_session( $req ) {
		global $wpdb;
		$id = intval($req->get_param('id'));

		// Clear session_id from abstracts
		$wpdb->update(
			$this->abstracts_tbl,
			array( 'session_id' => null ),
			array( 'session_id' => $id )
		);

		// Delete session
		$wpdb->delete($this->sessions_tbl, array( 'session_id' => $id ));
		return rest_ensure_response(array( 'id' => $id ));
	}

	public function assign_abstracts( $req ) {
		global $wpdb;
		$session_id   = intval($req->get_param('id'));
		$payload      = $req->get_json_params();
		$abstract_ids = isset($payload['abstract_ids']) ? $payload['abstract_ids'] : array();

		// First, clear existing assignments for this session
		$wpdb->update(
			$this->abstracts_tbl,
			array( 'session_id' => null ),
			array( 'session_id' => $session_id )
		);

		// Assign new abstracts
		if ( ! empty($abstract_ids)) {
			foreach ($abstract_ids as $abstract_id) {
				$wpdb->update(
					$this->abstracts_tbl,
					array( 'session_id' => $session_id ),
					array( 'abstract_id' => intval($abstract_id) )
				);
			}
		}

		return rest_ensure_response(array( 'success' => true, 'assigned' => count($abstract_ids) ));
	}

	public function check_conflicts( $req ) {
		global $wpdb;
		$event_id           = intval($req->get_param('event_id'));
		$start_time         = $req->get_param('start_time');
		$end_time           = $req->get_param('end_time');
		$track_id           = $req->get_param('track_id');
		$exclude_session_id = $req->get_param('exclude_session_id');

		$query  = "SELECT * FROM {$this->sessions_tbl} WHERE event_id = %d";
		$params = array( $event_id );

		// Check for time overlap
		$query   .= ' AND (
            (start_time < %s AND end_time > %s) OR
            (start_time < %s AND end_time > %s) OR
            (start_time >= %s AND end_time <= %s)
        )';
		$params[] = $end_time;
		$params[] = $start_time;
		$params[] = $end_time;
		$params[] = $start_time;
		$params[] = $start_time;
		$params[] = $end_time;

		// Optional track filter
		if ($track_id) {
			$query   .= ' AND track_id = %d';
			$params[] = intval($track_id);
		}

		// Exclude current session
		if ($exclude_session_id) {
			$query   .= ' AND session_id != %d';
			$params[] = intval($exclude_session_id);
		}

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- $query built with %s/%d placeholders and passed to $wpdb->prepare(); table name from internal class property.
		$conflicts = $wpdb->get_results($wpdb->prepare($query, $params));
		return rest_ensure_response($conflicts);
	}
}
new SimplyConf_Session_Routes();
