<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Create a new event with full initialization
 *
 * @param array $data Event data including name, initials, description, dates, etc.
 * @return integer|WP_Error Event ID on success, WP_Error on failure
 */
function simplyconf_create_event( $data ) {
	global $wpdb;

	// Set defaults
	if ( ! isset($data['created'])) {
		$data['created'] = current_time('mysql');
	}
	if ( ! isset($data['modified'])) {
		$data['modified'] = current_time('mysql');
	}
	if ( ! isset($data['default'])) {
		$data['default'] = 1;
	}
	if ( ! isset($data['status'])) {
		$data['status'] = 1;
	}

	// Apply filter for extensibility
	$data = apply_filters('simplyconf_create_event', $data);

	// Insert event
	$events_table = SimplyConf_DB::get_table('events');
	$result       = $wpdb->insert($events_table, $data);

	if ( ! $result) {
		return new WP_Error('event_creation_failed', 'Failed to create event', array( 'status' => 500 ));
	}

	$event_id = $wpdb->insert_id;

	// Initialize the event with all required setup
	if ($event_id && class_exists('SimplyConf_Event_Routes')) {
		$event_routes = new SimplyConf_Event_Routes();

		// Initialize default statuses
		$event_routes->initialize_event_statuses($event_id);

		// Seed default custom fields
		$event_routes->seed_author_fields($event_id);
		$event_routes->seed_abstract_fields($event_id);
		$event_routes->seed_review_fields($event_id);
		$event_routes->seed_user_fields($event_id);

		// Seed default track
		$event_routes->seed_default_track($event_id);
	}

	// Fire the event created hook
	do_action('simplyconf_event_created', $event_id);

	return $event_id;
}

/**
 * Create default event if none exists
 * Called during plugin activation
 */
function simplyconf_create_default_event() {
	global $wpdb;
	$events_table = SimplyConf_DB::get_table('events');
	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from SimplyConf_DB::get_table(); no user input.
	$event_count  = $wpdb->get_var("SELECT COUNT(*) FROM $events_table");

	if ($event_count == 0) {
		// Default event data
		$event_data = array(
			'name'        => 'My Conference',
			'initials'    => 'MC',
			'description' => 'Welcome to SimplyConf! This is your first event. You can edit or delete it anytime.',
			'start_date'  => gmdate('Y-m-d', strtotime('+3 months')),
			'end_date'    => gmdate('Y-m-d', strtotime('+3 months +2 days')),
			'deadline'    => gmdate('Y-m-d', strtotime('+2 months')),
		);

		// Allow customization via filter (used by WP Ultimo integration)
		$event_data = apply_filters('simplyconf_default_event_data', $event_data);

		// Use the centralized event creation function
		simplyconf_create_event($event_data);
	}
}

/**
 * Get terminology for entity with localization support
 * @param string  $entity   Entity type (abstract, author, reviewer, etc.)
 * @param integer $count    Count for plural forms (default: 1)
 * @param integer $event_id Event ID (null for current event)
 * @return string Translated and customized term
 */
function simplyconf_get_term( $entity, $count = 1, $event_id = null ) {
	global $wpdb;

	if ( ! $event_id) {
		$event_id = simplyconf_get_current_event_id();
	}

	// Get terminology settings from database
	$settings_tbl = SimplyConf_DB::get_table('settings');
	$terminology  = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT value FROM $settings_tbl WHERE event_id = %d AND category = 'general' AND name = 'terminology'",
			$event_id
		)
	);

	if ($terminology) {
		$terminology = json_decode($terminology, true);
		if (isset($terminology[ $entity ])) {
			return $count === 1 ? $terminology[ $entity ]['singular'] : $terminology[ $entity ]['plural'];
		}
	}

	// Fall back to translated defaults
	$defaults = array(
		'abstract'     => array( __('Abstract', 'simplyconf'), __('Abstracts', 'simplyconf') ),
		'author'       => array( __('Author', 'simplyconf'), __('Authors', 'simplyconf') ),
		'reviewer'     => array( __('Reviewer', 'simplyconf'), __('Reviewers', 'simplyconf') ),
		'review'       => array( __('Review', 'simplyconf'), __('Reviews', 'simplyconf') ),
		'session'      => array( __('Session', 'simplyconf'), __('Sessions', 'simplyconf') ),
		'track'        => array( __('Track', 'simplyconf'), __('Tracks', 'simplyconf') ),
		'submission'   => array( __('Submission', 'simplyconf'), __('Submissions', 'simplyconf') ),
		'registration' => array( __('Registration', 'simplyconf'), __('Registrations', 'simplyconf') ),
		'attendee'     => array( __('Attendee', 'simplyconf'), __('Attendees', 'simplyconf') ),
		'user'         => array( __('User', 'simplyconf'), __('Users', 'simplyconf') ),
	);

	return $defaults[ $entity ][ $count === 1 ? 0 : 1 ] ?? $entity;
}

/**
 * Format date according to WordPress locale settings
 * @param string $date   Date string or timestamp
 * @param string $format WordPress date format (optional, uses get_option if not provided)
 * @return string Formatted date
 */
function simplyconf_format_date( $date, $format = null ) {
	if ( ! $format) {
		$format = get_option('date_format', 'F j, Y');
	}

	// Convert to timestamp if needed
	if ( ! is_numeric($date)) {
		$timestamp = strtotime($date);
	} else {
		$timestamp = $date;
	}

	return date_i18n($format, $timestamp);
}

/**
 * Format date and time according to WordPress locale settings
 * @param string $date        Date string or timestamp
 * @param string $date_format WordPress date format (optional)
 * @param string $time_format WordPress time format (optional)
 * @return string Formatted date and time
 */
function simplyconf_format_datetime( $date, $date_format = null, $time_format = null ) {
	if ( ! $date_format) {
		$date_format = get_option('date_format', 'F j, Y');
	}
	if ( ! $time_format) {
		$time_format = get_option('time_format', 'g:i a');
	}

	// Convert to timestamp if needed
	if ( ! is_numeric($date)) {
		$timestamp = strtotime($date);
	} else {
		$timestamp = $date;
	}

	$formatted_date = date_i18n($date_format, $timestamp);
	$formatted_time = date_i18n($time_format, $timestamp);

	return $formatted_date . ' ' . $formatted_time;
}

/**
 * Get current WordPress locale
 * @return string Current locale (e.g., 'en_US', 'fr_FR')
 */
function simplyconf_get_locale() {
	return get_locale();
}

/**
 * Get language code from locale (first part before underscore)
 * @param string $locale Full locale (optional, uses current if not provided)
 * @return string Language code (e.g., 'en', 'fr')
 */
function simplyconf_get_language_code( $locale = null ) {
	if ( ! $locale) {
		$locale = simplyconf_get_locale();
	}
	return explode('_', $locale)[0];
}

/**
 * Check if current locale is RTL (Right-to-Left)
 * @param string $locale Locale to check (optional, uses current if not provided)
 * @return boolean Whether the locale is RTL
 */
function simplyconf_is_rtl( $locale = null ) {
	if ( ! $locale) {
		$locale = simplyconf_get_locale();
	}

	$language_code = simplyconf_get_language_code($locale);
	$rtl_languages = array(
		'ar', // Arabic
		'he', // Hebrew
		'fa', // Persian/Farsi
		'ur', // Urdu
		'yi', // Yiddish
		'ug', // Uyghur
		'ku', // Kurdish (some dialects)
	);

	return in_array($language_code, $rtl_languages);
}

/**
 * Get text direction for current locale
 * @param string $locale Locale to check (optional, uses current if not provided)
 * @return string 'rtl' or 'ltr'
 */
function simplyconf_get_text_direction( $locale = null ) {
	return simplyconf_is_rtl($locale) ? 'rtl' : 'ltr';
}

/**
 * Format number according to locale
 * @param float   $number   Number to format
 * @param integer $decimals Decimal places
 * @return string Formatted number
 */
function simplyconf_format_number( $number, $decimals = 0 ) {
	return number_format_i18n($number, $decimals);
}

/**
 * Format currency according to WordPress settings
 * @param float  $amount   Amount to format
 * @param string $currency Currency code (optional, uses WooCommerce or default)
 * @return string Formatted currency
 */
function simplyconf_format_currency( $amount, $currency = null ) {
	if ( ! $currency) {
		// Try to get currency from WooCommerce if available
		if (function_exists('get_woocommerce_currency')) {
			$currency = get_woocommerce_currency();
		} else {
			$currency = 'USD';
		}
	}

	// Use WooCommerce formatting if available
	if (function_exists('wc_price')) {
		return wc_price($amount);
	}

	// Fallback to basic formatting
	$symbol           = simplyconf_get_currency_symbol($currency);
	$formatted_amount = number_format_i18n($amount, 2);

	// Position symbol based on locale
	$locale = simplyconf_get_locale();
	if (in_array($locale, array( 'en_US', 'en_CA', 'en_AU', 'en_GB' ))) {
		return $symbol . $formatted_amount;
	} else {
		return $formatted_amount . ' ' . $symbol;
	}
}

/**
 * Get currency symbol for currency code
 * @param string $currency Currency code
 * @return string Currency symbol
 */
function simplyconf_get_currency_symbol( $currency ) {
	$symbols = array(
		'USD' => '$',
		'EUR' => '€',
		'GBP' => '£',
		'JPY' => '¥',
		'CAD' => 'C$',
		'AUD' => 'A$',
		'CHF' => 'CHF',
		'CNY' => '¥',
		'KRW' => '₩',
		'BRL' => 'R$',
	);

	return $symbols[ $currency ] ?? $currency;
}

/**
 * Retrieve a single setting value from the settings table.
 *
 * @param string  $name     Setting name (the `name` column).
 * @param integer $event_id Event ID scope.
 * @param string  $category Settings category (e.g. 'abstract', 'event', 'user').
 * @return string|null      Setting value, or null if not found.
 */
function simplyconf_get_setting( $name, $event_id, $category ) {
	global $wpdb;
	$settings_tbl = SimplyConf_DB::get_table('settings');
	return $wpdb->get_var(
		$wpdb->prepare(
			"SELECT value FROM {$settings_tbl} WHERE name = %s AND event_id = %d AND category = %s",
			$name,
			intval($event_id),
			$category
		)
	);
}

/**
 * Get current event ID (utility function)
 * @return integer Current event ID or 0 if not found
 */
function simplyconf_get_current_event_id() {
	global $wpdb;

	// Try to get from URL parameter
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading GET parameter for event context only.
	if ( isset( $_GET['event_id'] ) ) {
		return absint( $_GET['event_id'] );
	}

	// Try to get default event
	$events_tbl = SimplyConf_DB::get_table('events');
	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from SimplyConf_DB::get_table(); no user input.
	$event_id   = $wpdb->get_var("SELECT event_id FROM $events_tbl WHERE `default` = 1 LIMIT 1");

	return $event_id ? intval($event_id) : 0;
}

/**
 * Normalize custom fields from either format into {field_id: value} keyed array.
 *
 * Accepts two formats:
 *   Object (keyed):  { "1": "WAS", "2": "MIT" }
 *   Array of rows:   [{ "field_id": "1", "value": "WAS" }, ...]
 *
 * Always returns the keyed format: { field_id => value }
 *
 * @param array $custom_fields Custom fields in either format.
 * @return array Keyed array of field_id => value.
 */
function simplyconf_normalize_custom_fields( $custom_fields ) {
	if ( empty($custom_fields) || ! is_array($custom_fields) ) {
		return array();
	}

	// Check if this is an indexed array of {field_id, value} objects
	if ( isset($custom_fields[0]) && is_array($custom_fields[0]) && isset($custom_fields[0]['field_id']) ) {
		$normalized = array();
		foreach ( $custom_fields as $item ) {
			if ( isset($item['field_id']) && isset($item['value']) ) {
				$normalized[ $item['field_id'] ] = $item['value'];
			}
		}
		return $normalized;
	}

	// Already in {field_id: value} format
	return $custom_fields;
}

/**
 * Create a new abstract with validation, author linking, and email triggers
 * @param array $data Abstract data including event_id, track_id, session_id, title, description, status, custom_fields, authors
 * @return integer|WP_Error Abstract ID on success, WP_Error on failure
 */
function simplyconf_create_abstract( $data ) {
	global $wpdb;

	// Pre-create hook
	do_action('simplyconf_pre_create_abstract', $data);

	// Allow filtering of submission data for validation
	$data = apply_filters('simplyconf_validate_submission', $data);

	// Validate required fields
	if (empty($data['event_id']) || empty($data['title'])) {
		return new WP_Error('missing_required_fields', 'Missing required fields: event_id, title', array( 'status' => 400 ));
	}

	// Block submissions on archived events (admins are exempt)
	if ( ! current_user_can('manage_options')) {
		$events_tbl   = SimplyConf_DB::get_table('events');
		$event_status = $wpdb->get_var(
			$wpdb->prepare("SELECT status FROM $events_tbl WHERE event_id = %d", $data['event_id'])
		);
		if ($event_status === null) {
			return new WP_Error('invalid_event', 'Event not found.', array( 'status' => 404 ));
		}
		if ((int) $event_status === 0) {
			return new WP_Error(
				'event_archived',
				'Submissions are closed for this event.',
				array( 'status' => 403 )
			);
		}
	}

	$abstracts_tbl        = SimplyConf_DB::get_table('abstracts');
	$authors_tbl          = SimplyConf_DB::get_table('authors');
	$abstract_authors_tbl = SimplyConf_DB::get_table('abstract_authors');
	$custom_values_tbl    = SimplyConf_DB::get_table('custom_values');

	// Check submission limit for non-admin users
	$current_user_id = get_current_user_id();
	$is_admin = current_user_can('manage_options');
	
	if ( ! $is_admin && $current_user_id) {
		$submit_limit_setting = simplyconf_get_setting('submit_limit', $data['event_id'], 'abstract');
		$submit_limit = $submit_limit_setting ? intval($submit_limit_setting) : 0;
		
		if ($submit_limit > 0) {
			// Count user's existing abstracts for this event
			$user_abstract_count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM $abstracts_tbl WHERE event_id = %d AND submit_by = %d",
					$data['event_id'],
					$current_user_id
				)
			);
			
			if ($user_abstract_count >= $submit_limit) {
				return new WP_Error(
					'submission_limit_reached',
					sprintf(
						'You have reached the maximum submission limit of %d for this event.',
						$submit_limit
					),
					array( 'status' => 403 )
				);
			}
		}
	}

	// 1. Insert abstract
	$status_value = isset($data['status']) ? intval($data['status']) : 1;

	$wpdb->insert(
		$abstracts_tbl,
		array(
			'event_id'    => $data['event_id'],
			'track_id'    => $data['track_id'] ?? null,
			'session_id'  => $data['session_id'] ?? null,
			'title'       => $data['title'],
			'description' => $data['description'],
			'status'      => $status_value,
			'submit_by'   => get_current_user_id(),
			'created'     => current_time('mysql'),
			'modified'    => current_time('mysql'),
		)
	);

	if ($wpdb->last_error) {
		return new WP_Error('database_error', 'Failed to create abstract: ' . $wpdb->last_error, array( 'status' => 500 ));
	}

	$abstract_id = $wpdb->insert_id;

	// 2. Insert custom field values
	if ( ! empty($data['custom_fields'])) {
		foreach ($data['custom_fields'] as $field) {
			// Handle array values (like checkbox groups) by JSON encoding
			$value = is_array($field['value']) ? json_encode($field['value']) : $field['value'];

			$wpdb->insert(
				$custom_values_tbl,
				array(
					'entity_id'   => $abstract_id,
					'entity_type' => 'abstract',
					'field_id'    => $field['field_id'],
					'value'       => $value,
				)
			);
		}
	}

	// 3. Insert authors and link
	if ( ! empty($data['authors'])) {
		foreach ($data['authors'] as $i => $author) {
			$author_id = null;

			// Try to find existing author by email
			$existing = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT author_id FROM $authors_tbl WHERE email = %s",
					$author['email']
				)
			);

			if ($existing) {
				$author_id = $existing->author_id;

				// Update existing author's basic info if changed
				$wpdb->update(
					$authors_tbl,
					array(
						'first_name' => $author['first_name'],
						'last_name'  => $author['last_name'],
						'modified'   => current_time('mysql'),
					),
					array( 'author_id' => $author_id )
				);
			} else {
				// Create new author
				$wpdb->insert(
					$authors_tbl,
					array(
						'first_name' => $author['first_name'],
						'last_name'  => $author['last_name'],
						'email'      => $author['email'],
						'user_id'    => null, // External author by default
						'created'    => current_time('mysql'),
						'modified'   => current_time('mysql'),
					)
				);
				$author_id = $wpdb->insert_id;
			}

			// Link author to abstract
			$wpdb->insert(
				$abstract_authors_tbl,
				array(
					'abstract_id'      => $abstract_id,
					'author_id'        => $author_id,
					'author_order'     => $i,
					'is_corresponding' => ! empty($author['is_corresponding']) ? 1 : 0,
					'is_presenter'     => ! empty($author['is_presenter']) ? 1 : 0,
				)
			);

			// Handle author custom fields
			// Supports both formats:
			//   Object: {field_id: value}  (from AuthorManagement direct creation)
			//   Array:  [{field_id, value}] (from API response during edit/re-save)
			if ( ! empty($author['custom_fields'])) {
				$custom_fields = simplyconf_normalize_custom_fields($author['custom_fields']);
				foreach ($custom_fields as $field_id => $value) {
					// Encode arrays as JSON (e.g. checkbox groups)
					$field_value = is_array($value) ? json_encode($value) : $value;

					// Check if custom field value already exists
					$exists = $wpdb->get_var(
						$wpdb->prepare(
							"SELECT COUNT(*) FROM {$custom_values_tbl}
                        WHERE entity_id = %d AND entity_type = 'author' AND field_id = %d",
							$author_id,
							$field_id
						)
					);

					if ($exists) {
						// Update existing value
						$wpdb->update(
							$custom_values_tbl,
							array( 'value' => $field_value ),
							array(
								'entity_id'   => $author_id,
								'entity_type' => 'author',
								'field_id'    => $field_id,
							)
						);
					} else {
						// Insert new value
						$wpdb->insert(
							$custom_values_tbl,
							array(
								'entity_id'   => $author_id,
								'entity_type' => 'author',
								'field_id'    => $field_id,
								'value'       => $field_value,
							)
						);
					}
				}
			}
		}
	}

	// Only trigger submission email if this is not a draft
	$statuses_tbl    = SimplyConf_DB::get_table('statuses');
	$draft_status    = $wpdb->get_row(
		$wpdb->prepare(
			"SELECT status_id FROM $statuses_tbl WHERE event_id = %d AND type = 'abstract' AND name = 'draft'",
			$data['event_id']
		)
	);
	$draft_status_id = $draft_status ? $draft_status->status_id : null;

	if ($status_value != $draft_status_id) {
		// Allow filtering of email notification
		$email_data = apply_filters(
			'simplyconf_email_notification',
			array(
				'action'      => 'simplyconf_abstract_submission',
				'abstract_id' => $abstract_id,
				'user_id'     => get_current_user_id(),
				'type'        => 'submission',
			),
			$abstract_id,
			get_current_user_id()
		);

		// Only send email if not filtered out
		if ($email_data) {
			do_action($email_data['action'], $email_data['abstract_id'], $email_data['user_id']);
		}
	}

	// Post-create hook
	do_action('simplyconf_post_create_abstract', $abstract_id, $data);

	return $abstract_id;
}

/**
 * Update an existing abstract with validation, author updates, and status change email triggers
 * @param integer $abstract_id Abstract ID to update
 * @param array   $data        Updated abstract data including title, description, status, custom_fields, authors, etc.
 * @return array|WP_Error Updated abstract data on success, WP_Error on failure
 */
function simplyconf_update_abstract( $abstract_id, $data ) {
	global $wpdb;

	// Pre-update hook
	do_action('simplyconf_pre_update_abstract', $abstract_id, $data);

	// Validate abstract exists
	$abstracts_tbl  = SimplyConf_DB::get_table('abstracts');
	$abstract_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$abstracts_tbl} WHERE abstract_id = %d", $abstract_id));
	if ( ! $abstract_count) {
		return new WP_Error('invalid_abstract_id', 'Could not locate abstract id', array( 'status' => 400 ));
	}

	// Block updates on archived events (admins are exempt)
	if ( ! current_user_can('manage_options')) {
		$events_tbl        = SimplyConf_DB::get_table('events');
		$abstract_event_id = $wpdb->get_var(
			$wpdb->prepare("SELECT event_id FROM {$abstracts_tbl} WHERE abstract_id = %d", $abstract_id)
		);
		$event_status      = $wpdb->get_var(
			$wpdb->prepare("SELECT status FROM $events_tbl WHERE event_id = %d", $abstract_event_id)
		);
		if ((int) $event_status === 0) {
			return new WP_Error(
				'event_archived',
				'This event is archived. Submissions cannot be modified.',
				array( 'status' => 403 )
			);
		}
	}

	$custom_values_tbl = SimplyConf_DB::get_table('custom_values');

	// Get the old status before updating to check for changes
	$old_status = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT status FROM {$abstracts_tbl} WHERE abstract_id = %d",
			$abstract_id
		)
	);

	// Update main abstract fields
	$main_fields      = array(
		'event_id',
		'track_id',
		'session_id',
		'title',
		'description',
		'status',
		'modified',
	);
	$data['modified'] = current_time('mysql');
	$update_data      = array_intersect_key($data, array_flip($main_fields));

	// Ensure status is properly converted to integer
	if (isset($update_data['status'])) {
		$update_data['status'] = intval($update_data['status']);
	}

	$wpdb->update($abstracts_tbl, $update_data, array( 'abstract_id' => $abstract_id ));

	if ($wpdb->last_error) {
		return new WP_Error('database_error', 'Failed to update abstract: ' . $wpdb->last_error, array( 'status' => 500 ));
	}

	// Update custom fields
	if ( ! empty($data['custom_fields'])) {
		foreach ($data['custom_fields'] as $field) {
			// Handle array values (like checkbox groups) by JSON encoding
			$value = is_array($field['value']) ? json_encode($field['value']) : $field['value'];

			$exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$custom_values_tbl} WHERE entity_id = %d AND entity_type = 'abstract' AND field_id = %d", $abstract_id, $field['field_id']));
			if ($exists) {
				$wpdb->update($custom_values_tbl, array( 'value' => $value ), array( 'entity_id' => $abstract_id, 'entity_type' => 'abstract', 'field_id' => $field['field_id'] ));
			} else {
				$wpdb->insert($custom_values_tbl, array( 'entity_id' => $abstract_id, 'entity_type' => 'abstract', 'field_id' => $field['field_id'], 'value' => $value ));
			}
		}
	}

	// Update authors
	if (isset($data['authors'])) {
		$authors_tbl          = SimplyConf_DB::get_table('authors');
		$abstract_authors_tbl = SimplyConf_DB::get_table('abstract_authors');

		// Remove existing author links
		$wpdb->delete($abstract_authors_tbl, array( 'abstract_id' => $abstract_id ));

		// Re-add authors with updated information
		foreach ($data['authors'] as $i => $author) {
			$author_id = null;

			// Try to find existing author by email
			$existing = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT author_id FROM $authors_tbl WHERE email = %s",
					$author['email']
				)
			);

			if ($existing) {
				$author_id = $existing->author_id;

				// Update existing author's basic info if changed
				$wpdb->update(
					$authors_tbl,
					array(
						'first_name' => $author['first_name'],
						'last_name'  => $author['last_name'],
						'modified'   => current_time('mysql'),
					),
					array( 'author_id' => $author_id )
				);
			} else {
				// Create new author
				$wpdb->insert(
					$authors_tbl,
					array(
						'first_name' => $author['first_name'],
						'last_name'  => $author['last_name'],
						'email'      => $author['email'],
						'user_id'    => null,
						'created'    => current_time('mysql'),
						'modified'   => current_time('mysql'),
					)
				);
				$author_id = $wpdb->insert_id;
			}

			// Link author to abstract
			$wpdb->insert(
				$abstract_authors_tbl,
				array(
					'abstract_id'      => $abstract_id,
					'author_id'        => $author_id,
					'author_order'     => $i,
					'is_corresponding' => ! empty($author['is_corresponding']) ? 1 : 0,
					'is_presenter'     => ! empty($author['is_presenter']) ? 1 : 0,
				)
			);

			// Handle author custom fields
			// Supports both formats:
			//   Object: {field_id: value}  (from AuthorManagement direct creation)
			//   Array:  [{field_id, value}] (from API response during edit/re-save)
			if ( ! empty($author['custom_fields'])) {
				$custom_fields = simplyconf_normalize_custom_fields($author['custom_fields']);
				foreach ($custom_fields as $field_id => $value) {
					// Encode arrays as JSON (e.g. checkbox groups)
					$field_value = is_array($value) ? json_encode($value) : $value;

					// Check if custom field value already exists
					$exists = $wpdb->get_var(
						$wpdb->prepare(
							"SELECT COUNT(*) FROM {$custom_values_tbl}
                        WHERE entity_id = %d AND entity_type = 'author' AND field_id = %d",
							$author_id,
							$field_id
						)
					);

					if ($exists) {
						// Update existing value
						$wpdb->update(
							$custom_values_tbl,
							array( 'value' => $field_value ),
							array(
								'entity_id'   => $author_id,
								'entity_type' => 'author',
								'field_id'    => $field_id,
							)
						);
					} else {
						// Insert new value
						$wpdb->insert(
							$custom_values_tbl,
							array(
								'entity_id'   => $author_id,
								'entity_type' => 'author',
								'field_id'    => $field_id,
								'value'       => $field_value,
							)
						);
					}
				}
			}
		}
	}

	// Fetch updated abstract for response
	$abstract = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$abstracts_tbl} WHERE abstract_id = %d", $abstract_id), ARRAY_A);

	// Fetch custom fields and authors for response
	$custom_fields             = $wpdb->get_results($wpdb->prepare("SELECT field_id, value FROM {$custom_values_tbl} WHERE entity_id = %d AND entity_type = 'abstract'", $abstract_id), ARRAY_A);
	$abstract['custom_fields'] = $custom_fields;

	// Fetch authors with custom fields
	$authors_tbl          = SimplyConf_DB::get_table('authors');
	$abstract_authors_tbl = SimplyConf_DB::get_table('abstract_authors');
	$authors              = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT a.*, aa.author_order, aa.is_corresponding, aa.is_presenter 
        FROM $authors_tbl a 
        JOIN $abstract_authors_tbl aa ON a.author_id = aa.author_id 
        WHERE aa.abstract_id = %d 
        ORDER BY aa.author_order ASC",
			$abstract_id
		),
		ARRAY_A
	);

	// Fetch custom fields for each author
	foreach ($authors as &$author) {
		$author_custom_fields = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT field_id, value FROM {$custom_values_tbl} 
            WHERE entity_id = %d AND entity_type = 'author'",
				$author['author_id']
			),
			ARRAY_A
		);

		// Deserialize JSON values
		foreach ($author_custom_fields as &$field) {
			$decoded = json_decode($field['value'], true);
			if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
				$field['value'] = $decoded;
			}
		}

		$author['custom_fields'] = $author_custom_fields;
	}

	$abstract['authors'] = $authors;

	// Check if this is a draft status to avoid sending emails for draft saves
	$statuses_tbl    = SimplyConf_DB::get_table('statuses');
	$draft_status    = $wpdb->get_row(
		$wpdb->prepare(
			"SELECT status_id FROM $statuses_tbl WHERE event_id = %d AND type = 'abstract' AND name = 'draft'",
			$abstract['event_id']
		)
	);
	$draft_status_id = $draft_status ? $draft_status->status_id : null;

	// Determine what type of email to send based on status changes
	$status_changed             = isset($data['status']) && $old_status !== null && $old_status != $data['status'];
	$is_draft_to_submitted      = $status_changed && $old_status == $draft_status_id && $data['status'] != $draft_status_id;
	$is_non_draft_status_change = $status_changed && $old_status != $draft_status_id && $data['status'] != $draft_status_id;
	$is_non_draft_update        = ! $status_changed && $old_status !== null && $old_status != $draft_status_id;

	if ($is_draft_to_submitted) {
		// Transition from draft to submitted - trigger submission email ONLY
		$email_data = apply_filters(
			'simplyconf_email_notification',
			array(
				'action'      => 'simplyconf_abstract_submission',
				'abstract_id' => $abstract_id,
				'user_id'     => get_current_user_id(),
				'type'        => 'draft_to_submitted',
			),
			$abstract_id,
			get_current_user_id()
		);

		if ($email_data) {
			do_action($email_data['action'], $email_data['abstract_id'], $email_data['user_id']);
		}
	} elseif ($is_non_draft_status_change) {
		// Status change between non-draft statuses - trigger status change email
		$email_data = apply_filters(
			'simplyconf_email_notification',
			array(
				'action'      => 'simplyconf_abstract_status_change',
				'abstract_id' => $abstract_id,
				'user_id'     => get_current_user_id(),
				'type'        => 'status_change',
				'new_status'  => $data['status'],
			),
			$abstract_id,
			get_current_user_id()
		);

		if ($email_data) {
			do_action($email_data['action'], $email_data['abstract_id'], $email_data['user_id'], $email_data['new_status']);
		}
	} elseif ($is_non_draft_update) {
		// Regular update to a non-draft abstract - trigger revision email
		$email_data = apply_filters(
			'simplyconf_email_notification',
			array(
				'action'      => 'simplyconf_abstract_revision',
				'abstract_id' => $abstract_id,
				'user_id'     => get_current_user_id(),
				'type'        => 'revision',
			),
			$abstract_id,
			get_current_user_id()
		);

		if ($email_data) {
			do_action($email_data['action'], $email_data['abstract_id'], $email_data['user_id']);
		}
	}  // No emails for: draft saves, changes to draft status, or any draft-related operations

	// Post-update hook
	do_action('simplyconf_post_update_abstract', $abstract_id, $data);

	return $abstract;
}

/**
 * Delete an abstract with cleanup of attachments, custom fields, and author links
 * @param integer $abstract_id Abstract ID to delete
 * @return array|WP_Error Deletion results on success, WP_Error on failure
 */
function simplyconf_delete_abstract( $abstract_id ) {
	global $wpdb;

	// Pre-delete hook
	do_action('simplyconf_pre_delete_abstract', $abstract_id);

	// Validate abstract exists
	$abstracts_tbl = SimplyConf_DB::get_table('abstracts');
	$found         = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$abstracts_tbl} WHERE abstract_id = %d", $abstract_id));
	if ( ! $found) {
		return new WP_Error('invalid_abstract_id', 'Could not locate abstract id', array( 'status' => 400 ));
	}

	$custom_values_tbl    = SimplyConf_DB::get_table('custom_values');
	$attachments_tbl      = SimplyConf_DB::get_table('attachments');
	$file_logs_tbl        = SimplyConf_DB::get_table('file_logs');
	$abstract_authors_tbl = SimplyConf_DB::get_table('abstract_authors');

	// Delete attachments associated with this abstract
	$attachments = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT * FROM {$attachments_tbl} WHERE entity_type = 'abstract' AND entity_id = %d",
			$abstract_id
		)
	);

	$attachment_count = 0;
	if ( ! empty($attachments)) {
		foreach ($attachments as $attachment) {
			// Delete WordPress attachment file
			wp_delete_attachment($attachment->wp_attachment_id, true);

			// Log the deletion
			$wpdb->insert(
				$file_logs_tbl,
				array(
					'attachment_id' => $attachment->attachment_id,
					'user_id'       => get_current_user_id(),
					'action'        => 'delete',
					'ip_address'    => sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) ),
					'user_agent'    => sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ?? '' ) ),
					'created'       => current_time('mysql'),
				)
			);

			++$attachment_count;
		}

		// Delete attachment records from our table
		$wpdb->delete($attachments_tbl, array( 'entity_id' => $abstract_id, 'entity_type' => 'abstract' ));
	}

	// Delete custom field values
	$wpdb->delete($custom_values_tbl, array( 'entity_id' => $abstract_id, 'entity_type' => 'abstract' ));

	// Delete author links (but not authors themselves yet)
	$wpdb->delete($abstract_authors_tbl, array( 'abstract_id' => $abstract_id ));

	// Clean up orphaned authors (authors no longer linked to any abstracts)
	$authors_tbl = SimplyConf_DB::get_table('authors');
	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table names are safe from SimplyConf_DB::get_table()
	$orphaned_authors = $wpdb->get_results("
		SELECT a.author_id
		FROM {$authors_tbl} a
		LEFT JOIN {$abstract_authors_tbl} aa ON a.author_id = aa.author_id
		WHERE aa.author_id IS NULL
	");

	foreach ($orphaned_authors as $author) {
		// Delete custom field values for this author
		$wpdb->delete($custom_values_tbl, array( 'entity_id' => $author->author_id, 'entity_type' => 'author' ));
		// Delete the orphaned author
		$wpdb->delete($authors_tbl, array( 'author_id' => $author->author_id ));
	}

	// Trigger before delete hook
	do_action('simplyconf_before_delete_abstract', $abstract_id);

	// Delete the abstract
	$abs_results = $wpdb->delete($abstracts_tbl, array( 'abstract_id' => $abstract_id ));
	// Reviews deletion moved to addon via hook

	$results           = new stdClass();
	$results->id       = $abstract_id;
	$results->affected = array(
		'abstracts'   => $abs_results,
		'attachments' => $attachment_count,
	);

	// Post-delete hook
	do_action('simplyconf_post_delete_abstract', $abstract_id);

	return $results;
}

/**
 * Check if a user is a track chair
 *
 * @param integer $user_id User ID to check (optional, defaults to current user)
 * @return boolean True if user is a track chair, false otherwise
 */
function simplyconf_is_track_chair( $user_id = null ) {
	global $wpdb;
	
	// Default to current user if not specified
	if ( ! $user_id) {
		$user_id = get_current_user_id();
	}
	
	// Not logged in
	if ( ! $user_id) {
		return false;
	}
	
	// Check if track_assignments table exists (reviews addon may not be active)
	$track_assignments_tbl = SimplyConf_DB::get_table('track_assignments');
	
	if ( ! $track_assignments_tbl) {
		return false;
	}
	
	// Check if user has any track chair assignments
	$is_track_chair = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$track_assignments_tbl} WHERE user_id = %d",
			$user_id
		)
	);
	
	return $is_track_chair > 0;
}

/**
 * Check if a user is a track chair for a specific abstract's track
 *
 * @param integer $abstract_id Abstract ID to check
 * @param integer $event_id    Event ID
 * @param integer $user_id     User ID to check (optional, defaults to current user)
 * @return boolean True if user is a track chair for the abstract's track, false otherwise
 */
function simplyconf_is_track_chair_for_abstract( $abstract_id, $event_id, $user_id = null ) {
	global $wpdb;
	
	// Default to current user if not specified
	if ( ! $user_id) {
		$user_id = get_current_user_id();
	}
	
	// Not logged in
	if ( ! $user_id) {
		return false;
	}
	
	// Check if tables exist (reviews addon may not be active)
	$abstracts_tbl = SimplyConf_DB::get_table('abstracts');
	$track_assignments_tbl = SimplyConf_DB::get_table('track_assignments');
	
	if ( ! $abstracts_tbl || ! $track_assignments_tbl) {
		return false;
	}
	
	// Check if user is a track chair for the track that contains this abstract
	$is_track_chair = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$abstracts_tbl} a 
			INNER JOIN {$track_assignments_tbl} ta ON a.track_id = ta.track_id 
			WHERE a.abstract_id = %d AND ta.user_id = %d AND ta.event_id = %d",
			$abstract_id,
			$user_id,
			$event_id
		)
	);
	
	return $is_track_chair > 0;
}

/**
 * Check if running in SaaS mode
 * Enhanced with multi-layer validation to prevent bypassing
 *
 * @return boolean
 */
function simplyconf_is_saas() {
	// Check constant
	$constant_check = defined('SIMPLYCONF_SAAS_MODE') && SIMPLYCONF_SAAS_MODE === true;
	
	// Verify it's actually multisite (required for true SaaS)
	$multisite_check = is_multisite();
	
	// Verify WP Ultimo is active (for true SaaS environment)
	$ultimo_check = function_exists('wu_get_current_site');
	
	// All three must be true for SaaS mode
	// This prevents users from simply setting the constant to bypass license checks
	return $constant_check && $multisite_check && $ultimo_check;
}
