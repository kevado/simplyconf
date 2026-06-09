import { __ } from "@wordpress/i18n";
import { Alert, Button, Result } from "antd";
import PropTypes from "prop-types";
import React from "react";

/**
 * Error Boundary component for graceful error handling
 * Catches JavaScript errors in the component tree and displays user-friendly error UI
 */
class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			errorId: null,
		};
	}

	static getDerivedStateFromError(_error) {
		// Update state so the next render will show the fallback UI
		return {
			hasError: true,
			errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		};
	}

	componentDidCatch(error, errorInfo) {
		// Log error details for debugging
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		// Store error details in state for potential reporting
		this.setState({
			error: error,
			errorInfo: errorInfo,
		});

		// Call optional error callback
		if (this.props.onError) {
			this.props.onError(error, errorInfo, this.state.errorId);
		}

		// In production, you might want to send this to an error reporting service
		if (process.env.NODE_ENV === "production") {
			// Example: Send to error reporting service
			// errorReportingService.captureException(error, { extra: errorInfo });
		}
	}

	handleRetry = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
			errorId: null,
		});
	};

	handleReport = () => {
		const { error, errorId } = this.state;
		const reportData = {
			errorId,
			message: error?.message,
			stack: error?.stack,
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
			url: window.location.href,
		};

		// Copy error details to clipboard for manual reporting
		navigator.clipboard
			.writeText(JSON.stringify(reportData, null, 2))
			.then(() => {
				alert(
					__(
						"Error details copied to clipboard. Please send this to support.",
						"simplyconf",
					),
				);
			})
			.catch(() => {
				alert(
					__(
						"Please copy the error details from the browser console and send to support.",
						"simplyconf",
					),
				);
			});
	};

	render() {
		if (this.state.hasError) {
			const { fallback: Fallback, showDetails = false } = this.props;

			// If custom fallback component is provided, use it
			if (Fallback) {
				return (
					<Fallback
						error={this.state.error}
						errorInfo={this.state.errorInfo}
						errorId={this.state.errorId}
						onRetry={this.handleRetry}
						onReport={this.handleReport}
					/>
				);
			}

			// Default error UI
			return (
				<div style={{ padding: 24, textAlign: "center" }}>
					<Result
						status="error"
						title={this.props.title || __("Something went wrong", "simplyconf")}
						subTitle={
							this.props.subTitle ||
							__(
								"We're sorry for the inconvenience. The page will reload automatically or you can try again.",
								"simplyconf",
							)
						}
						extra={[
							<Button key="retry" type="primary" onClick={this.handleRetry}>
								{this.props.retryText || __("Try Again", "simplyconf")}
							</Button>,
							<Button key="reload" onClick={() => window.location.reload()}>
								{__("Reload Page", "simplyconf")}
							</Button>,
							this.props.showReport && (
								<Button key="report" onClick={this.handleReport}>
									{__("Report Issue", "simplyconf")}
								</Button>
							),
						]}
					/>

					{showDetails && this.state.error && (
						<div style={{ marginTop: 24, textAlign: "left" }}>
							<Alert
								message={__("Error Details (for debugging)", "simplyconf")}
								description={
									<div
										style={{
											fontFamily: "monospace",
											fontSize: "12px",
											whiteSpace: "pre-wrap",
										}}
									>
										<strong>{__("Error:", "simplyconf")}</strong>{" "}
										{this.state.error.message}
										{"\n\n"}
										<strong>{__("Stack:", "simplyconf")}</strong>{" "}
										{this.state.error.stack}
									</div>
								}
								type="warning"
								showIcon
							/>
						</div>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}

ErrorBoundary.propTypes = {
	children: PropTypes.node.isRequired,
	fallback: PropTypes.elementType,
	title: PropTypes.string,
	subTitle: PropTypes.string,
	retryText: PropTypes.string,
	showReport: PropTypes.bool,
	showDetails: PropTypes.bool,
	onError: PropTypes.func,
};

export default ErrorBoundary;
