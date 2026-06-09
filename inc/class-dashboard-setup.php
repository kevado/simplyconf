<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
/**
 * Dashboard Setup Class
 * Handles one-click dashboard page creation and management
 */

class SimplyConf_Dashboard_Setup {

	/**
	 * Get the dashboard page for a specific event
	 *
	 * @param int $event_id Event ID
	 * @return WP_Post|null Dashboard page or null if not found
	 */
	public static function get_dashboard_page( $event_id = 1 ) {
		$page_id = get_option('simplyconf_dashboard_page_id_event_' . $event_id);
		
		if ( ! $page_id) {
			return null;
		}
		
		$page = get_post($page_id);
		
		// Check if page still exists and is published
		if ( ! $page || $page->post_status === 'trash') {
			// Clean up stale option
			delete_option('simplyconf_dashboard_page_id_event_' . $event_id);
			return null;
		}
		
		return $page;
	}

	/**
	 * Create a new dashboard page with the SimplyConf Dashboard block
	 *
	 * @param int $event_id Event ID to configure the dashboard block for
	 * @return array Result array with success status, page_id, and message
	 */
	public static function create_dashboard_page( $event_id = 1 ) {
		// Check if page already exists for this event
		$existing_page = self::get_dashboard_page($event_id);
		
		if ($existing_page) {
			return array(
				'success' => false,
				'message' => __('A dashboard page already exists for this event.', 'simplyconf'),
				'page_id' => $existing_page->ID,
				'page_url' => get_permalink($existing_page->ID),
				'edit_url' => get_edit_post_link($existing_page->ID, 'raw'),
			);
		}

		// Get event name
		global $wpdb;
		$events_tbl = SimplyConf_DB::get_table('events');
		$event = $wpdb->get_row($wpdb->prepare("SELECT name FROM {$events_tbl} WHERE event_id = %d", $event_id));
		$event_name = $event ? $event->name : __('Event', 'simplyconf') . ' ' . $event_id;

		// Create the page
		$page_data = array(
			// translators: %s is the event name.
		'post_title'   => sprintf(__('%s - Dashboard', 'simplyconf'), $event_name),
			'post_content' => '<!-- wp:simplyconf/dashboard {"align":"full","eventId":' . intval($event_id) . '} /-->',
			'post_status'  => 'publish',
			'post_type'    => 'page',
			'post_author'  => get_current_user_id(),
		);

		$page_id = wp_insert_post($page_data);

		if (is_wp_error($page_id)) {
			return array(
				'success' => false,
				'message' => $page_id->get_error_message(),
			);
		}

		// Try to assign a full-width template
		$template = self::assign_fullwidth_template($page_id);

		// Store the page ID for this specific event
		update_option('simplyconf_dashboard_page_id_event_' . $event_id, $page_id);

		return array(
			'success'  => true,
			'message'  => __('Dashboard page created successfully!', 'simplyconf'),
			'page_id'  => $page_id,
			'page_url' => get_permalink($page_id),
			'edit_url' => get_edit_post_link($page_id, 'raw'),
			'template' => $template,
		);
	}

	/**
	 * Delete the dashboard page for a specific event
	 *
	 * @param int $event_id Event ID
	 * @return array Result array with success status and message
	 */
	public static function delete_dashboard_page( $event_id = 1 ) {
		$page = self::get_dashboard_page($event_id);
		
		if ( ! $page) {
			return array(
				'success' => false,
				'message' => __('No dashboard page found for this event.', 'simplyconf'),
			);
		}

		wp_delete_post($page->ID, true);
		delete_option('simplyconf_dashboard_page_id_event_' . $event_id);

		return array(
			'success' => true,
			'message' => __('Dashboard page deleted successfully.', 'simplyconf'),
		);
	}

	/**
	 * Attempt to assign a full-width template to the page
	 *
	 * @param int $page_id Page ID
	 * @return string|null Template slug if assigned, null otherwise
	 */
	private static function assign_fullwidth_template( $page_id ) {
		$templates = self::get_available_templates();
		
		// Priority order for full-width templates
		$preferred_templates = array( 'full-width', 'no-sidebar', 'blank', 'fullwidth' );
		
		foreach ($preferred_templates as $template_slug) {
			if (isset($templates[ $template_slug ])) {
				update_post_meta($page_id, '_wp_page_template', $template_slug . '.php');
				return $template_slug;
			}
		}
		
		return null;
	}

	/**
	 * Get available page templates from the current theme
	 *
	 * @return array Available templates
	 */
	private static function get_available_templates() {
		$templates = wp_get_theme()->get_page_templates();
		return $templates;
	}

	/**
	 * Extract event ID from dashboard page content
	 *
	 * @param string $content Page content
	 * @return int Event ID or 1 as default
	 */
	private static function extract_event_id_from_content( $content ) {
		// Look for the eventId in the block attributes
		if (preg_match('/"eventId":(\d+)/', $content, $matches)) {
			return intval($matches[1]);
		}
		return 1;
	}

	/**
	 * Get dashboard page status information
	 *
	 * @param int $event_id Event ID (kept for future per-event implementation)
	 * @return array Status information
	 */
	public static function get_status( $event_id = 1 ) {
		$page = self::get_dashboard_page($event_id);
		
		if ( ! $page) {
			return array(
				'exists'   => false,
				'page_id'  => null,
				'page_url' => null,
				'edit_url' => null,
			);
		}

		return array(
			'exists'   => true,
			'page_id'  => $page->ID,
			'page_url' => get_permalink($page->ID),
			'edit_url' => get_edit_post_link($page->ID, 'raw'),
			'title'    => $page->post_title,
			'status'   => $page->post_status,
		);
	}
}
