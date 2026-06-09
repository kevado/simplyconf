import { __ } from "@wordpress/i18n";
import React from "react";

const NotFound = () => {
	return (
		<React.Fragment>
			<h2>{__("Not found", "simplyconf")}</h2>
			<p>{__("There is nothing here!", "simplyconf")}</p>
		</React.Fragment>
	);
};

export default NotFound;
