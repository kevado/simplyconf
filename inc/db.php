<?php
defined('ABSPATH') or die('ERROR: You do not have permission to access this page');
global $wpdb;
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
$simplyconf_charset_collate = $wpdb->get_charset_collate();

// events
$simplyconf_events_tbl = SimplyConf_DB::get_table('events');
$simplyconf_events_sql = 'CREATE TABLE ' . $simplyconf_events_tbl . " (
    `event_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` varchar(255),
    `initials` varchar(8),
    `description` longtext,
    `address` longtext,
    `street_address` varchar(255),
    `city` varchar(100),
    `state_province` varchar(100),
    `postal_code` varchar(20),
    `country` varchar(100),
    `start_date` date,
    `end_date` date,
    `deadline` date,
    `review_deadline` date,
    `requires_reg_fee` tinyint(1) DEFAULT 0,
    `default` tinyint(1) DEFAULT 0,
    `status` tinyint(1) DEFAULT 1,
    `created` datetime,
    `modified` datetime,
    PRIMARY KEY  (event_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_events_sql);

// abstracts
$simplyconf_abstracts_tbl = SimplyConf_DB::get_table('abstracts');
$simplyconf_abstracts_sql = 'CREATE TABLE ' . $simplyconf_abstracts_tbl . " (
    `abstract_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` int(11) NOT NULL,
    `track_id` int(11) NULL,
    `session_id` int(11) NULL,
    `title` varchar(255) NOT NULL,
    `description` longtext NULL,
    `status` int(11),
    `submit_by` int(11),
    `created` datetime,
    `modified` datetime,
    PRIMARY KEY (abstract_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_abstracts_sql);

$simplyconf_settings_tbl = SimplyConf_DB::get_table('settings');
$simplyconf_setting_sql  = 'CREATE TABLE ' . $simplyconf_settings_tbl . " (
    `setting_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` int(11) NOT NULL,
    `category` ENUM('event', 'abstract', 'review', 'user', 'email', 'schedule', 'payment') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `label` VARCHAR(255) NOT NULL,
    `type` ENUM('text', 'number', 'boolean', 'select', 'textarea') NOT NULL,
    `options` TEXT,
    `value` TEXT,
    `default_value` TEXT,
    `description` TEXT,
    `autoload` TINYINT(1) NOT NULL DEFAULT 0,
    `order` INT,
    PRIMARY KEY (setting_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_setting_sql);

// tracks
$simplyconf_tracks_tbl = SimplyConf_DB::get_table('tracks');
$simplyconf_tracks_sql = 'CREATE TABLE ' . $simplyconf_tracks_tbl . " (
    `track_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` int(11) NOT NULL,
    `name` varchar(255) NOT NULL,
    `description` text,
    `order` int(11) DEFAULT 0,
    `created` datetime,
    `modified` datetime,
    PRIMARY KEY (track_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_tracks_sql);

// sessions
$simplyconf_sessions_tbl = SimplyConf_DB::get_table('sessions');
$simplyconf_sessions_sql = 'CREATE TABLE ' . $simplyconf_sessions_tbl . " (
    `session_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` int(11) NOT NULL,
    `track_id` int(11) NOT NULL,
    `name` varchar(255) NOT NULL,
    `description` text,
    `start_time` datetime,
    `end_time` datetime,
    `location` varchar(255),
    `order` int(11) DEFAULT 0,
    `created` datetime,
    `modified` datetime,
    PRIMARY KEY (session_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_sessions_sql);

// event user roles
$simplyconf_event_user_roles_tbl = SimplyConf_DB::get_table('event_user_roles');
$simplyconf_event_user_roles_sql = "CREATE TABLE $simplyconf_event_user_roles_tbl (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` INT(11) NOT NULL,
    `user_id` BIGINT(20) NOT NULL,
    `role` ENUM('track_chair', 'reviewer', 'author', 'viewer') NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY event_user_role (event_id, user_id, role),
    KEY idx_event_user (event_id, user_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_event_user_roles_sql);

// track chair assignments
$simplyconf_track_assignments_tbl = SimplyConf_DB::get_table('track_assignments');
$simplyconf_track_assignments_sql = "CREATE TABLE $simplyconf_track_assignments_tbl (
    `assignment_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` INT(11) NOT NULL,
    `track_id` INT(11) NOT NULL,
    `user_id` BIGINT(20) NOT NULL,
    `assigned_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (assignment_id),
    UNIQUE KEY unique_track_chair (event_id, track_id, user_id),
    KEY idx_event_track (event_id, track_id),
    KEY idx_user_tracks (user_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_track_assignments_sql);

// custom fields for abstracts, reviews, users, and authors
$simplyconf_custom_fields_tbl = SimplyConf_DB::get_table('custom_fields');
$simplyconf_custom_fields_sql = "CREATE TABLE $simplyconf_custom_fields_tbl (
    `field_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` INT(11) NULL,
    `name` VARCHAR(100) NOT NULL,
    `label` VARCHAR(255) NOT NULL,
    `type` ENUM('text','textarea','email','number','select','radio','checkbox','rating') NOT NULL,
    `usage` ENUM('abstract','review','user','author') NOT NULL DEFAULT 'abstract',
    `options` TEXT,
    `required` TINYINT(1) DEFAULT 0,
    `show_in_admin` TINYINT(1) DEFAULT 1,
    `show_in_frontend` TINYINT(1) DEFAULT 1,
    `show_in_registration` TINYINT(1) DEFAULT 0,
    `order_num` INT(11) DEFAULT 0,
    `max_rating` INT(11) DEFAULT 5,
    `help_text` TEXT DEFAULT NULL,
    `conditional_logic` TEXT DEFAULT NULL,
    PRIMARY KEY (field_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_custom_fields_sql);

// Add file_upload to custom fields type ENUM (dbDelta cannot modify ENUMs)
$wpdb->query(
	"ALTER TABLE $simplyconf_custom_fields_tbl MODIFY COLUMN `type` ENUM('text','textarea','email','number','select','radio','checkbox','rating','file_upload') NOT NULL"
);

// field values for abstracts, reviews, users, and authors
$simplyconf_custom_values_tbl = SimplyConf_DB::get_table('custom_values');
$simplyconf_custom_values_sql = "CREATE TABLE $simplyconf_custom_values_tbl (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `field_id` INT(11) UNSIGNED NOT NULL,
    `entity_id` INT(11) UNSIGNED NOT NULL,
    `entity_type` ENUM('abstract','review','user','author') NOT NULL,
    `value` TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY entity_field (entity_id, entity_type, field_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_custom_values_sql);

// authors table - hybrid model supporting both WordPress users and external collaborators
$simplyconf_authors_tbl = SimplyConf_DB::get_table('authors');
$simplyconf_authors_sql = "CREATE TABLE $simplyconf_authors_tbl (
    `author_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT(20) UNSIGNED NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `created` datetime,
    `modified` datetime,
    PRIMARY KEY (author_id),
    UNIQUE KEY unique_email (email),
    KEY user_id (user_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_authors_sql);

// abstract-authors junction table
$simplyconf_abstract_authors_tbl = SimplyConf_DB::get_table('abstract_authors');
$simplyconf_abstract_authors_sql = "CREATE TABLE $simplyconf_abstract_authors_tbl (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `abstract_id` INT(11) UNSIGNED NOT NULL,
    `author_id` INT(11) UNSIGNED NOT NULL,
    `author_order` INT(11) DEFAULT 0,
    `is_corresponding` TINYINT(1) DEFAULT 0,
    `is_presenter` TINYINT(1) DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY abstract_author (abstract_id, author_id)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_abstract_authors_sql);


// attachments table
$simplyconf_attachments_tbl = SimplyConf_DB::get_table('attachments');
$simplyconf_attachments_sql = 'CREATE TABLE ' . $simplyconf_attachments_tbl . " (
    `attachment_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `entity_id` int(11) UNSIGNED NOT NULL,
    `entity_type` ENUM('abstract', 'review', 'user', 'event') NOT NULL,
    `event_id` int(11) UNSIGNED NOT NULL,
    `wp_attachment_id` int(11) UNSIGNED NOT NULL,
    `file_name` varchar(255) NOT NULL,
    `file_type` varchar(100) NOT NULL,
    `file_size` int(11) UNSIGNED NOT NULL,
    `file_category` ENUM('document', 'image', 'video', 'audio', 'other') NOT NULL DEFAULT 'document',
    `file_purpose` ENUM('abstract_pdf', 'supporting_doc', 'profile_image', 'presentation', 'poster', 'cv', 'other') NOT NULL DEFAULT 'other',
    `version` int(3) UNSIGNED NOT NULL DEFAULT 1,
    `is_current_version` tinyint(1) NOT NULL DEFAULT 1,
    `upload_by` int(11) UNSIGNED NOT NULL,
    `access_level` ENUM('public', 'private', 'reviewers_only', 'admin_only') NOT NULL DEFAULT 'private',
    `download_count` int(11) UNSIGNED NOT NULL DEFAULT 0,
    `metadata` longtext NULL,
    `created` datetime NOT NULL,
    `modified` datetime NULL,
    PRIMARY KEY (attachment_id),
    KEY idx_entity (entity_type, entity_id),
    KEY idx_event (event_id),
    KEY idx_wp_attachment (wp_attachment_id),
    KEY idx_current_version (entity_type, entity_id, is_current_version)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_attachments_sql);

// Add custom_field to file_purpose ENUM (dbDelta cannot modify ENUMs)
$wpdb->query(
	"ALTER TABLE $simplyconf_attachments_tbl MODIFY COLUMN `file_purpose` ENUM('abstract_pdf', 'supporting_doc', 'profile_image', 'presentation', 'poster', 'cv', 'custom_field', 'other') NOT NULL DEFAULT 'other'"
);

// file access logs table for tracking downloads
$simplyconf_file_logs_tbl = SimplyConf_DB::get_table('file_logs');
$simplyconf_file_logs_sql = 'CREATE TABLE ' . $simplyconf_file_logs_tbl . " (
    `log_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `attachment_id` int(11) UNSIGNED NOT NULL,
    `user_id` int(11) UNSIGNED NOT NULL,
    `action` ENUM('upload', 'download', 'view', 'delete') NOT NULL,
    `ip_address` varchar(45),
    `user_agent` text,
    `created` datetime NOT NULL,
    PRIMARY KEY (log_id),
    KEY idx_attachment (attachment_id),
    KEY idx_user (user_id),
    KEY idx_action (action)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_file_logs_sql);



// statuses table - dynamic statuses for abstracts and reviews
$simplyconf_statuses_tbl = SimplyConf_DB::get_table('statuses');
$simplyconf_statuses_sql = 'CREATE TABLE ' . $simplyconf_statuses_tbl . " (
    `status_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` int(11) UNSIGNED NOT NULL,
    `type` ENUM('abstract', 'review') NOT NULL,
    `name` varchar(100) NOT NULL,
    `label` varchar(255) NOT NULL,
    `description` text NULL,
    `color` varchar(7) DEFAULT '#666666',
    `icon` varchar(50) NULL,
    `is_default` tinyint(1) DEFAULT 0,
    `is_initial` tinyint(1) DEFAULT 0,
    `is_final` tinyint(1) DEFAULT 0,
    `order_num` int(11) DEFAULT 0,
    `workflow_rules` text NULL,
    `permissions` text NULL,
    `created` datetime NOT NULL,
    `modified` datetime NULL,
    PRIMARY KEY (status_id),
    KEY idx_event_type (event_id, type),
    KEY idx_event_default (event_id, type, is_default),
    UNIQUE KEY unique_event_name (event_id, type, name)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_statuses_sql);

// User preferences table
$simplyconf_user_preferences_tbl = SimplyConf_DB::get_table('user_preferences');
$simplyconf_user_preferences_sql = 'CREATE TABLE ' . $simplyconf_user_preferences_tbl . " (
    `preference_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` bigint(20) UNSIGNED NOT NULL,
    `event_id` int(11) UNSIGNED NOT NULL,
    `context` varchar(50) NOT NULL COMMENT 'abstracts|authors|reviews|users|global',
    `preference_key` varchar(100) NOT NULL COMMENT 'column_visibility|table_sort|filters',
    `preference_value` longtext NOT NULL COMMENT 'JSON encoded preference data',
    `created` datetime DEFAULT CURRENT_TIMESTAMP,
    `modified` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (preference_id),
    UNIQUE KEY user_event_context_key (user_id, event_id, context, preference_key),
    KEY idx_user (user_id),
    KEY idx_event (event_id),
    KEY idx_context (context)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_user_preferences_sql);

// Appearance settings table for theme customization
$simplyconf_appearance_settings_tbl = SimplyConf_DB::get_table('appearance_settings');
$simplyconf_appearance_settings_sql = 'CREATE TABLE ' . $simplyconf_appearance_settings_tbl . " (
    `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `setting_key` varchar(100) NOT NULL,
    `setting_value` longtext NOT NULL COMMENT 'JSON encoded setting data',
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` bigint(20) UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_setting_key (setting_key),
    KEY idx_updated_by (updated_by)
) $simplyconf_charset_collate;";
dbDelta($simplyconf_appearance_settings_sql);

// Insert default theme configuration
$simplyconf_default_config = json_encode(
	array(
		'version'    => '1.0',
		'branding'   => array(
			'logo_url'          => '',
			'organization_name' => get_bloginfo('name'),
		),
		'colors'     => array(
			'primary' => '#41618d',
			'success' => '#10B981',
			'warning' => '#F59E0B',
			'error'   => '#EF4444',
			'info'    => '#41618d',
		),
		'typography' => array(
			'fontFamily'   => 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
			'baseFontSize' => 14,
		),
		'layout'     => array(
			'borderRadius'    => 12,
			'shadowIntensity' => 'medium',
		),
		'preset'     => 'default',
	)
);

$wpdb->replace(
	$simplyconf_appearance_settings_tbl,
	array(
		'setting_key'   => 'theme_config',
		'setting_value' => $simplyconf_default_config,
		'updated_by'    => get_current_user_id() ?: 1,
	)
);

// Feature flags table for secure feature access control
// Only create on main site (centralized table for all network sites)
if ( ! is_multisite() || get_current_blog_id() === 1 ) {
	$simplyconf_feature_flags_tbl = SimplyConf_DB::get_table('feature_flags');
	$simplyconf_feature_flags_sql = 'CREATE TABLE ' . $simplyconf_feature_flags_tbl . " (
	    `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
	    `site_id` BIGINT(20) UNSIGNED NOT NULL,
	    `feature_slug` VARCHAR(50) NOT NULL,
	    `is_enabled` TINYINT(1) DEFAULT 1,
	    `source` VARCHAR(20) NOT NULL COMMENT 'license|saas_plan|manual',
	    `source_id` VARCHAR(100) NULL COMMENT 'license key or plan ID',
	    `granted_at` DATETIME NOT NULL,
	    `expires_at` DATETIME NULL,
	    `metadata` TEXT NULL COMMENT 'JSON for additional data',
	    `created` DATETIME DEFAULT CURRENT_TIMESTAMP,
	    `modified` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	    PRIMARY KEY (id),
	    UNIQUE KEY site_feature (site_id, feature_slug),
	    KEY idx_site (site_id),
	    KEY idx_feature (feature_slug),
	    KEY idx_expires (expires_at),
	    KEY idx_enabled (is_enabled)
	) $simplyconf_charset_collate;";
	dbDelta($simplyconf_feature_flags_sql);
}
