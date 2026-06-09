<?php

/**
 * License REST API Routes
 *
 * @package SimplyConf
 * @since 3.0.0
 */

if ( ! defined('ABSPATH')) {
	exit;
}

/**
 * Register license REST API routes
 */
add_action(
	'rest_api_init',
	function () {

	// Activate license
	register_rest_route(
		'simplyconf/v1',
		'/licenses/activate',
		array(
			'methods'             => 'POST',
			'callback'            => 'simplyconf_rest_activate_license',
			'permission_callback' => function () {
				if ( simplyconf_is_saas() ) {
					return false;
				}
				return current_user_can('manage_options');
			},
			'args'                => array(
				'addon'       => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_key',
					'validate_callback' => function ( $param ) {
						return in_array($param, array( 'reviews', 'emails', 'schedules', 'payments', 'exports' ));
					},
				),
				'license_key' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		)
	);

	// Deactivate license
	register_rest_route(
		'simplyconf/v1',
		'/licenses/deactivate',
		array(
			'methods'             => 'POST',
			'callback'            => 'simplyconf_rest_deactivate_license',
			'permission_callback' => function () {
				if ( simplyconf_is_saas() ) {
					return false;
				}
				return current_user_can('manage_options');
			},
			'args'                => array(
				'addon' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_key',
					'validate_callback' => function ( $param ) {
						return in_array($param, array( 'reviews', 'emails', 'schedules', 'payments', 'exports' ));
					},
				),
			),
		)
	);

	// Get license status
	register_rest_route(
		'simplyconf/v1',
		'/licenses/status',
		array(
			'methods'             => 'GET',
			'callback'            => 'simplyconf_rest_get_license_status',
			'permission_callback' => function () {
				if ( simplyconf_is_saas() ) {
					return false;
				}
				return current_user_can('manage_options');
			},
			'args'                => array(
				'addon' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_key',
					'validate_callback' => function ( $param ) {
						return in_array($param, array( 'reviews', 'emails', 'schedules', 'payments', 'exports' ));
					},
				),
			),
		)
	);

	// Validate license (force refresh)
	register_rest_route(
		'simplyconf/v1',
		'/licenses/validate',
		array(
			'methods'             => 'POST',
			'callback'            => 'simplyconf_rest_validate_license',
			'permission_callback' => function () {
				if ( simplyconf_is_saas() ) {
					return false;
				}
				return current_user_can('manage_options');
			},
			'args'                => array(
				'addon' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_key',
					'validate_callback' => function ( $param ) {
						return in_array($param, array( 'reviews', 'emails', 'schedules', 'payments', 'exports' ));
					},
				),
			),
		)
	);

	// Get all licenses status
	register_rest_route(
		'simplyconf/v1',
		'/licenses/all',
		array(
			'methods'             => 'GET',
			'callback'            => 'simplyconf_rest_get_all_licenses',
			'permission_callback' => function () {
				if ( simplyconf_is_saas() ) {
					return false;
				}
				return current_user_can('manage_options');
			},
		)
	);
	}
);

/**
 * Activate license endpoint
 */
function simplyconf_rest_activate_license( $request ) {
	$addon       = $request->get_param('addon');
	$license_key = $request->get_param('license_key');
	$event_id    = $request->get_param('event_id') ?: 0; // Default to global

	$result = SimplyConf_License_Manager::activate_license($addon, $license_key, $event_id);

	if ($result['success']) {
		return new WP_REST_Response($result, 200);
	} else {
		return new WP_REST_Response($result, 400);
	}
}

/**
 * Deactivate license endpoint
 */
function simplyconf_rest_deactivate_license( $request ) {
	$addon    = $request->get_param('addon');
	$event_id = $request->get_param('event_id') ?: 0;

	$result = SimplyConf_License_Manager::deactivate_license($addon, $event_id);

	return new WP_REST_Response($result, 200);
}

/**
 * Get license status endpoint
 */
function simplyconf_rest_get_license_status( $request ) {
	$addon    = $request->get_param('addon');
	$event_id = $request->get_param('event_id') ?: 0;

	$status = SimplyConf_License_Manager::get_license_status($addon, $event_id);

	return new WP_REST_Response($status, 200);
}

/**
 * Validate license endpoint (force refresh)
 */
function simplyconf_rest_validate_license( $request ) {
	$addon    = $request->get_param('addon');
	$event_id = $request->get_param('event_id') ?: 0;

	$result = SimplyConf_License_Manager::validate_license($addon, true, $event_id);

	return new WP_REST_Response($result, 200);
}

/**
 * Get all licenses status endpoint
 */
function simplyconf_rest_get_all_licenses( $request ) {
	// Use get_all_addons_for_licensing() to show ALL addons regardless of feature flag status
	$registered_addons = SimplyConf_License_Manager::get_all_addons_for_licensing();
	$licenses = array();

	foreach ($registered_addons as $addon_slug => $addon_info) {
		$status = SimplyConf_License_Manager::get_license_status($addon_slug, 0);
		$key = SimplyConf_License_Manager::get_license_key($addon_slug, 0);
		
		// Get license data from options if available
		$license_data = get_option('simplyconf_license_data_' . $addon_slug, array());
		
		$licenses[ $addon_slug ] = array(
			'addon'        => isset($addon_info['item_name']) ? $addon_info['item_name'] : ucfirst($addon_slug),
			'has_license'  => !empty($key),
			'license_key'  => $key ? substr($key, 0, 8) . '...' . substr($key, -4) : null, // Masked for security
			'status'       => $status ? $status : 'inactive',
			'expires'      => isset($license_data['expires']) ? $license_data['expires'] : null,
			'activations'  => isset($license_data['site_count']) ? $license_data['site_count'] : 0,
			'max_activations' => isset($license_data['license_limit']) ? $license_data['license_limit'] : 1,
			'activated_at' => isset($license_data['activated_at']) ? $license_data['activated_at'] : null,
			'last_checked' => isset($license_data['last_checked']) ? $license_data['last_checked'] : null,
		);
	}

	return new WP_REST_Response(
		array(
			'success'  => true,
			'licenses' => $licenses,
		),
		200
	);
}
