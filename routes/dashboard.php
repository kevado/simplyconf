<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Dashboard API routes for statistics and overview data
 */
class SimplyConf_Dashboard_Routes {

	public function __construct() {
		add_action('rest_api_init', array( $this, 'create_rest_routes' ));
	}

	public function create_rest_routes() {
		register_rest_route(
			'simplyconf/v1',
			'/dashboard/stats',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_dashboard_stats' ),
				'permission_callback' => function () {
					// Allow filtering of permission checks
					return apply_filters('simplyconf_permission_check', current_user_can('manage_options'), 'dashboard_stats');
				},
				'args'                => array(
					'event_id' => array(
						'required'          => false,
						'validate_callback' => function ( $param, $request, $key ) {
							return is_numeric($param);
						},
					),
				),
			)
		);

		register_rest_route(
			'simplyconf/v1',
			'/dashboard/activity',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_recent_activity' ),
				'permission_callback' => function () {
					return apply_filters('simplyconf_permission_check', current_user_can('manage_options'), 'dashboard_activity');
				},
				'args'                => array(
					'event_id' => array(
						'required'          => false,
						'validate_callback' => function ( $param, $request, $key ) {
							return is_numeric($param);
						},
					),
					'limit'    => array(
						'required'          => false,
						'default'           => 20,
						'validate_callback' => function ( $param, $request, $key ) {
							return is_numeric($param) && $param > 0 && $param <= 100;
						},
					),
				),
			)
		);

		register_rest_route(
			'simplyconf/v1',
			'/dashboard/versions',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_versions' ),
				'permission_callback' => function () {
					return apply_filters('simplyconf_permission_check', current_user_can('manage_options'), 'dashboard_versions');
				},
			)
		);
	}

	public function get_dashboard_stats( $request ) {
		global $wpdb;

		$event_id = $request->get_param('event_id');

		// Get tables
		$abstracts_tbl        = SimplyConf_DB::get_table('abstracts');
		$users_tbl            = $wpdb->users;
		$event_user_roles_tbl = SimplyConf_DB::get_table('event_user_roles');
		$attachments_tbl      = SimplyConf_DB::get_table('attachments');
		$statuses_tbl         = SimplyConf_DB::get_table('statuses');

		// Base where clause for event filtering
		$where_event     = $event_id ? $wpdb->prepare('WHERE event_id = %d', $event_id) : '';
		$where_event_and = $event_id ? $wpdb->prepare('WHERE a.event_id = %d', $event_id) : 'WHERE 1=1';

		// Get draft status ID to exclude from abstract count
		$draft_status_id = null;
		if ($event_id) {
			$draft_status    = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT status_id FROM $statuses_tbl WHERE event_id = %d AND type = 'abstract' AND name = 'draft'",
					$event_id
				)
			);
			$draft_status_id = $draft_status ? $draft_status->status_id : null;
		}

		// 1. Count abstracts (excluding drafts) and draft count
		$abstracts_query = "SELECT COUNT(*) FROM $abstracts_tbl";
		$drafts_query    = "SELECT COUNT(*) FROM $abstracts_tbl";

		if ($event_id) {
			$abstracts_query .= $wpdb->prepare(' WHERE event_id = %d', $event_id);
			$drafts_query    .= $wpdb->prepare(' WHERE event_id = %d', $event_id);
			if ($draft_status_id) {
				$abstracts_query .= $wpdb->prepare(' AND status != %d', $draft_status_id);
				$drafts_query    .= $wpdb->prepare(' AND status = %d', $draft_status_id);
			}
		} elseif ($draft_status_id) {
			$abstracts_query .= $wpdb->prepare(' WHERE status != %d', $draft_status_id);
			$drafts_query    .= $wpdb->prepare(' WHERE status = %d', $draft_status_id);
		}

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table name from SimplyConf_DB::get_table(); user values use $wpdb->prepare() fragments.
		$abstracts_count = $wpdb->get_var($abstracts_query);
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table name from SimplyConf_DB::get_table(); user values use $wpdb->prepare() fragments.
		$drafts_count    = $draft_status_id ? $wpdb->get_var($drafts_query) : 0;

		// 2. Count documents/attachments and downloads
		$documents_query = "SELECT COUNT(*) FROM $attachments_tbl";
		$downloads_count = 0;
		if ($event_id) {
			// Join with abstracts to filter by event
			$documents_count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(DISTINCT at.attachment_id) 
                 FROM $attachments_tbl at 
                 JOIN $abstracts_tbl a ON at.entity_id = a.abstract_id 
                 WHERE at.entity_type = 'abstract' AND a.event_id = %d",
					$event_id
				)
			);
			// Sum all download counts for this event
			$downloads_count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COALESCE(SUM(at.download_count), 0) 
                 FROM $attachments_tbl at 
                 JOIN $abstracts_tbl a ON at.entity_id = a.abstract_id 
                 WHERE at.entity_type = 'abstract' AND a.event_id = %d",
					$event_id
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table name from SimplyConf_DB::get_table(); no user input.
			$documents_count = $wpdb->get_var($documents_query);
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from SimplyConf_DB::get_table(); no user input.
			$downloads_count = $wpdb->get_var("SELECT COALESCE(SUM(download_count), 0) FROM $attachments_tbl");
		}

		// 3. Count users by role
		if ($event_id) {
			// Total users for this event
			$users_count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(DISTINCT user_id) FROM $event_user_roles_tbl WHERE event_id = %d",
					$event_id
				)
			);

			// Authors (users with 'author' role)
			$authors_count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(DISTINCT user_id) FROM $event_user_roles_tbl 
                 WHERE event_id = %d AND role = 'author'",
					$event_id
				)
			);

			// Reviewers (users with 'reviewer' role)
			$reviewers_count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(DISTINCT user_id) FROM $event_user_roles_tbl 
                 WHERE event_id = %d AND role = 'reviewer'",
					$event_id
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from SimplyConf_DB::get_table(); no user input.
			$users_count     = $wpdb->get_var("SELECT COUNT(*) FROM $users_tbl");
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from SimplyConf_DB::get_table(); no user input.
			$authors_count   = $wpdb->get_var("SELECT COUNT(DISTINCT user_id) FROM $event_user_roles_tbl WHERE role = 'author'");
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from SimplyConf_DB::get_table(); no user input.
			$reviewers_count = $wpdb->get_var("SELECT COUNT(DISTINCT user_id) FROM $event_user_roles_tbl WHERE role = 'reviewer'");
		}

		// Core plugin stats organized by category
		$stats = array(
			// Abstracts category
			'abstracts' => array(
				'total'       => (int) $abstracts_count,
				'drafts'      => (int) $drafts_count,
				'attachments' => (int) $documents_count,
			),
			// Users category
			'users'     => array(
				'total'     => (int) $users_count,
				'authors'   => (int) $authors_count,
				'reviewers' => (int) $reviewers_count,
			),
		);

		// Check which addons are active using the core addon registry
		// Reviews addon stats
		$stats['reviews'] = array( 'addon_active' => simplyconf_has_addon('reviews') );

		// Emails addon stats
		$stats['emails'] = array( 'addon_active' => simplyconf_has_addon('emails') );

		// Payments addon stats
		$stats['payments'] = array( 'addon_active' => simplyconf_has_addon('payments') );

		// Schedules addon stats
		$stats['schedules'] = array( 'addon_active' => simplyconf_has_addon('schedules') );

		// Allow addons to inject their stats (will populate the addon sections if active)
		$stats = apply_filters('simplyconf_dashboard_stats', $stats, $event_id);

		return rest_ensure_response($stats);
	}

	public function get_recent_activity( $request ) {
		global $wpdb;

		$event_id = $request->get_param('event_id');
		$limit    = $request->get_param('limit') ?: 20;

		$activities = array();

		// Get table names
		$abstracts_tbl   = SimplyConf_DB::get_table('abstracts');
		$reviews_tbl     = SimplyConf_DB::get_table('reviews');
		$events_tbl      = SimplyConf_DB::get_table('events');
		$attachments_tbl = SimplyConf_DB::get_table('attachments');

		// Base where clause for event filtering
		$where_event = $event_id ? $wpdb->prepare('AND event_id = %d', $event_id) : '';

		// 1. Abstract submissions and updates
		$abstracts_query = $wpdb->prepare(
			"
            SELECT 
                'abstract' as type,
                abstract_id as entity_id,
                title as title,
                GREATEST(created, COALESCE(modified, created)) as activity_date,
                CASE 
                    WHEN modified IS NOT NULL AND modified > created THEN 'updated'
                    ELSE 'submitted'
                END as action,
                submit_by as user_id,
                event_id
            FROM $abstracts_tbl 
            WHERE 1=1 $where_event
            ORDER BY activity_date DESC 
            LIMIT %d
        ",
			$limit
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Query built with $wpdb->prepare(); table names from SimplyConf_DB::get_table().
		$abstract_activities = $wpdb->get_results($abstracts_query);
		if ($abstract_activities) {
			$activities = array_merge($activities, $abstract_activities);
		}

		// 2. Review submissions and updates (if reviews addon active)
		if (simplyconf_has_addon('reviews')) {
			$where_review_event = $event_id ? $wpdb->prepare('AND r.event_id = %d', $event_id) : '';
			$reviews_query      = $wpdb->prepare(
				"
                SELECT 
                    'review' as type,
                    r.review_id as entity_id,
                    CONCAT('Review for: ', a.title) as title,
                    GREATEST(r.created, COALESCE(r.modified, r.created)) as activity_date,
                    CASE 
                        WHEN r.modified IS NOT NULL AND r.modified > r.created THEN 'updated'
                        ELSE 'submitted'
                    END as action,
                    r.reviewer_id as user_id,
                    r.event_id
                FROM $reviews_tbl r
                JOIN $abstracts_tbl a ON r.abstract_id = a.abstract_id
                WHERE 1=1 $where_review_event
                ORDER BY activity_date DESC 
                LIMIT %d
            ",
				$limit
			);

			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Query built with $wpdb->prepare(); table names from SimplyConf_DB::get_table().
			$review_activities = $wpdb->get_results($reviews_query);
			if ($review_activities) {
				$activities = array_merge($activities, $review_activities);
			}
		}

		// 3. New registrations (if payments addon active and table exists)
		if (simplyconf_has_addon('payments')) {
			$registrations_tbl = SimplyConf_DB::get_table('registrations');
			$table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $registrations_tbl));
			if ( $table_exists ) {
				$registrations_query = $wpdb->prepare(
					"
	                SELECT
	                    'registration' as type,
	                    id as entity_id,
	                    CONCAT('Registration: ', COALESCE(attendee_name, 'User')) as title,
	                    created_at as activity_date,
	                    'registered' as action,
	                    user_id,
	                    event_id
	                FROM $registrations_tbl
	                WHERE 1=1 $where_event
	                ORDER BY created_at DESC
	                LIMIT %d
	            ",
					$limit
				);

				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Query built with $wpdb->prepare(); table names from SimplyConf_DB::get_table().
			$registration_activities = $wpdb->get_results($registrations_query);
				if ($registration_activities) {
					$activities = array_merge($activities, $registration_activities);
				}
			}
		}

		// 4. Email sends (if emails addon active) -- turn off email activity logging for now
		// if (simplyconf_has_addon('emails')) {
		//     $email_logs_tbl = SimplyConf_DB::get_table('email_logs');
		//     $emails_query = $wpdb->prepare("
		//         SELECT
		//             'email' as type,
		//             log_id as entity_id,
		//             CONCAT('Email sent to: ', recipient_email) as title,
		//             sent_at as activity_date,
		//             'sent' as action,
		//             NULL as user_id,
		//             event_id
		//         FROM $email_logs_tbl
		//         WHERE sent_at IS NOT NULL $where_event
		//         ORDER BY sent_at DESC
		//         LIMIT %d
		//     ", $limit);

		//     $email_activities = $wpdb->get_results($emails_query);
		//     if ($email_activities) {
		//         $activities = array_merge($activities, $email_activities);
		//     }
		// }

		// 5. File uploads
		$attachments_query = $wpdb->prepare(
			"
            SELECT 
                'attachment' as type,
                at.attachment_id as entity_id,
                at.file_name as title,
                at.created as activity_date,
                'uploaded' as action,
                at.upload_by as user_id,
                at.event_id
            FROM $attachments_tbl at
            WHERE 1=1 $where_event
            ORDER BY at.created DESC 
            LIMIT %d
        ",
			$limit
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Query built with $wpdb->prepare(); table names from SimplyConf_DB::get_table().
		$attachment_activities = $wpdb->get_results($attachments_query);
		if ($attachment_activities) {
			$activities = array_merge($activities, $attachment_activities);
		}

		// Sort all activities by date descending and limit
		usort(
			$activities,
			function ( $a, $b ) {
			return strtotime($b->activity_date) - strtotime($a->activity_date);
			}
		);

		$activities = array_slice($activities, 0, $limit);

		// Get user names for activities that have user_id
		$user_ids = array_unique(array_filter(array_column($activities, 'user_id')));
		$users    = array();
		if ( ! empty($user_ids)) {
			$user_ids_placeholder = str_repeat('%s,', count($user_ids) - 1) . '%s';
			$users_query          = $wpdb->prepare(
				"SELECT ID, display_name FROM {$wpdb->users} WHERE ID IN ($user_ids_placeholder)",
				$user_ids
			);
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Query built with $wpdb->prepare(); uses $wpdb->users (trusted WP table).
		$user_results         = $wpdb->get_results($users_query);
			foreach ($user_results as $user) {
				$users[ $user->ID ] = $user->display_name;
			}
		}

		// Format activities for response
		$formatted_activities = array();
		foreach ($activities as $activity) {
			$formatted_activities[] = array(
				'type'      => $activity->type,
				'action'    => $activity->action,
				'title'     => $activity->title,
				'date'      => $activity->activity_date,
				'user'      => $activity->user_id && isset($users[ $activity->user_id ]) ? $users[ $activity->user_id ] : null,
				'entity_id' => $activity->entity_id,
				'event_id'  => $activity->event_id,
			);
		}

		return rest_ensure_response(
			array(
				'activities' => $formatted_activities,
				'total'      => count($formatted_activities),
			)
		);
	}

	public function get_versions( $request ) {
		$core_version = SIMPLYCONF_VERSION;
		$build = defined('SIMPLYCONF_BUILD') ? SIMPLYCONF_BUILD : 'unknown';

		$addons = simplyconf_get_addons();
		$addon_versions = array();

		foreach ($addons as $slug => $addon) {
			if ($addon['active']) {
				$addon_versions[$slug] = array(
					'name'    => $addon['name'],
					'version' => $addon['version'],
					'build'   => isset($addon['build']) ? $addon['build'] : 'unknown',
				);
			}
		}

		return rest_ensure_response(array(
			'core' => array(
				'version' => $core_version,
				'build'   => $build,
			),
			'addons' => $addon_versions,
		));
	}
}

new SimplyConf_Dashboard_Routes();
