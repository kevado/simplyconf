<?php
/**
 * Feature REST API Routes
 *
 * @package SimplyConf
 * @since 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register feature REST API routes
 */
add_action(
	'rest_api_init',
	function () {

		// Check if a specific feature is enabled
		register_rest_route(
			'simplyconf/v1',
			'/features/check',
			array(
				'methods'             => 'POST',
				'callback'            => 'simplyconf_rest_check_feature',
				'permission_callback' => function () {
					return current_user_can( 'read' );
				},
				'args'                => array(
					'feature' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
						'validate_callback' => function ( $param ) {
							return SimplyConf_Feature_Registry::feature_exists( $param );
						},
					),
				),
			)
		);

		// Get all features with their status
		register_rest_route(
			'simplyconf/v1',
			'/features/list',
			array(
				'methods'             => 'GET',
				'callback'            => 'simplyconf_rest_list_features',
				'permission_callback' => function () {
					return current_user_can( 'read' );
				},
			)
		);

		// Get enabled features (simple array)
		register_rest_route(
			'simplyconf/v1',
			'/features/enabled',
			array(
				'methods'             => 'GET',
				'callback'            => 'simplyconf_rest_get_enabled_features',
				'permission_callback' => function () {
					return current_user_can( 'read' );
				},
			)
		);

		// Admin-only: Manually grant a feature (for testing/support)
		register_rest_route(
			'simplyconf/v1',
			'/features/grant',
			array(
				'methods'             => 'POST',
				'callback'            => 'simplyconf_rest_grant_feature',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'args'                => array(
					'feature' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
					),
					'site_id' => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		// Admin-only: Manually revoke a feature
		register_rest_route(
			'simplyconf/v1',
			'/features/revoke',
			array(
				'methods'             => 'POST',
				'callback'            => 'simplyconf_rest_revoke_feature',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'args'                => array(
					'feature' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
					),
					'site_id' => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
	}
);

/**
 * Check if a feature is enabled
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response
 */
function simplyconf_rest_check_feature( $request ) {
	$feature = $request->get_param( 'feature' );
	$manager = SimplyConf_Feature_Manager::instance();

	return new WP_REST_Response(
		array(
			'has_access' => $manager->has_feature( $feature ),
			'feature'    => $feature,
		),
		200
	);
}

/**
 * Get all features with their status
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response
 */
function simplyconf_rest_list_features( $request ) {
	$manager = SimplyConf_Feature_Manager::instance();
	$features = $manager->get_features_with_details();

	return new WP_REST_Response(
		array(
			'features' => $features,
			'is_saas'  => simplyconf_is_saas(),
		),
		200
	);
}

/**
 * Get enabled features (simple array)
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response
 */
function simplyconf_rest_get_enabled_features( $request ) {
	$manager = SimplyConf_Feature_Manager::instance();
	$enabled_features = $manager->get_enabled_features();

	return new WP_REST_Response(
		array(
			'success'  => true,
			'features' => $enabled_features,
		),
		200
	);
}

/**
 * Manually grant a feature (admin only)
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response
 */
function simplyconf_rest_grant_feature( $request ) {
	$feature = $request->get_param( 'feature' );
	$site_id = $request->get_param( 'site_id' ) ?: get_current_blog_id();

	if ( ! SimplyConf_Feature_Registry::feature_exists( $feature ) ) {
		return new WP_REST_Response(
			array(
				'success' => false,
				'message' => __( 'Invalid feature slug', 'simplyconf' ),
			),
			400
		);
	}

	$manager = SimplyConf_Feature_Manager::instance();
	$result = $manager->grant_feature( $site_id, $feature, 'manual' );

	return new WP_REST_Response(
		array(
			'success' => $result,
			'message' => $result
				? __( 'Feature granted successfully', 'simplyconf' )
				: __( 'Failed to grant feature', 'simplyconf' ),
		),
		$result ? 200 : 500
	);
}

/**
 * Manually revoke a feature (admin only)
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response
 */
function simplyconf_rest_revoke_feature( $request ) {
	$feature = $request->get_param( 'feature' );
	$site_id = $request->get_param( 'site_id' ) ?: get_current_blog_id();

	$manager = SimplyConf_Feature_Manager::instance();
	$result = $manager->revoke_feature( $site_id, $feature );

	return new WP_REST_Response(
		array(
			'success' => $result,
			'message' => $result
				? __( 'Feature revoked successfully', 'simplyconf' )
				: __( 'Failed to revoke feature', 'simplyconf' ),
		),
		$result ? 200 : 500
	);
}
