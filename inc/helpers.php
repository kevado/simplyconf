<?php

if ( ! defined('ABSPATH')) {
	exit;
}

/**
 * Shared helper utilities for SimplyConf routes.
 */
class SimplyConf_Helpers {

	/**
	 * Fetch and decode custom-field values for a given entity.
	 *
	 * Retrieves all custom-field values for $entity_id / $entity_type from the
	 * custom_values table and JSON-decodes any array values (e.g. checkbox groups).
	 *
	 * @param int    $entity_id   The entity's primary key (abstract_id, user_id, etc.)
	 * @param string $entity_type One of 'abstract', 'user', 'author', 'review'
	 * @return array Array of ['field_id' => int, 'value' => mixed] rows.
	 */
	public static function get_entity_custom_fields( $entity_id, $entity_type ) {
		global $wpdb;
		$custom_values_tbl = SimplyConf_DB::get_table('custom_values');

		$fields = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT field_id, value FROM {$custom_values_tbl} WHERE entity_id = %d AND entity_type = %s",
				$entity_id,
				$entity_type
			),
			ARRAY_A
		);

		foreach ($fields as &$field) {
			$decoded = json_decode($field['value'], true);
			if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
				$field['value'] = $decoded;
			}
		}

		return $fields;
	}
}
