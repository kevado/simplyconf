<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * This file will create admin menu page.
 */
class SimplyConf_Create_Admin_Page {


	public function __construct() {
		add_action('admin_menu', array( $this, 'create_admin_menu' ));
	}

	public function create_admin_menu() {
		$capability = 'manage_options';
		$slug       = 'simplyconf';
		$page_title = __('SimplyConf', 'simplyconf');

		add_menu_page(
			$page_title,
			$page_title,
			$capability,
			$slug,
			array( $this, 'render_admin' ),
			plugins_url('../assets/images/logo-icon.svg', __FILE__),
			56
		);

		// Add submenus - rename the first one to Dashboard
		add_submenu_page(
			$slug,
			__('Dashboard', 'simplyconf'),
			__('Dashboard', 'simplyconf'),
			$capability,
			$slug,
			array( $this, 'render_admin' )
		);

		add_submenu_page(
			$slug,
			__('Events', 'simplyconf'),
			__('Events', 'simplyconf'),
			$capability,
			$slug . '#/events',
			array( $this, 'render_admin' )
		);

		add_submenu_page(
			$slug,
			__('Abstracts', 'simplyconf'),
			__('Abstracts', 'simplyconf'),
			$capability,
			$slug . '#/abstracts',
			array( $this, 'render_admin' )
		);

		add_submenu_page(
			$slug,
			__('Users', 'simplyconf'),
			__('Users', 'simplyconf'),
			$capability,
			$slug . '#/users',
			array( $this, 'render_admin' )
		);

		add_submenu_page(
			$slug,
			__('Reviews', 'simplyconf'),
			__('Reviews', 'simplyconf'),
			$capability,
			$slug . '#/reviews',
			array( $this, 'render_admin' )
		);

		add_submenu_page(
			$slug,
			__('Emails', 'simplyconf'),
			__('Emails', 'simplyconf'),
			$capability,
			$slug . '#/emails',
			array( $this, 'render_admin' )
		);

		add_submenu_page(
			$slug,
			__('Payments', 'simplyconf'),
			__('Payments', 'simplyconf'),
			$capability,
			$slug . '#/payments',
			array( $this, 'render_admin' )
		);

		add_submenu_page(
			$slug,
			__('Schedules', 'simplyconf'),
			__('Schedules', 'simplyconf'),
			$capability,
			$slug . '#/schedules',
			array( $this, 'render_admin' )
		);

		add_submenu_page(
			$slug,
			__('Exports', 'simplyconf'),
			__('Exports', 'simplyconf'),
			$capability,
			$slug . '#/exports',
			array( $this, 'render_admin' )
		);

		add_submenu_page(
			$slug,
			__('Settings', 'simplyconf'),
			__('Settings', 'simplyconf'),
			$capability,
			$slug . '#/settings',
			array( $this, 'render_admin' )
		);
	}

	public function render_admin() {
		echo '<div class="wrap"><div id="simplyconf-admin"></div></div>';
	}
}
new SimplyConf_Create_Admin_Page();
