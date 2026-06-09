<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
/**
 * Dashboard Setup REST API Routes
 * Endpoints for creating and managing the dashboard page
 */

add_action('rest_api_init', 'simplyconf_register_dashboard_setup_routes');

function simplyconf_register_dashboard_setup_routes() {
	// Get dashboard status
	register_rest_route(
		'simplyconf/v1',
		'/dashboard-setup/status',
		array(
			'methods'             => 'GET',
			'callback'            => 'simplyconf_dashboard_setup_status',
			'permission_callback' => function () {
				return current_user_can('manage_options');
			},
			'args'                => array(
				'event_id' => array(
					'required'          => false,
					'default'           => 1,
					'validate_callback' => function ($param) {
						return is_numeric($param) && $param > 0;
					},
				),
			),
		)
	);

	// Create dashboard page
	register_rest_route(
		'simplyconf/v1',
		'/dashboard-setup/create',
		array(
			'methods'             => 'POST',
			'callback'            => 'simplyconf_dashboard_setup_create',
			'permission_callback' => function () {
				return current_user_can('manage_options');
			},
			'args'                => array(
				'event_id' => array(
					'required'          => false,
					'default'           => 1,
					'validate_callback' => function ($param) {
						return is_numeric($param) && $param > 0;
					},
				),
			),
		)
	);

	// Delete dashboard page
	register_rest_route(
		'simplyconf/v1',
		'/dashboard-setup/delete',
		array(
			'methods'             => 'DELETE',
			'callback'            => 'simplyconf_dashboard_setup_delete',
			'permission_callback' => function () {
				return current_user_can('manage_options');
			},
			'args'                => array(
				'event_id' => array(
					'required'          => false,
					'default'           => 1,
					'validate_callback' => function ($param) {
						return is_numeric($param) && $param > 0;
					},
				),
			),
		)
	);
}

/**
 * Get dashboard page status
 *
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response Response object
 */
function simplyconf_dashboard_setup_status( $request ) {
	$event_id = $request->get_param('event_id') ?: 1;
	$status = SimplyConf_Dashboard_Setup::get_status($event_id);
	
	return new WP_REST_Response($status, 200);
}

/**
 * Create dashboard page
 *
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response Response object
 */
function simplyconf_dashboard_setup_create( $request ) {
	$event_id = $request->get_param('event_id') ?: 1;
	$result = SimplyConf_Dashboard_Setup::create_dashboard_page($event_id);
	
	$status_code = $result['success'] ? 200 : 400;
	
	return new WP_REST_Response($result, $status_code);
}

/**
 * Delete dashboard page
 *
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response Response object
 */
function simplyconf_dashboard_setup_delete( $request ) {
	$event_id = $request->get_param('event_id') ?: 1;
	$result = SimplyConf_Dashboard_Setup::delete_dashboard_page($event_id);
	
	$status_code = $result['success'] ? 200 : 400;
	
	return new WP_REST_Response($result, $status_code);
}
