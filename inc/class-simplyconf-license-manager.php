<?php
/**
 * SimplyConf License Manager
 *
 * Handles the licensing system for SimplyConf addons.
 * Acts as a centralized hub where addons register themselves,
 * and this class handles the UI input and EDD Software Licensing integration.
 *
 * @package SimplyConf
 * @since 3.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

class SimplyConf_License_Manager {

	/**
	 * The single instance of the class.
	 *
	 * @var SimplyConf_License_Manager
	 */
	private static $instance = null;

	/**
	 * The registered addons.
	 *
	 * @var array
	 */
	private static $addons = [];

	/**
	 * Get the singleton instance.
	 *
	 * @return SimplyConf_License_Manager
	 */
	public static function instance() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new self();
			self::$instance->init();
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
	 * Initialize the class hooks.
	 */
	private function init() {
		add_action( 'admin_init', [ $this, 'handle_form_actions' ] );
		// Note: Plugin updates are handled by each addon individually via EDD_SL_Plugin_Updater
		
		// Load addons late to ensure they are all registered
		add_action( 'init', [ __CLASS__, 'load_registered_addons' ], 99 );
		
		// Add license stats to dashboard
		add_filter( 'simplyconf_dashboard_stats', [ __CLASS__, 'add_license_stats_to_dashboard' ], 10, 2 );
	}

	/**
	 * Load registered addons from the global registry.
	 * Only includes addons that have licensing information (item_id) and valid feature flags.
	 */
	public static function load_registered_addons() {
		if ( ! empty( self::$addons ) ) {
			return self::$addons;
		}

		global $simplyconf_addons;
		
		if ( empty( $simplyconf_addons ) ) {
			return [];
		}

		// Get feature manager instance for checking feature access
		$feature_manager = class_exists( 'SimplyConf_Feature_Manager' ) ? SimplyConf_Feature_Manager::instance() : null;

		// Filter to only include addons with licensing info and valid feature flags
		foreach ( $simplyconf_addons as $slug => $addon ) {
			// Only include if it has EDD item_id (premium addon)
			if ( isset( $addon['item_id'] ) && ! empty( $addon['item_id'] ) ) {
				// Check if feature flag allows access
				if ( $feature_manager ) {
					// Find corresponding feature slug for this addon
					$all_features = SimplyConf_Feature_Registry::feature_exists( $slug ) ? array( $slug => true ) : array();
					
					// If no direct match, search by addon_slug in registry
					if ( empty( $all_features ) ) {
						$registry_features = SimplyConf_Feature_Registry::get_all_features();
						foreach ( $registry_features as $feature_slug => $feature_data ) {
							if ( isset( $feature_data['addon_slug'] ) && $feature_data['addon_slug'] === $slug ) {
								$all_features = array( $feature_slug => true );
								break;
							}
						}
					}
					
					// Only include addon if feature is enabled
					$has_access = false;
					foreach ( array_keys( $all_features ) as $feature_slug ) {
						if ( $feature_manager->has_feature( $feature_slug ) ) {
							$has_access = true;
							break;
						}
					}
					
					if ( ! $has_access ) {
						continue; // Skip this addon - no feature access
					}
				}
				
				// Use 'name' as 'item_name' for EDD compatibility
				if ( ! isset( $addon['item_name'] ) ) {
					$addon['item_name'] = $addon['name'];
				}
				self::$addons[ $slug ] = $addon;
			}
		}

		return self::$addons;
	}

	/**
	 * Get registered addons with full info.
	 * 
	 * @return array
	 */
	public static function get_registered_addons() {
		self::load_registered_addons();
		return self::$addons;
	}

	/**
	 * Get ALL registered addons regardless of feature flag status.
	 * Used for the Licenses page to show all available addons.
	 * 
	 * @return array
	 */
	public static function get_all_addons_for_licensing() {
		global $simplyconf_addons;
		
		if ( empty( $simplyconf_addons ) ) {
			return array();
		}

		$all_addons = array();
		
		// Filter to only include addons with licensing info (no feature flag check)
		foreach ( $simplyconf_addons as $slug => $addon ) {
			// Only include if it has EDD item_id (premium addon)
			if ( isset( $addon['item_id'] ) && ! empty( $addon['item_id'] ) ) {
				// Use 'name' as 'item_name' for EDD compatibility
				if ( ! isset( $addon['item_name'] ) ) {
					$addon['item_name'] = $addon['name'];
				}
				$all_addons[ $slug ] = $addon;
			}
		}

		return $all_addons;
	}

	/**
	 * Get registered addon slugs.
	 * 
	 * @return array
	 */
	public static function get_addon_slugs() {
		self::load_registered_addons();
		return array_keys( self::$addons );
	}

	/**
	 * Get license key for an addon from WordPress options.
	 * Licenses are global across all events.
	 *
	 * @param string $slug Addon slug.
	 * @param int $event_id Event ID (deprecated, kept for backwards compatibility).
	 * @return string|false
	 */
	public static function get_license_key( $slug, $event_id = 0 ) {
		// Licenses are global - ignore event_id
		return get_option( "simplyconf_license_key_{$slug}", false );
	}

	/**
	 * Save license key to WordPress options.
	 * Licenses are global across all events.
	 *
	 * @param string $slug Addon slug.
	 * @param string $key License key.
	 * @param int $event_id Event ID (deprecated, kept for backwards compatibility).
	 * @return bool
	 */
	public static function save_license_key( $slug, $key, $event_id = 0 ) {
		// Licenses are global - ignore event_id
		$result = update_option( "simplyconf_license_key_{$slug}", sanitize_text_field( $key ) );
		
		if ( defined('WP_DEBUG') && WP_DEBUG ) {
			error_log("Saved license key for {$slug}: " . ($result ? 'success' : 'already exists with same value'));
		}
		
		return true; // update_option returns false if value unchanged, but that's not an error
	}

	/**
	 * Get license status for an addon from WordPress options.
	 * Licenses are global across all events.
	 *
	 * @param string $slug Addon slug.
	 * @param int $event_id Event ID (deprecated, kept for backwards compatibility).
	 * @return string|bool
	 */
	public static function get_license_status( $slug, $event_id = 0 ) {
		// Licenses are global - ignore event_id
		return get_option( "simplyconf_license_status_{$slug}", false );
	}

	/**
	 * Save license status to WordPress options.
	 * Licenses are global across all events.
	 *
	 * @param string $slug Addon slug.
	 * @param string $status License status.
	 * @param int $event_id Event ID (deprecated, kept for backwards compatibility).
	 * @return bool
	 */
	public static function save_license_status( $slug, $status, $event_id = 0 ) {
		// Licenses are global - ignore event_id
		update_option( "simplyconf_license_status_{$slug}", sanitize_text_field( $status ) );
		return true;
	}

	/**
	 * Handle form submissions for activation/deactivation (legacy PHP fallback).
	 */
	public function handle_form_actions() {
		if ( ! isset( $_POST['simplyconf_licenses'] ) ) {
			return;
		}

		// Verify nonce before accessing any POST data
		if ( ! check_admin_referer( 'simplyconf_licenses-options' ) ) {
			return;
		}

		self::load_registered_addons();

		foreach ( self::$addons as $slug => $addon ) {
			if ( isset( $_POST[ 'simplyconf_license_activate_' . $slug ] ) ) {
				$key = isset( $_POST['simplyconf_licenses'][ $slug ] ) ? sanitize_text_field( wp_unslash( $_POST['simplyconf_licenses'][ $slug ] ) ) : '';
				self::activate_license( $slug, $key );
			}
			if ( isset( $_POST[ 'simplyconf_license_deactivate_' . $slug ] ) ) {
				self::deactivate_license( $slug );
			}
		}
	}

	/**
	 * Activate a license key (static for REST API).
	 *
	 * @param string $slug Addon slug.
	 * @param string $license_key License key.
	 * @param int $event_id Event ID (0 for global).
	 * @return array
	 */
	public static function activate_license( $slug, $license_key, $event_id = 0 ) {
		// Use get_all_addons_for_licensing() to allow activation without feature flags
		$all_addons = self::get_all_addons_for_licensing();
		
		if ( empty( $license_key ) || ! isset( $all_addons[ $slug ] ) ) {
			return [ 'success' => false, 'message' => 'Invalid addon or license key' ];
		}

		$addon = $all_addons[ $slug ];

		// Save the license key first
		self::save_license_key( $slug, $license_key, $event_id );

		// API Call to EDD store
		$api_params = array(
			'edd_action' => 'activate_license',
			'license'    => $license_key,
			'item_id'    => $addon['item_id'],
			'url'        => home_url()
		);

		// Use local store URL for development, production URL otherwise
		$store_url = defined('WP_DEBUG') && WP_DEBUG ? 'http://simplyconfcom.local' : 'https://simplyconf.com';
		$response = wp_remote_post( $store_url, array( 'body' => $api_params, 'timeout' => 15, 'sslverify' => true ) );

		// Debug logging (license key intentionally omitted)
		if ( defined('WP_DEBUG') && WP_DEBUG ) {
			error_log( 'SimplyConf License Activation Request:' );
			error_log( 'Store URL: ' . $store_url );
			error_log( 'Item ID: ' . $api_params['item_id'] . ' | URL: ' . $api_params['url'] );
		}

		if ( is_wp_error( $response ) ) {
			if ( defined('WP_DEBUG') && WP_DEBUG ) {
				error_log( 'SimplyConf License Error: ' . $response->get_error_message() );
			}
			return [ 'success' => false, 'message' => 'Connection error: ' . $response->get_error_message() ];
		}

		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			if ( defined('WP_DEBUG') && WP_DEBUG ) {
				error_log( 'SimplyConf License HTTP Error: ' . wp_remote_retrieve_response_code( $response ) );
			}
			return [ 'success' => false, 'message' => 'Server error: Unable to connect to license server' ];
		}

		$response_body = wp_remote_retrieve_body( $response );
		$license_data = json_decode( $response_body );
		
		// Debug logging (response body omitted — may contain sensitive license data)
		if ( defined('WP_DEBUG') && WP_DEBUG ) {
			error_log( 'SimplyConf License Response status: ' . ( isset( $license_data->license ) ? $license_data->license : 'unknown' ) );
		}
		
		if ( ! $license_data ) {
			return [ 'success' => false, 'message' => 'Invalid response from license server' ];
		}

		// Save license status
		if ( isset( $license_data->license ) ) {
			self::save_license_status( $slug, $license_data->license, $event_id );
		}

		// Store additional license data
		$stored_data = array(
			'expires'        => isset( $license_data->expires ) ? $license_data->expires : null,
			'site_count'     => isset( $license_data->site_count ) ? $license_data->site_count : 0,
			'license_limit'  => isset( $license_data->license_limit ) ? $license_data->license_limit : 1,
			'activated_at'   => current_time( 'mysql' ),
			'last_checked'   => current_time( 'mysql' ),
		);
		update_option( 'simplyconf_license_data_' . $slug, $stored_data );

		// Sync feature flags for self-hosted installations
		if ( class_exists( 'SimplyConf_Feature_Manager' ) && ! simplyconf_is_saas() ) {
			$manager = SimplyConf_Feature_Manager::instance();
			$status = isset( $license_data->license ) ? $license_data->license : 'invalid';
			$manager->sync_license_feature( $slug, $license_key, $status );
		}

		// Clear addon cache so changes take effect immediately
		self::$addons = array();

		// Check if activation was successful
		if ( isset( $license_data->license ) && $license_data->license === 'valid' ) {
			return [ 
				'success' => true, 
				'message' => 'License activated successfully!'
			];
		} elseif ( isset( $license_data->error ) ) {
			// Handle case where license was deleted from server
			if ( in_array( $license_data->error, array( 'missing', 'invalid' ) ) ) {
				// License doesn't exist on server anymore, clean up local data
				delete_option( 'simplyconf_license_key_' . $slug );
				delete_option( 'simplyconf_license_status_' . $slug );
				delete_option( 'simplyconf_license_data_' . $slug );
				
				return [ 
					'success' => false, 
					'message' => 'This license no longer exists on the server and has been removed from your site. Please enter a valid license key.' 
				];
			}
			
			// Handle other specific EDD errors
			$error_messages = array(
				'expired'           => 'This license key has expired. Please renew your license.',
				'revoked'           => 'This license key has been revoked.',
				'site_inactive'     => 'This site is not active for this license.',
				'item_name_mismatch' => 'This license key is not valid for this product.',
				'no_activations_left' => 'This license has reached its activation limit.',
			);
			
			$message = isset( $error_messages[ $license_data->error ] ) 
				? $error_messages[ $license_data->error ] 
				: 'License activation failed: ' . $license_data->error;
			
			// Remove invalid license data for certain errors
			if ( in_array( $license_data->error, array( 'expired', 'revoked', 'item_name_mismatch' ) ) ) {
				delete_option( 'simplyconf_license_key_' . $slug );
				delete_option( 'simplyconf_license_status_' . $slug );
				delete_option( 'simplyconf_license_data_' . $slug );
				$message .= ' License removed - please enter a valid license key.';
			}
			
			return [ 'success' => false, 'message' => $message ];
		}

		// Generic failure - remove license data
		delete_option( 'simplyconf_license_key_' . $slug );
		delete_option( 'simplyconf_license_status_' . $slug );
		delete_option( 'simplyconf_license_data_' . $slug );
		
		return [ 'success' => false, 'message' => 'License activation failed. Please enter a valid license key.' ];
	}

	/**
	 * Deactivate a license key (static for REST API).
	 *
	 * @param string $slug Addon slug.
	 * @param int $event_id Event ID (0 for global).
	 * @return array
	 */
	public static function deactivate_license( $slug, $event_id = 0 ) {
		// Use get_all_addons_for_licensing() to allow deactivation even without feature flags
		$all_addons = self::get_all_addons_for_licensing();
		
		if ( ! isset( $all_addons[ $slug ] ) ) {
			return [ 'success' => false, 'message' => 'Invalid addon' ];
		}

		$addon = $all_addons[ $slug ];
		$license_key = self::get_license_key( $slug, $event_id );

		if ( empty( $license_key ) ) {
			return [ 'success' => false, 'message' => 'No license key found to deactivate' ];
		}

		// API Call
		$api_params = array(
			'edd_action' => 'deactivate_license',
			'license'    => $license_key,
			'item_id'    => $addon['item_id'],
			'url'        => home_url()
		);

		// Use local store URL for development, production URL otherwise
		$store_url = defined('WP_DEBUG') && WP_DEBUG ? 'http://simplyconfcom.local' : 'https://simplyconf.com';
		$response = wp_remote_post( $store_url, array( 'body' => $api_params, 'timeout' => 15, 'sslverify' => true ) );

		if ( is_wp_error( $response ) ) {
			return [ 'success' => false, 'message' => 'Connection error: ' . $response->get_error_message() ];
		}

		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return [ 'success' => false, 'message' => 'Server error: Unable to connect to license server' ];
		}

		$license_data = json_decode( wp_remote_retrieve_body( $response ) );
		
		if ( isset( $license_data->license ) && $license_data->license == 'deactivated' ) {
			// Remove license key and status completely
			delete_option( 'simplyconf_license_key_' . $slug );
			delete_option( 'simplyconf_license_status_' . $slug );
			delete_option( 'simplyconf_license_data_' . $slug );
			
			// Revoke feature flags for self-hosted installations
			if ( class_exists( 'SimplyConf_Feature_Manager' ) && ! simplyconf_is_saas() ) {
				$manager = SimplyConf_Feature_Manager::instance();
				$manager->sync_license_feature( $slug, $license_key, 'deactivated' );
			}
			
			// Clear addon cache so changes take effect immediately
			self::$addons = array();
			
			return [ 
				'success' => true, 
				'message' => 'License deactivated successfully!'
			];
		}

		return [ 'success' => false, 'message' => 'License deactivation failed. Please try again.' ];
	}

	/**
	 * Validate license (static for REST API).
	 * 
	 * @param string $slug Addon slug.
	 * @param bool $force Force check.
	 * @param int $event_id Event ID (0 for global).
	 * @return array
	 */
	public static function validate_license( $slug, $force = false, $event_id = 0 ) {
		$key = self::get_license_key( $slug, $event_id );
		return self::activate_license( $slug, $key, $event_id );
	}

	/**
	 * Add license stats to dashboard (filter callback).
	 *
	 * @param array $stats Existing stats.
	 * @param int $event_id Event ID.
	 * @return array
	 */
	public static function add_license_stats_to_dashboard( $stats, $event_id ) {
		self::load_registered_addons();
		
		$licenses = [];
		foreach ( self::$addons as $slug => $addon ) {
			$status = self::get_license_status( $slug, 0 ); // Global licenses
			$licenses[] = [
				'addon'  => $addon['item_name'],
				'status' => $status ? $status : 'inactive',
				'slug'   => $slug
			];
		}
		
		$stats['licenses'] = [
			'active_count' => count( array_filter( $licenses, function($l) { return $l['status'] === 'valid'; } ) ),
			'total_count'  => count( $licenses ),
			'licenses'     => $licenses
		];
		
		return $stats;
	}

}
