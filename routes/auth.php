<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * REST API Endpoints for Authentication (login, register, forgot, reset, logout)
 * Integrates with WordPress authentication and user meta
 */
class SimplyConf_Auth_Routes {

	public function __construct() {
		add_action('rest_api_init', array( $this, 'create_auth_routes' ));
	}
	public function create_auth_routes() {
		register_rest_route(
			'simplyconf/v1',
			'/auth/login',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'login' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/auth/register',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'register' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/auth/forgot',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'forgot' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/auth/reset',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'reset' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'simplyconf/v1',
			'/auth/logout',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'logout' ),
				'permission_callback' => '__return_true',
			)
		);
	}
	public function login( $req ) {
		$params   = $req->get_json_params();
		$username = sanitize_user($params['username'] ?? '');
		$password = $params['password'] ?? '';

		if (empty($username) || empty($password)) {
			return rest_ensure_response(array( 'success' => false, 'message' => 'Username and password are required.' ));
		}

		// Verify reCAPTCHA if enabled
		$captcha_error = $this->verify_recaptcha($req, 'login');
		if ($captcha_error) {
			return $captcha_error;
		}

		// REST API logins don't render captcha widgets, so temporarily remove
		// third-party authenticate filters (Jetpack, Wordfence, etc.) that
		// expect captcha tokens from form submissions.
		$removed_filters = $this->suspend_third_party_auth_filters();

		$user = wp_authenticate($username, $password);

		// Restore removed filters
		$this->restore_auth_filters($removed_filters);

		if (is_wp_error($user)) {
			return rest_ensure_response(
				array(
					'success' => false,
					'message' => $user->get_error_message(),
				)
			);
		}

		// Set WordPress auth cookie so the browser session is authenticated
		wp_set_current_user($user->ID);
		wp_set_auth_cookie($user->ID, true);

		// Generate JWT token
		$token = SimplyConf_JWT_Auth::generate_token($user->ID);

		return rest_ensure_response(
			array(
				'success' => true,
				'token'   => $token,
				'user'    => array(
					'ID'           => $user->ID,
					'display_name' => $user->display_name,
					'email'        => $user->user_email,
					'roles'        => $user->roles,
					'status'       => 1,
				),
			)
		);
	}
	public function register( $req ) {
		$params = $req->get_json_params();
		$login  = sanitize_user($params['login'] ?? '');
		$email  = sanitize_email($params['email'] ?? '');
		$pass   = $params['password'] ?? '';

		if (empty($login) || empty($email) || empty($pass)) {
			return rest_ensure_response(array( 'success' => false, 'message' => 'Login, email, and password are required.' ));
		}

		// Verify reCAPTCHA if enabled
		$captcha_error = $this->verify_recaptcha($req, 'register');
		if ($captcha_error) {
			return $captcha_error;
		}

		// Create WordPress user
		$user_data = array(
			'user_login' => $login,
			'user_email' => $email,
			'user_pass'  => $pass,
		);

		$user_id = wp_create_user($user_data['user_login'], $user_data['user_pass'], $user_data['user_email']);

		if (is_wp_error($user_id)) {
			return rest_ensure_response(array( 'success' => false, 'message' => $user_id->get_error_message() ));
		}

		// Handle custom fields if provided
		if ( ! empty($params['custom_fields']) && is_array($params['custom_fields'])) {
			global $wpdb;
			$custom_values_tbl = SimplyConf_DB::get_table('custom_values');

			foreach ($params['custom_fields'] as $field) {
				if ( ! empty($field['field_id']) && isset($field['value'])) {
					$wpdb->insert(
						$custom_values_tbl,
						array(
							'entity_id'   => $user_id,
							'entity_type' => 'user',
							'field_id'    => intval($field['field_id']),
							'value'       => sanitize_text_field($field['value']),
						)
					);
				}
			}
		}

		// Set default event roles for all active events
		global $wpdb;
		$event_user_roles_tbl = SimplyConf_DB::get_table('event_user_roles');
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name uses $wpdb->prefix + hardcoded suffix; no user input.
		$events               = $wpdb->get_results("SELECT event_id FROM {$wpdb->prefix}simplyconf_events WHERE status = 1");

		foreach ($events as $event) {
			$wpdb->insert(
				$event_user_roles_tbl,
				array(
					'event_id' => $event->event_id,
					'user_id'  => $user_id,
					'role'     => 'author', // Default role for new registrations
				)
			);
		}

		return rest_ensure_response(array( 'success' => true, 'user_id' => $user_id ));
	}

	public function forgot( $req ) {
		$params = $req->get_json_params();
		$user   = get_user_by('email', $params['email']);
		if ( ! $user) {
			return rest_ensure_response(array( 'success' => false, 'message' => 'User not found.' ));
		}
		$reset_key = get_password_reset_key($user);

		// get_password_reset_key() fires the 'retrieve_password_key' action,
		// which the emails addon hooks into to send a branded reset email.
		// Only send a fallback email when the emails addon is NOT active.
		if ( ! function_exists('simplyconf_has_addon') || ! simplyconf_has_addon('emails')) {
			$reset_url = site_url("wp-login.php?action=rp&key=$reset_key&login=" . rawurlencode($user->user_login), 'login');
			wp_mail($user->user_email, 'Password Reset', "Reset your password: $reset_url");
		}

		return rest_ensure_response(array( 'success' => true ));
	}
	public function reset( $req ) {
		$params = $req->get_json_params();
		$user   = check_password_reset_key($params['key'], $params['login']);
		if (is_wp_error($user)) {
			return rest_ensure_response(array( 'success' => false, 'message' => $user->get_error_message() ));
		}
		reset_password($user, $params['password']);
		return rest_ensure_response(array( 'success' => true ));
	}
	public function logout( $req ) {
		if ( is_user_logged_in() ) {
			wp_logout();
		}
		return rest_ensure_response(array( 'success' => true ));
	}
	public function get_current_user( $req ) {
		$user = wp_get_current_user();
		if ( ! $user || ! $user->ID) {
			return new WP_Error('rest_forbidden', 'Not logged in', array( 'status' => 401 ));
		}
		// SimplyConf users are always considered active

		return rest_ensure_response(
			array(
				'ID'           => $user->ID,
				'username'     => $user->user_login,
				'email'        => $user->user_email,
				'display_name' => $user->display_name,
				'roles'        => $user->roles,
				'status'       => 1, // Always active for SimplyConf users
			)
		);
	}
	/**
	 * Verify Google reCAPTCHA v3 token if captcha is enabled for the current event.
	 *
	 * @param WP_REST_Request $req    The incoming request.
	 * @param string          $action Expected reCAPTCHA action name.
	 * @return WP_REST_Response|null  Error response if verification fails, null if OK.
	 */
	private function verify_recaptcha( $req, $action ) {
		$params   = $req->get_json_params();
		$event_id = absint($params['event_id'] ?? 0);

		if ( ! $event_id) {
			return null; // Cannot determine event — skip captcha
		}

		global $wpdb;
		$settings_tbl = SimplyConf_DB::get_table('settings');

		$captcha_enabled = $wpdb->get_var($wpdb->prepare(
			"SELECT value FROM $settings_tbl WHERE event_id = %d AND name = 'enable_captcha'",
			$event_id
		));

		if ($captcha_enabled !== '1') {
			return null; // Captcha not enabled
		}

		$secret_key = $wpdb->get_var($wpdb->prepare(
			"SELECT value FROM $settings_tbl WHERE event_id = %d AND name = 'recaptcha_secret_key'",
			$event_id
		));

		if (empty($secret_key)) {
			return null; // No secret key configured — skip verification
		}

		$params = $req->get_json_params();
		$token  = $params['recaptcha_token'] ?? '';

		if (empty($token)) {
			return rest_ensure_response(array(
				'success' => false,
				'message' => 'reCAPTCHA verification is required.',
			));
		}

		// Call Google reCAPTCHA verify API
		$response = wp_remote_post('https://www.google.com/recaptcha/api/siteverify', array(
			'body' => array(
				'secret'   => $secret_key,
				'response' => $token,
				'remoteip' => sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) ),
			),
		));

		if (is_wp_error($response)) {
			// Network error — don't block the user
			error_log('SimplyConf reCAPTCHA: verification request failed — ' . $response->get_error_message());
			return null;
		}

		$body = json_decode(wp_remote_retrieve_body($response), true);

		if (empty($body['success'])) {
			return rest_ensure_response(array(
				'success' => false,
				'message' => 'reCAPTCHA verification failed. Please try again.',
			));
		}

		// Check action matches (prevents token reuse across endpoints)
		if (isset($body['action']) && $body['action'] !== $action) {
			return rest_ensure_response(array(
				'success' => false,
				'message' => 'reCAPTCHA verification failed. Please try again.',
			));
		}

		// Check score — 0.5 is Google's recommended threshold
		if (isset($body['score']) && $body['score'] < 0.5) {
			return rest_ensure_response(array(
				'success' => false,
				'message' => 'reCAPTCHA verification failed. Please try again.',
			));
		}

		return null; // Verification passed
	}

	/**
	 * Temporarily remove third-party callbacks from the 'authenticate' filter.
	 * Keeps only WordPress core callbacks so programmatic REST API logins
	 * are not blocked by captcha plugins (Jetpack, Wordfence, etc.).
	 *
	 * @return array Removed callbacks keyed by priority, for later restoration.
	 */
	private function suspend_third_party_auth_filters() {
		global $wp_filter;
		$removed = array();

		if ( ! isset($wp_filter['authenticate'])) {
			return $removed;
		}

		$core_callbacks = array(
			'wp_authenticate_username_password',
			'wp_authenticate_email_password',
			'wp_authenticate_spam_check',
			'wp_authenticate_application_password',
			'wp_authenticate_cookie',
		);

		foreach ($wp_filter['authenticate']->callbacks as $priority => $callbacks) {
			foreach ($callbacks as $key => $callback) {
				$func = $callback['function'];

				// Identify the function name for comparison
				$func_name = '';
				if (is_string($func)) {
					$func_name = $func;
				} elseif (is_array($func) && isset($func[1]) && is_string($func[1])) {
					$func_name = $func[1];
				}

				if ( ! in_array($func_name, $core_callbacks, true)) {
					$removed[ $priority ][ $key ] = $callback;
					unset($wp_filter['authenticate']->callbacks[ $priority ][ $key ]);
				}
			}
		}

		return $removed;
	}

	/**
	 * Restore previously removed authenticate filter callbacks.
	 *
	 * @param array $removed Callbacks returned by suspend_third_party_auth_filters().
	 */
	private function restore_auth_filters( $removed ) {
		global $wp_filter;

		if ( empty($removed) || ! isset($wp_filter['authenticate'])) {
			return;
		}

		foreach ($removed as $priority => $callbacks) {
			foreach ($callbacks as $key => $callback) {
				$wp_filter['authenticate']->callbacks[ $priority ][ $key ] = $callback;
			}
		}
	}
}
new SimplyConf_Auth_Routes();
