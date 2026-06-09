<?php

/**
 * SimplyConf Database Helper Class
 *
 * Centralizes table names to reduce coupling and make renaming easier.
 *
 * @package SimplyConf
 * @since 3.0.0
 */

if ( ! defined('ABSPATH')) {
	exit;
}

class SimplyConf_DB {

	/**
	 * Get prefixed table name
	 *
	 * @param string $table_name The table name key (e.g., 'abstracts')
	 * @return string The full prefixed table name
	 */
	public static function get_table( $table_name ) {
		global $wpdb;

		static $tables = null;

		if ($tables === null) {
			$tables = array(
				// Core tables
				'abstracts'            => 'simplyconf_abstracts',
				'reviews'              => 'simplyconf_reviews',
				'custom_values'        => 'simplyconf_custom_values',
				'custom_fields'        => 'simplyconf_custom_fields',
				'events'               => 'simplyconf_events',
				'settings'             => 'simplyconf_settings',
				'attachments'          => 'simplyconf_attachments',
				'file_logs'            => 'simplyconf_file_logs',
				'tracks'               => 'simplyconf_tracks',
				'sessions'             => 'simplyconf_sessions',
				'statuses'             => 'simplyconf_statuses',
				'abstract_authors'     => 'simplyconf_abstract_authors',
				'authors'              => 'simplyconf_authors',
				'event_user_roles'     => 'simplyconf_event_user_roles',
				'feature_flags'        => 'simplyconf_feature_flags',

				// Payments addon tables
				'registrations'        => 'simplyconf_registrations',
				'registration_items'   => 'simplyconf_registration_items',
				'payment_settings'     => 'simplyconf_payment_settings',
				'registration_types'   => 'simplyconf_registration_types',
				'discount_codes'       => 'simplyconf_discount_codes',
				'payment_transactions' => 'simplyconf_payment_transactions',

				// Exports addon tables
				'export_templates'     => 'simplyconf_export_templates',

				// Reviews addon tables
				'reviewer_assignments' => 'simplyconf_reviewer_assignments',
				'review_comments'      => 'simplyconf_review_comments',

				// Emails addon tables
				'emails'               => 'simplyconf_emails',
				'email_logs'           => 'simplyconf_email_logs',

				// Schedules addon tables
				'schedule_slots'       => 'simplyconf_schedule_slots',
				'schedule_assignments' => 'simplyconf_schedule_assignments',
			);
		}

		return $wpdb->prefix . ( $tables[ $table_name ] ?? 'simplyconf_' . strtolower($table_name) );
	}
}
