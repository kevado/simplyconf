<?php

/**
 * SimplyConf Database Migrations
 *
 * Handles all database schema migrations for the plugin.
 * Migrations are run automatically on admin_init.
 *
 * @package SimplyConf
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class SimplyConf_Migrations {

    /**
     * Initialize migrations
     */
    public static function init() {
        add_action('admin_init', array(__CLASS__, 'run_migrations'));
    }
    
    /**
     * Run all pending migrations
     */
    public static function run_migrations() {
        $current_version = self::get_migration_version();

        // Only run migrations if version is less than current
        if (version_compare($current_version, '1.0.0', '<')) {
            self::migrate_conditional_logic_column();
            self::migrate_user_settings();
            self::migrate_submission_mode_setting();
            self::set_migration_version('1.0.0');
        }

        if (version_compare($current_version, '1.2.0', '<')) {
            self::migrate_recaptcha_settings();
            self::set_migration_version('1.2.0');
        }
    }

    /**
     * Migration: Add conditional_logic column to custom_fields table
     */
    private static function migrate_conditional_logic_column() {
        global $wpdb;
        
        // Load database class if not already loaded
        if (!class_exists('SimplyConf_DB')) {
            require_once SIMPLYCONF_PATH . 'inc/database.php';
        }
        
        $custom_fields_table = SimplyConf_DB::get_table('custom_fields');
        
        // Check if the column already exists
        $column_exists = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = %s
                AND TABLE_NAME = %s
                AND COLUMN_NAME = 'conditional_logic'",
                DB_NAME,
                $custom_fields_table
            )
        );
        
        // Add the column if it doesn't exist
        if (empty($column_exists)) {
            $wpdb->query(
                "ALTER TABLE $custom_fields_table 
                ADD COLUMN `conditional_logic` TEXT DEFAULT NULL 
                AFTER `help_text`"
            );
            
            // Log that the migration ran
            error_log('SimplyConf: Added conditional_logic column to custom_fields table');
        }
    }

    /**
     * Migration: Add/update user settings for registration, login, and password rules
     */
    private static function migrate_user_settings() {
        global $wpdb;
        
        // Load database class if not already loaded
        if (!class_exists('SimplyConf_DB')) {
            require_once SIMPLYCONF_PATH . 'inc/database.php';
        }
        
        $events_table = SimplyConf_DB::get_table('events');
        
        // Get ALL events, not just the default one
        $events = $wpdb->get_results("SELECT event_id FROM $events_table");
        
        if (empty($events)) {
            return;
        }
        
        // Run migration for each event
        foreach ($events as $event) {
            $event_id = $event->event_id;
            self::migrate_user_settings_for_event($event_id);
        }
    }
    
    /**
     * Run migration for a specific event
     */
    private static function migrate_user_settings_for_event($event_id) {
        global $wpdb;
        
        // Load database class if not already loaded
        if (!class_exists('SimplyConf_DB')) {
            require_once SIMPLYCONF_PATH . 'inc/database.php';
        }
        
        $settings_table = SimplyConf_DB::get_table('settings');
        
        // Define the user settings we want to ensure exist
        $user_settings = array(
            // Registration Settings
            array(
                'name' => 'enable_user_registration',
                'label' => 'Enable User Registration',
                'type' => 'boolean',
                'value' => '1',  // Use '1' instead of 'true' for consistency
                'order' => 1
            ),
            array(
                'name' => 'enable_captcha',
                'label' => 'Enable CAPTCHA',
                'type' => 'boolean',
                'value' => '0',
                'order' => 2
            ),
            array(
                'name' => 'recaptcha_site_key',
                'label' => 'reCAPTCHA Site Key',
                'type' => 'text',
                'value' => '',
                'order' => 3
            ),
            array(
                'name' => 'recaptcha_secret_key',
                'label' => 'reCAPTCHA Secret Key',
                'type' => 'text',
                'value' => '',
                'order' => 4
            ),
            array(
                'name' => 'login_redirect',
                'label' => 'Login Redirect URL',
                'type' => 'text',
                'value' => '/dashboard',
                'order' => 3
            ),
            
            // Password Rules Settings
            array(
                'name' => 'password_min_length',
                'label' => 'Minimum Password Length',
                'type' => 'number',
                'value' => '8',
                'order' => 10
            ),
            array(
                'name' => 'password_max_length',
                'label' => 'Maximum Password Length',
                'type' => 'number',
                'value' => '32',
                'order' => 11
            ),
            array(
                'name' => 'password_require_uppercase',
                'label' => 'Require Uppercase Letters',
                'type' => 'boolean',
                'value' => '1',  // Use '1' instead of 'true' for consistency
                'order' => 12
            ),
            array(
                'name' => 'password_require_lowercase',
                'label' => 'Require Lowercase Letters',
                'type' => 'boolean',
                'value' => '1',  // Use '1' instead of 'true' for consistency
                'order' => 13
            ),
            array(
                'name' => 'password_require_numbers',
                'label' => 'Require Numbers',
                'type' => 'boolean',
                'value' => '1',  // Use '1' instead of 'true' for consistency
                'order' => 14
            ),
            array(
                'name' => 'password_require_symbols',
                'label' => 'Require Special Symbols',
                'type' => 'boolean',
                'value' => '0',  // Use '0' instead of 'false' for consistency
                'order' => 15
            )
        );
        
        foreach ($user_settings as $setting) {
            // Check if setting already exists
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT setting_id FROM $settings_table WHERE event_id = %d AND name = %s",
                $event_id, $setting['name']
            ));
            
            if (!$existing) {
                // Insert the new setting
                $result = $wpdb->insert(
                    $settings_table,
                    array(
                        'event_id' => $event_id,
                        'category' => 'user',
                        'name' => $setting['name'],
                        'label' => $setting['label'],
                        'type' => $setting['type'],
                        'value' => $setting['value'],
                        'options' => isset($setting['options']) ? $setting['options'] : null,
                        'order' => $setting['order']
                    )
                );
            }
        }
        
        // Remove old settings we no longer want
        $old_settings = array('show_admin_bar', 'frontend_dashboard', 'change_ownership', 'password_strength', 'enable_registration');
        foreach ($old_settings as $setting_name) {
            $result = $wpdb->delete(
                $settings_table,
                array(
                    'event_id' => $event_id,
                    'name' => $setting_name
                )
            );
        }
    }

    /**
     * Migration: Seed submission_mode default setting for all events
     */
    private static function migrate_submission_mode_setting() {
        global $wpdb;

        if (!class_exists('SimplyConf_DB')) {
            require_once SIMPLYCONF_PATH . 'inc/database.php';
        }

        $events_table   = SimplyConf_DB::get_table('events');
        $settings_table = SimplyConf_DB::get_table('settings');

        $events = $wpdb->get_results("SELECT event_id FROM $events_table");

        if (empty($events)) {
            return;
        }

        foreach ($events as $event) {
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT setting_id FROM $settings_table WHERE event_id = %d AND name = %s",
                $event->event_id,
                'submission_mode'
            ));

            if (!$existing) {
                $wpdb->insert(
                    $settings_table,
                    array(
                        'event_id' => $event->event_id,
                        'category' => 'abstract',
                        'name'     => 'submission_mode',
                        'label'    => 'Submission Mode',
                        'type'     => 'select',
                        'value'    => 'wizard',
                        'order'    => 99,
                    )
                );
            }
        }

        error_log('SimplyConf: Seeded submission_mode setting for all events');
    }

    /**
     * Migration: Add reCAPTCHA site key and secret key settings for all events
     */
    private static function migrate_recaptcha_settings() {
        global $wpdb;

        if (!class_exists('SimplyConf_DB')) {
            require_once SIMPLYCONF_PATH . 'inc/database.php';
        }

        $events_table   = SimplyConf_DB::get_table('events');
        $settings_table = SimplyConf_DB::get_table('settings');

        $events = $wpdb->get_results("SELECT event_id FROM $events_table");

        if (empty($events)) {
            return;
        }

        $new_settings = array(
            array(
                'name'  => 'recaptcha_site_key',
                'label' => 'reCAPTCHA Site Key',
                'type'  => 'text',
                'value' => '',
                'order' => 3
            ),
            array(
                'name'  => 'recaptcha_secret_key',
                'label' => 'reCAPTCHA Secret Key',
                'type'  => 'text',
                'value' => '',
                'order' => 4
            ),
        );

        foreach ($events as $event) {
            foreach ($new_settings as $setting) {
                $existing = $wpdb->get_row($wpdb->prepare(
                    "SELECT setting_id FROM $settings_table WHERE event_id = %d AND name = %s",
                    $event->event_id, $setting['name']
                ));

                if (!$existing) {
                    $wpdb->insert(
                        $settings_table,
                        array(
                            'event_id' => $event->event_id,
                            'category' => 'user',
                            'name'     => $setting['name'],
                            'label'    => $setting['label'],
                            'type'     => $setting['type'],
                            'value'    => $setting['value'],
                            'order'    => $setting['order'],
                        )
                    );
                }
            }
        }

        error_log('SimplyConf: Added reCAPTCHA settings for all events');
    }

    /**
     * Get the current migration version (for future use)
     */
    public static function get_migration_version() {
        return get_option('simplyconf_migration_version', '0');
    }

    /**
     * Update the migration version (for future use)
     */
    public static function set_migration_version($version) {
        update_option('simplyconf_migration_version', $version);
    }
}

// Hook migrations to admin_init
add_action('admin_init', array('SimplyConf_Migrations', 'run_migrations'));
