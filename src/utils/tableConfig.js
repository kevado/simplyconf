/**
 * Reusable table configuration for frontend tables
 * Ensures consistent styling that overrides theme CSS
 */

export const getFrontendTableConfig = () => ({
	style: {
		background: "#fff",
		borderRadius: "8px",
		overflow: "hidden",
		boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
	},
	className: "simplyconf-frontend-table",
	rowClassName: (_record, index) =>
		index % 2 === 0 ? "table-row-light" : "table-row-dark",
});

/**
 * Standard table pagination config for consistent UX across all tables.
 * @param {object} opts
 * @param {number}  opts.total      - Total item count
 * @param {string}  opts.entityName - Display name for items (e.g. 'abstracts')
 * @param {number}  [opts.pageSize=20] - Default page size
 * @returns {object} Ant Design Table pagination prop
 */
export const getTablePagination = ({ total, entityName, pageSize = 20 }) => ({
	total,
	pageSize,
	showSizeChanger: true,
	pageSizeOptions: ["10", "20", "50", "100"],
	showQuickJumper: true,
	showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} ${entityName}`,
});

export default getFrontendTableConfig;
