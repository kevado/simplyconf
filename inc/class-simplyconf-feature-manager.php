<?php
/**
 * SimplyConf Feature Manager
 *
 * Secure feature flag management system with multi-layer validation.
 * Prevents bypassing by checking database records, not just constants.
 *
 * @package SimplyConf
 * @since 1.0.0
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

class SimplyConf_Feature_Manager {

	/**
	 * The single instance of the class.
	 *
	 * @var SimplyConf_Feature_Manager
	 */
	private static $instance = null;

	/**
	 * Per-request cache for feature checks
	 *
	 * @var array
	 */
	private $cache = array();

	/**
	 * Get the singleton instance.
	 *
	 * @return SimplyConf_Feature_Manager
	 */
	public static function instance() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Private constructor to prevent direct instantiation.
	 */
	private function __construct() {
		// Use instance() method instead
	}

	/**
	 * Check if a feature is enabled for current site
	 * This is the ONLY method that should be used to check features
	 *
	 * @param string $feature_slug Feature slug to check.
	 * @return bool True if feature is enabled, false otherwise.
	 */
	public function has_feature( $feature_slug ) {
		// Validate feature exists in registry
		if ( ! SimplyConf_Feature_Registry::feature_exists( $feature_slug ) ) {
			$this->log_access_attempt( $feature_slug, 'invalid_feature' );
			return false;
		}

		// Check cache first (per-request cache only)
		$cache_key = $this->get_cache_key( $feature_slug );
		if ( isset( $this->cache[ $cache_key ] ) ) {
			return $this->cache[ $cache_key ];
		}

		$has_access = false;

		// Multi-layer validation
		if ( simplyconf_is_saas() ) {
			// SaaS mode: Check subscription plan
			$has_access = $this->validate_saas_feature( $feature_slug );
		} else {
			// Self-hosted: Check license
			$has_access = $this->validate_license_feature( $feature_slug );
		}

		// CRITICAL: Verify against database record
		// This prevents bypassing by simply setting SIMPLYCONF_SAAS_MODE
		$has_access = $has_access && $this->verify_database_flag( $feature_slug );

		// Cache result
		$this->cache[ $cache_key ] = $has_access;

		// Log access attempt
		$this->log_access_attempt( $feature_slug, $has_access ? 'granted' : 'denied' );

		return $has_access;
	}

	/**
	 * Validate feature access for SaaS customers
	 *
	 * @param string $feature_slug Feature slug.
	 * @return bool True if customer's plan includes feature.
	 */
	private function validate_saas_feature( $feature_slug ) {
		// Only works in true multisite SaaS environment
		if ( ! is_multisite() ) {
			return false;
		}

		// Check if WP Ultimo is active
		if ( ! function_exists( 'wu_get_current_site' ) ) {
			return false;
		}

		try {
			$site = wu_get_current_site();
			if ( ! $site ) {
				return false;
			}

			$plan = $site->get_plan();
			if ( ! $plan ) {
				return false;
			}

			// Check if plan includes this feature
			$feature = SimplyConf_Feature_Registry::get_feature( $feature_slug );
			$plan_slug = $plan->get_slug();

			return in_array( $plan_slug, $feature['plans'] ?? array() );

		} catch ( Exception $e ) {
			error_log( 'SimplyConf Feature Manager: ' . $e->getMessage() );
			return false;
		}
	}

	/**
	 * Validate feature access via license (self-hosted)
	 *
	 * @param string $feature_slug Feature slug.
	 * @return bool True if valid license exists.
	 */
	private function validate_license_feature( $feature_slug ) {
		$feature = SimplyConf_Feature_Registry::get_feature( $feature_slug );
		$addon_slug = $feature['addon_slug'] ?? null;

		if ( ! $addon_slug ) {
			return false;
		}

		// Check if addon has valid license
		if ( ! class_exists( 'SimplyConf_License_Manager' ) ) {
			return false;
		}

		$status = SimplyConf_License_Manager::get_license_status( $addon_slug, 0 );
		return in_array( $status, array( 'valid', 'active' ) );
	}

	/**
	 * Verify database flag exists (additional security layer)
	 *
	 * @param string $feature_slug Feature slug.
	 * @return bool True if flag exists in database.
	 */
	private function verify_database_flag( $feature_slug ) {
		global $wpdb;

		$site_id = get_current_blog_id();

		// Always query main site table for centralized feature flags
		$switched = false;
		if ( is_multisite() && get_current_blog_id() !== 1 ) {
			switch_to_blog( 1 );
			$switched = true;
			// Ensure wpdb prefix is updated after switch
			$wpdb->set_prefix( $wpdb->base_prefix );
		}

		$table = SimplyConf_DB::get_table( 'feature_flags' );

		$exists = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$table} WHERE site_id = %d AND feature_slug = %s AND is_enabled = 1",
				$site_id,
				$feature_slug
			)
		);

		// In SaaS mode, if no database record exists, sync features and check again
		if ( simplyconf_is_saas() && $exists == 0 ) {
			if ( $switched ) {
				restore_current_blog();
			}
			
			// Sync features from plan
			$this->sync_saas_features( $site_id );
			
			// Re-check after sync
			if ( is_multisite() && get_current_blog_id() !== 1 ) {
				switch_to_blog( 1 );
				$wpdb->set_prefix( $wpdb->base_prefix );
			}
			
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$table} WHERE site_id = %d AND feature_slug = %s AND is_enabled = 1",
					$site_id,
					$feature_slug
				)
			);
		}

		if ( $switched ) {
			restore_current_blog();
		}

		return $exists > 0;
	}

	/**
	 * Get features that should be enabled based on current plan
	 * Helper method for validation (SaaS mode)
	 *
	 * @param int $site_id Site ID (optional, defaults to current site).
	 * @return array Array of feature slugs that plan includes.
	 */
	private function get_plan_features( $site_id = null ) {
		$site_id = $site_id ?: get_current_blog_id();

		if ( ! function_exists( 'wu_get_site' ) ) {
			return array();
		}

		$site = wu_get_site( $site_id );
		if ( ! $site ) {
			return array();
		}

		$plan = $site->get_plan();
		if ( ! $plan ) {
			return array();
		}

		$plan_slug = $plan->get_slug();
		
		// Get features for this plan
		return SimplyConf_Feature_Registry::get_features_for_plan( $plan_slug );
	}

	/**
	 * Get features that should be enabled based on current license status
	 * Helper method for validation (self-hosted mode)
	 *
	 * @return array Array of feature slugs with valid licenses.
	 */
	private function get_licensed_features() {
		if ( ! class_exists( 'SimplyConf_License_Manager' ) ) {
			return array();
		}

		$licensed_features = array();
		$all_features = SimplyConf_Feature_Registry::get_all_features();

		foreach ( $all_features as $feature_slug => $feature_data ) {
			$addon_slug = $feature_data['addon_slug'] ?? null;
			if ( $addon_slug ) {
				$status = SimplyConf_License_Manager::get_license_status( $addon_slug, 0 );
				if ( in_array( $status, array( 'valid', 'active' ) ) ) {
					$licensed_features[] = $feature_slug;
				}
			}
		}

		return $licensed_features;
	}

	/**
	 * Sync feature flags from subscription plan
	 * Called when plan changes or site is created
	 *
	 * @param int $site_id Site ID (optional, defaults to current site).
	 * @return bool True on success, false on failure.
	 */
	public function sync_saas_features( $site_id = null ) {
		if ( ! simplyconf_is_saas() ) {
			return false;
		}

		$site_id = $site_id ?: get_current_blog_id();

		if ( ! function_exists( 'wu_get_site' ) ) {
			return false;
		}

		$site = wu_get_site( $site_id );
		if ( ! $site ) {
			return false;
		}

		$plan = $site->get_plan();
		if ( ! $plan ) {
			return false;
		}

		$plan_slug = $plan->get_slug();

		// Get all features
		$all_features = SimplyConf_Feature_Registry::get_all_features();

		// Grant/revoke features based on plan (grant_feature/revoke_feature handle main site switching)
		foreach ( $all_features as $feature_slug => $feature_data ) {
			$should_have_access = in_array( $plan_slug, $feature_data['plans'] ?? array() );

			if ( $should_have_access ) {
				$this->grant_feature( $site_id, $feature_slug, 'saas_plan', $plan->get_id() );
			} else {
				$this->revoke_feature( $site_id, $feature_slug );
			}
		}

		return true;
	}

	/**
	 * Sync feature flags from license status (self-hosted)
	 *
	 * @param string $addon_slug Addon slug.
	 * @param string $license_key License key.
	 * @param string $status License status.
	 * @return bool True on success.
	 */
	public function sync_license_feature( $addon_slug, $license_key, $status ) {
		// Find feature by addon slug
		$all_features = SimplyConf_Feature_Registry::get_all_features();
		$feature_slug = null;

		foreach ( $all_features as $slug => $data ) {
			if ( isset( $data['addon_slug'] ) && $data['addon_slug'] === $addon_slug ) {
				$feature_slug = $slug;
				break;
			}
		}

		if ( ! $feature_slug ) {
			return false;
		}

		$site_id = get_current_blog_id();

		if ( in_array( $status, array( 'valid', 'active' ) ) ) {
			$this->grant_feature( $site_id, $feature_slug, 'license', $license_key );
		} else {
			$this->revoke_feature( $site_id, $feature_slug );
		}

		return true;
	}

	/**
	 * Grant a feature to a site
	 *
	 * @param int    $site_id Site ID.
	 * @param string $feature_slug Feature slug.
	 * @param string $source Source type (license|saas_plan|manual).
	 * @param string $source_id Source identifier (license key or plan ID).
	 * @param string $expires_at Expiration datetime (optional).
	 * @return bool True on success.
	 */
	public function grant_feature( $site_id, $feature_slug, $source = 'manual', $source_id = null, $expires_at = null ) {
		global $wpdb;

		// Always use main site table for centralized feature flags
		$switched = false;
		if ( is_multisite() && get_current_blog_id() !== 1 ) {
			switch_to_blog( 1 );
			$switched = true;
			// Ensure wpdb prefix is updated after switch
			$wpdb->set_prefix( $wpdb->base_prefix );
		}

		$table = SimplyConf_DB::get_table( 'feature_flags' );

		$result = $wpdb->replace(
			$table,
			array(
				'site_id'      => $site_id,
				'feature_slug' => $feature_slug,
				'is_enabled'   => 1,
				'source'       => $source,
				'source_id'    => $source_id,
				'granted_at'   => current_time( 'mysql' ),
				'expires_at'   => $expires_at,
			),
			array( '%d', '%s', '%d', '%s', '%s', '%s', '%s' )
		);

		if ( $switched ) {
			restore_current_blog();
		}

		// Clear cache
		$this->clear_cache( $site_id, $feature_slug );

		return $result !== false;
	}

	/**
	 * Revoke a feature from a site
	 *
	 * @param int    $site_id Site ID.
	 * @param string $feature_slug Feature slug.
	 * @return bool True on success.
	 */
	public function revoke_feature( $site_id, $feature_slug ) {
		global $wpdb;

		// Always use main site table for centralized feature flags
		$switched = false;
		if ( is_multisite() && get_current_blog_id() !== 1 ) {
			switch_to_blog( 1 );
			$switched = true;
			// Ensure wpdb prefix is updated after switch
			$wpdb->set_prefix( $wpdb->base_prefix );
		}

		$table = SimplyConf_DB::get_table( 'feature_flags' );

		$result = $wpdb->delete(
			$table,
			array(
				'site_id'      => $site_id,
				'feature_slug' => $feature_slug,
			),
			array( '%d', '%s' )
		);

		if ( $switched ) {
			restore_current_blog();
		}

		// Clear cache
		$this->clear_cache( $site_id, $feature_slug );

		return $result !== false;
	}

	/**
	 * Check if an addon plugin is active in WordPress
	 *
	 * @param string $addon_slug Addon slug (e.g., 'reviews', 'emails', 'schedules')
	 * @return bool True if addon plugin is active
	 */
	private function is_addon_plugin_active( $addon_slug ) {
		// Map addon slugs to their plugin file paths
		$addon_plugins = array(
			'reviews'   => 'simplyconf-reviews/simplyconf-reviews.php',
			'emails'    => 'simplyconf-emails/simplyconf-emails.php',
			'schedules' => 'simplyconf-schedules/simplyconf-schedules.php',
			'exports'   => 'simplyconf-exports/simplyconf-exports.php',
			'payments'  => 'simplyconf-payments/simplyconf-payments.php',
		);

		$plugin_file = $addon_plugins[ $addon_slug ] ?? null;
		if ( ! $plugin_file ) {
			return false;
		}

		return is_plugin_active( $plugin_file );
	}

	/**
	 * Get all enabled features for a site
	 *
	 * @param int $site_id Site ID (optional, defaults to current site).
	 * @return array Array of feature slugs.
	 */
	public function get_enabled_features( $site_id = null ) {
		global $wpdb;

		$site_id = $site_id ?: get_current_blog_id();

		// Always query main site table for centralized feature flags
		$switched = false;
		if ( is_multisite() && get_current_blog_id() !== 1 ) {
			switch_to_blog( 1 );
			$switched = true;
			// Ensure wpdb prefix is updated after switch
			$wpdb->set_prefix( $wpdb->base_prefix );
		}

		$table = SimplyConf_DB::get_table( 'feature_flags' );

		$features = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT feature_slug FROM {$table} 
				 WHERE site_id = %d 
				 AND is_enabled = 1
				 AND (expires_at IS NULL OR expires_at > NOW())",
				$site_id
			)
		);

		if ( $switched ) {
			restore_current_blog();
		}

		// Validate features against current source (plan for SaaS, licenses for self-hosted)
		$needs_sync = false;
		
		if ( simplyconf_is_saas() ) {
			// SaaS: Validate against plan
			if ( empty( $features ) ) {
				$needs_sync = true;
			} else {
				$expected_features = $this->get_plan_features( $site_id );
				
				$db_set = array_unique( $features );
				$plan_set = array_unique( $expected_features );
				sort( $db_set );
				sort( $plan_set );
				
				if ( $db_set !== $plan_set ) {
					$needs_sync = true;
				}
			}
			
			if ( $needs_sync ) {
				$this->sync_saas_features( $site_id );
			}
		} else {
			// Self-hosted: Validate against license status
			if ( ! empty( $features ) ) {
				$expected_features = $this->get_licensed_features();
				
				$db_set = array_unique( $features );
				$license_set = array_unique( $expected_features );
				sort( $db_set );
				sort( $license_set );
				
				if ( $db_set !== $license_set ) {
					$needs_sync = true;
				}
			}
			
			if ( $needs_sync ) {
				// Sync all features based on current license status
				$all_features = SimplyConf_Feature_Registry::get_all_features();
				foreach ( $all_features as $feature_slug => $feature_data ) {
					$addon_slug = $feature_data['addon_slug'] ?? null;
					if ( $addon_slug && class_exists( 'SimplyConf_License_Manager' ) ) {
						$status = SimplyConf_License_Manager::get_license_status( $addon_slug, 0 );
						if ( in_array( $status, array( 'valid', 'active' ) ) ) {
							$this->grant_feature( $site_id, $feature_slug, 'license', $addon_slug );
						} else {
							$this->revoke_feature( $site_id, $feature_slug );
						}
					}
				}
			}
		}
		
		// Re-query if sync occurred
		if ( $needs_sync ) {
			if ( is_multisite() && get_current_blog_id() !== 1 ) {
				switch_to_blog( 1 );
				$wpdb->set_prefix( $wpdb->base_prefix );
			}
			
			$features = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT feature_slug FROM {$table} 
					 WHERE site_id = %d 
					 AND is_enabled = 1
					 AND (expires_at IS NULL OR expires_at > NOW())",
					$site_id
				)
			);
			
			if ( is_multisite() && get_current_blog_id() !== 1 ) {
				restore_current_blog();
			}
		}

		// Filter out features for inactive addon plugins
		$filtered_features = array();
		foreach ( $features as $feature_slug ) {
			$feature_data = SimplyConf_Feature_Registry::get_feature( $feature_slug );
			$addon_slug = $feature_data['addon_slug'] ?? null;
			
			// If feature has an addon slug, check if the plugin is active
			if ( $addon_slug ) {
				if ( $this->is_addon_plugin_active( $addon_slug ) ) {
					$filtered_features[] = $feature_slug;
				}
			} else {
				// Core features (no addon slug) are always included
				$filtered_features[] = $feature_slug;
			}
		}

		return $filtered_features ?: array();
	}

	/**
	 * Get detailed feature information for a site
	 *
	 * @param int $site_id Site ID (optional, defaults to current site).
	 * @return array Array of feature data with metadata.
	 */
	public function get_features_with_details( $site_id = null ) {
		$site_id = $site_id ?: get_current_blog_id();
		$enabled_slugs = $this->get_enabled_features( $site_id );
		$all_features = SimplyConf_Feature_Registry::get_all_features();

		$features = array();
		foreach ( $all_features as $slug => $data ) {
			$features[ $slug ] = array(
				'name'        => $data['name'],
				'description' => $data['description'],
				'enabled'     => in_array( $slug, $enabled_slugs ),
			);
		}

		return $features;
	}

	/**
	 * Log feature access attempts
	 *
	 * @param string $feature_slug Feature slug.
	 * @param string $result Result of access check.
	 */
	private function log_access_attempt( $feature_slug, $result ) {
		// Only log denied access attempts and only if WP_DEBUG is enabled
		if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG || $result === 'granted' ) {
			return;
		}

		$log_entry = sprintf(
			'[%s] Feature: %s | Result: %s | Site: %d | User: %d | IP: %s',
			current_time( 'mysql' ),
			$feature_slug,
			$result,
			get_current_blog_id(),
			get_current_user_id(),
			sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? 'unknown' ) )
		);

		error_log( 'SimplyConf Feature Access: ' . $log_entry );
	}

	/**
	 * Get cache key for a feature
	 *
	 * @param string $feature_slug Feature slug.
	 * @return string Cache key.
	 */
	private function get_cache_key( $feature_slug ) {
		return get_current_blog_id() . '_' . $feature_slug;
	}

	/**
	 * Clear cache for a feature
	 *
	 * @param int    $site_id Site ID (optional).
	 * @param string $feature_slug Feature slug (optional).
	 */
	private function clear_cache( $site_id = null, $feature_slug = null ) {
		if ( $feature_slug ) {
			$key = ( $site_id ?: get_current_blog_id() ) . '_' . $feature_slug;
			unset( $this->cache[ $key ] );
		} else {
			$this->cache = array();
		}
	}
}
