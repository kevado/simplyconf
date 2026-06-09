import { getSettingByNameAndCategory } from "@state/settingSlice";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import AbstractSinglePage from "./AbstractSinglePage";
import AbstractWizard from "./AbstractWizard";

const AbstractSubmission = ({ abstractId }) => {
	const globalEventId = useSelector((state) => state.events.globalId);
	const submissionMode = useSelector((state) =>
		getSettingByNameAndCategory(
			state,
			"abstract",
			"submission_mode",
			globalEventId,
		),
	);
	const isSinglePage = submissionMode?.value === "single_page";

	return isSinglePage ? (
		<AbstractSinglePage abstractId={abstractId} />
	) : (
		<AbstractWizard abstractId={abstractId} />
	);
};

AbstractSubmission.propTypes = {
	abstractId: PropTypes.number,
};

export default AbstractSubmission;
