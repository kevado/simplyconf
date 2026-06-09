<?php
/**
 * SimplyConf Feature Registry
 *
 * Central registry for all available features and their configurations.
 * Defines which features are available and which plans they belong to.
 *
 * @package SimplyConf
 * @since 1.0.0
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

class SimplyConf_Feature_Registry {

	/**
	 * Feature definitions
	 *
	 * @var array
	 */
	private static $features = array(
		'reviews' => array(
			'name'        => 'Reviews & Peer Review',
			'description' => 'Advanced review management system with peer review workflows',
			'addon_slug'  => 'reviews',
			'plans'       => array( 'starter', 'professional', 'premium' ),
		),
		'emails' => array(
			'name'        => 'Email Automation',
			'description' => 'Automated email triggers and customizable templates',
			'addon_slug'  => 'emails',
			'plans'       => array( 'starter', 'professional', 'premium' ),
		),
		'payments' => array(
			'name'        => 'Payment Processing',
			'description' => 'Registration fees and payment gateway integration',
			'addon_slug'  => 'payments',
			'plans'       => array( 'professional', 'premium' ),
		),
		'schedules' => array(
			'name'        => 'Schedule Builder',
			'description' => 'Conference schedule management and session planning',
			'addon_slug'  => 'schedules',
			'plans'       => array( 'professional', 'premium' ),
		),
		'exports' => array(
			'name'        => 'Advanced Exports',
			'description' => 'Abstract books and conference program exports',
			'addon_slug'  => 'exports',
			'plans'       => array( 'professional', 'premium' ),
		),
	);

	/**
	 * Get all registered features
	 *
	 * @return array
	 */
	public static function get_all_features() {
		return apply_filters( 'simplyconf_features', self::$features );
	}

	/**
	 * Get a specific feature by slug
	 *
	 * @param string $slug Feature slug.
	 * @return array|null Feature data or null if not found.
	 */
	public static function get_feature( $slug ) {
		$features = self::get_all_features();
		return isset( $features[ $slug ] ) ? $features[ $slug ] : null;
	}

	/**
	 * Check if a feature exists
	 *
	 * @param string $slug Feature slug.
	 * @return bool
	 */
	public static function feature_exists( $slug ) {
		$features = self::get_all_features();
		return isset( $features[ $slug ] );
	}

	/**
	 * Get features available for a specific plan
	 *
	 * @param string $plan_slug Plan slug (e.g., 'pro', 'enterprise').
	 * @return array Array of feature slugs.
	 */
	public static function get_features_for_plan( $plan_slug ) {
		$features = self::get_all_features();
		$plan_features = array();

		foreach ( $features as $slug => $data ) {
			if ( in_array( $plan_slug, $data['plans'] ?? array() ) ) {
				$plan_features[] = $slug;
			}
		}

		return $plan_features;
	}

	/**
	 * Get addon slug for a feature
	 *
	 * @param string $feature_slug Feature slug.
	 * @return string|null Addon slug or null.
	 */
	public static function get_addon_slug( $feature_slug ) {
		$feature = self::get_feature( $feature_slug );
		return $feature['addon_slug'] ?? null;
	}
}
