import { Card, Skeleton, Space, Table } from "antd";
import PropTypes from "prop-types";

/**
 * Reusable Loading State components using Ant Design Skeleton
 * Provides consistent loading experiences across the app
 */

// Table skeleton for data tables
export const TableSkeleton = ({ rows = 5, columns = 3, showHeader = true }) => (
	<Table
		dataSource={[...Array(rows)].map((_, i) => ({ key: i }))}
		columns={[...Array(columns)].map((_, i) => ({
			title: showHeader ? <Skeleton.Input active size="small" /> : "",
			dataIndex: `col${i}`,
			render: () => <Skeleton.Input active size="small" />,
		}))}
		pagination={false}
		showHeader={showHeader}
	/>
);

// Card skeleton for card-based layouts
export const CardSkeleton = ({
	rows = 3,
	showAvatar = false,
	showImage = false,
}) => (
	<Card>
		{showImage && (
			<Skeleton.Image
				active
				style={{ width: "100%", height: 200, marginBottom: 16 }}
			/>
		)}
		{showAvatar && (
			<Skeleton.Avatar active size="large" style={{ marginBottom: 16 }} />
		)}
		<Skeleton active paragraph={{ rows }} />
	</Card>
);

// Form skeleton for form loading states
export const FormSkeleton = ({ fields = 4, showTitle = false }) => (
	<Space direction="vertical" style={{ width: "100%" }} size="large">
		{showTitle && <Skeleton.Input active style={{ width: 200, height: 24 }} />}
		{[...Array(fields)].map((_, i) => (
			<div key={i}>
				<Skeleton.Input
					active
					style={{ width: "100%", height: 32, marginBottom: 8 }}
				/>
				{i < fields - 1 && (
					<Skeleton.Input active style={{ width: "60%", height: 16 }} />
				)}
			</div>
		))}
	</Space>
);

// List skeleton for list-based layouts
export const ListSkeleton = ({ items = 3, showAvatar = true }) => (
	<Space direction="vertical" style={{ width: "100%" }} size="middle">
		{[...Array(items)].map((_, i) => (
			<div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
				{showAvatar && <Skeleton.Avatar active />}
				<div style={{ flex: 1 }}>
					<Skeleton.Input
						active
						style={{ width: "70%", height: 16, marginBottom: 8 }}
					/>
					<Skeleton.Input active style={{ width: "50%", height: 14 }} />
				</div>
			</div>
		))}
	</Space>
);

// Page-level loading skeleton for full page loads
export const PageSkeleton = ({ showHeader = true, showSidebar = false }) => (
	<div>
		{showHeader && (
			<div
				style={{
					padding: 24,
					borderBottom: "1px solid #f0f0f0",
					marginBottom: 24,
				}}
			>
				<Skeleton.Input
					active
					style={{ width: 300, height: 32, marginBottom: 8 }}
				/>
				<Skeleton.Input active style={{ width: 200, height: 20 }} />
			</div>
		)}
		<div style={{ display: "flex", gap: 24 }}>
			{showSidebar && (
				<div style={{ width: 300, flexShrink: 0 }}>
					<ListSkeleton items={5} />
				</div>
			)}
			<div style={{ flex: 1 }}>
				<CardSkeleton rows={4} />
			</div>
		</div>
	</div>
);

// PropTypes for all components
TableSkeleton.propTypes = {
	rows: PropTypes.number,
	columns: PropTypes.number,
	showHeader: PropTypes.bool,
};

CardSkeleton.propTypes = {
	rows: PropTypes.number,
	showAvatar: PropTypes.bool,
	showImage: PropTypes.bool,
};

FormSkeleton.propTypes = {
	fields: PropTypes.number,
	showTitle: PropTypes.bool,
};

ListSkeleton.propTypes = {
	items: PropTypes.number,
	showAvatar: PropTypes.bool,
};

PageSkeleton.propTypes = {
	showHeader: PropTypes.bool,
	showSidebar: PropTypes.bool,
};

export default {
	TableSkeleton,
	CardSkeleton,
	FormSkeleton,
	ListSkeleton,
	PageSkeleton,
};
