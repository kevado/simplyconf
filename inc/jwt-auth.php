<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * JWT Authentication for SimplyConf
 * Provides stateless authentication for REST API requests
 */
class SimplyConf_JWT_Auth {

	/**
	 * Get the secret key for JWT signing
	 * Uses WordPress AUTH_KEY constant
	 */
	private static function get_secret_key() {
		if (defined('AUTH_KEY')) {
			return AUTH_KEY;
		}
		// Fallback - should never happen in production
		return 'simplyconf-secret-key-change-this';
	}

	/**
	 * Generate a JWT token for a user
	 *
	 * @param integer $user_id WordPress user ID
	 * @return string JWT token
	 */
	public static function generate_token( $user_id ) {
		$issued_at  = time();
		$expiration = $issued_at + ( DAY_IN_SECONDS * 2 ); // 2 days

		$payload = array(
			'iss'     => get_bloginfo('url'), // Issuer
			'iat'     => $issued_at,           // Issued at
			'exp'     => $expiration,          // Expiration
			'user_id' => $user_id,          // User ID
		);

		return self::encode_jwt($payload);
	}

	/**
	 * Validate a JWT token and return user ID
	 *
	 * @param string $token JWT token
	 * @return integer|false User ID if valid, false otherwise
	 */
	public static function validate_token( $token ) {
		$payload = self::decode_jwt($token);

		if ( ! $payload) {
			return false;
		}

		// Check expiration
		if (isset($payload['exp']) && $payload['exp'] < time()) {
			return false;
		}

		// Return user ID
		return isset($payload['user_id']) ? (int) $payload['user_id'] : false;
	}

	/**
	 * Encode a JWT token
	 * Simple implementation using base64 and HMAC
	 *
	 * @param array $payload Token payload
	 * @return string JWT token
	 */
	private static function encode_jwt( $payload ) {
		$header = array(
			'typ' => 'JWT',
			'alg' => 'HS256',
		);

		$header_encoded  = self::base64url_encode(json_encode($header));
		$payload_encoded = self::base64url_encode(json_encode($payload));

		$signature         = hash_hmac(
			'sha256',
			$header_encoded . '.' . $payload_encoded,
			self::get_secret_key(),
			true
		);
		$signature_encoded = self::base64url_encode($signature);

		return $header_encoded . '.' . $payload_encoded . '.' . $signature_encoded;
	}

	/**
	 * Decode a JWT token
	 *
	 * @param string $token JWT token
	 * @return array|false Payload if valid, false otherwise
	 */
	private static function decode_jwt( $token ) {
		$parts = explode('.', $token);

		if (count($parts) !== 3) {
			return false;
		}

		list($header_encoded, $payload_encoded, $signature_encoded) = $parts;

		// Verify signature
		$signature       = hash_hmac(
			'sha256',
			$header_encoded . '.' . $payload_encoded,
			self::get_secret_key(),
			true
		);
		$signature_check = self::base64url_encode($signature);

		if ($signature_check !== $signature_encoded) {
			return false;
		}

		// Decode payload
		$payload = json_decode(self::base64url_decode($payload_encoded), true);

		return $payload;
	}

	/**
	 * Base64 URL encode
	 */
	private static function base64url_encode( $data ) {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Required for JWT token encoding per RFC 7519.
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
	}

	/**
	 * Base64 URL decode
	 */
	private static function base64url_decode( $data ) {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Required for JWT token decoding per RFC 7519.
		return base64_decode( strtr( $data, '-_', '+/' ) );
	}

	/**
	 * Initialize JWT authentication
	 * Hook into WordPress authentication system
	 */
	public static function init() {
		add_filter('determine_current_user', array( __CLASS__, 'determine_current_user' ), 20);
		add_filter('rest_authentication_errors', array( __CLASS__, 'rest_authentication_errors' ), 10);
	}

	/**
	 * WordPress REST API authentication filter
	 * Authenticates user via JWT token in Authorization header
	 *
	 * @param WP_Error|null|boolean $result Previous authentication result
	 * @return WP_Error|null|boolean
	 */
	public static function rest_authentication_errors( $result ) {
		// If already authenticated (e.g., via cookies in admin), allow it
		if ($result === true) {
			return $result;
		}

		// If there's an error from another auth method, return it
		if (is_wp_error($result)) {
			return $result;
		}

		// Try JWT authentication for frontend/SPA
		$auth_header = self::get_authorization_header();

		if ( ! $auth_header) {
			return $result;
		}

		// Extract Bearer token
		if (strpos($auth_header, 'Bearer ') !== 0) {
			return $result;
		}

		$token   = substr($auth_header, 7);
		$user_id = self::validate_token($token);

		if ($user_id) {
			wp_set_current_user($user_id);
			return true; // Authentication successful
		}

		return $result;
	}

	/**
	 * Get Authorization header from various server configurations
	 * Works with Apache, nginx, and other servers without requiring .htaccess
	 *
	 * @return string|null Authorization header value
	 */
	private static function get_authorization_header() {
		$auth_header = null;

		// Try standard HTTP_AUTHORIZATION
		if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
			$auth_header = sanitize_text_field( wp_unslash( $_SERVER['HTTP_AUTHORIZATION'] ) );
		}
		// Try REDIRECT_HTTP_AUTHORIZATION (Apache with mod_rewrite)
		elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
			$auth_header = sanitize_text_field( wp_unslash( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) );
		}
		// Try to get from apache_request_headers() if available
		elseif (function_exists('apache_request_headers')) {
			$headers = apache_request_headers();
			if (isset($headers['Authorization'])) {
				$auth_header = $headers['Authorization'];
			} elseif (isset($headers['authorization'])) {
				$auth_header = $headers['authorization'];
			}
		}
		// Try getallheaders() if available (nginx, other servers)
		elseif (function_exists('getallheaders')) {
			$headers = getallheaders();
			if (isset($headers['Authorization'])) {
				$auth_header = $headers['Authorization'];
			} elseif (isset($headers['authorization'])) {
				$auth_header = $headers['authorization'];
			}
		}

		return $auth_header;
	}

	/**
	 * Determine current user via JWT token
	 *
	 * @param integer|boolean $user_id Current user ID
	 * @return integer|boolean User ID if authenticated, original value otherwise
	 */
	public static function determine_current_user( $user_id ) {
		// If already authenticated, return
		if ($user_id) {
			return $user_id;
		}

		// Get Authorization header using our helper method
		$auth_header = self::get_authorization_header();

		if ( ! $auth_header) {
			return $user_id;
		}

		if (strpos($auth_header, 'Bearer ') !== 0) {
			return $user_id;
		}

		$token             = substr($auth_header, 7);
		$validated_user_id = self::validate_token($token);

		return $validated_user_id ? $validated_user_id : $user_id;
	}
}
