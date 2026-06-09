<?php
defined('ABSPATH') or die('ERROR: You do not have permission to access this page');

add_action('simplyconf_event_created', 'simplyconf_load_default_settings', 10, 1);

function simplyconf_load_default_settings( $event_id ) {
	global $wpdb;
	$settings_tbl = SimplyConf_DB::get_table('settings');

	// load default abs settings form for this event
	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Reading local file, not remote URL.
	$setting_seed = file_get_contents( SIMPLYCONF_PATH . 'seed/default.settings.json' );
	$settings     = json_decode( $setting_seed, true );
	foreach ($settings as $key => $setting) {
		$wpdb->insert(
			$settings_tbl,
			array(
				'event_id'      => $event_id,
				'category'      => $setting['category'],
				'name'          => $setting['name'],
				'label'         => $setting['label'],
				'type'          => $setting['type'],
				'value'         => $setting['default_value'],
				'default_value' => $setting['default_value'],
				'description'   => $setting['description'],
				'autoload'      => 0,
				'order'         => $key,
			)
		);
	}
}

/**
 * Trigger actions after abstract submission
 */
function simplyconf_trigger_after_submission( $abstract_id, $user_id ) {
	do_action('simplyconf_after_submission', $abstract_id, $user_id);
}

function simplyconf_trigger_review_assigned( $review_id, $reviewer_id ) {
	do_action('simplyconf_review_assigned', $review_id, $reviewer_id);
}

function simplyconf_trigger_review_completed( $review_id, $reviewer_id ) {
	do_action('simplyconf_review_completed', $review_id, $reviewer_id);
}

function simplyconf_trigger_decision_made( $abstract_id, $user_id, $decision ) {
	do_action('simplyconf_decision_made', $abstract_id, $user_id, $decision);
}

/**
 * Add missing settings to existing events
 * This function checks for and adds any new settings that don't exist for an event
 */
function simplyconf_add_missing_settings( $event_id = null ) {
	global $wpdb;
	$settings_tbl = SimplyConf_DB::get_table('settings');

	// If no event_id provided, update all events
	if ($event_id === null) {
		$event_ids = $wpdb->get_col("SELECT DISTINCT event_id FROM {$settings_tbl}");
	} else {
		$event_ids = array( $event_id );
	}

	// Load the default settings from seed file
	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Reading local file, not remote URL.
	$setting_seed     = file_get_contents( SIMPLYCONF_PATH . 'seed/default.settings.json' );
	$default_settings = json_decode( $setting_seed, true );

	foreach ($event_ids as $eid) {
		// Get existing setting names for this event
		$existing_settings = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT name FROM {$settings_tbl} WHERE event_id = %d",
				$eid
			)
		);

		// Get the highest order value for this event
		$max_order  = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT MAX(`order`) FROM {$settings_tbl} WHERE event_id = %d",
				$eid
			)
		);
		$next_order = $max_order ? $max_order + 1 : 0;

		// Add any missing settings
		foreach ($default_settings as $setting) {
			if ( ! in_array($setting['name'], $existing_settings)) {
				$wpdb->insert(
					$settings_tbl,
					array(
						'event_id'      => $eid,
						'category'      => $setting['category'],
						'name'          => $setting['name'],
						'label'         => $setting['label'],
						'type'          => $setting['type'],
						'value'         => $setting['default_value'],
						'default_value' => $setting['default_value'],
						'description'   => $setting['description'],
						'autoload'      => 0,
						'order'         => $next_order++,
					)
				);
			}
		}
	}
}
