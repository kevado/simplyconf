import { useCallback, useEffect, useRef } from "react";

const RECAPTCHA_SCRIPT_ID = "simplyconf-recaptcha-v3";

/**
 * Hook to load Google reCAPTCHA v3 and execute token generation.
 *
 * Reads the site key from `window.simplyconf.recaptchaSiteKey`.
 * If no site key is configured, `executeRecaptcha` resolves to null
 * so callers can proceed without captcha.
 */
const useRecaptcha = () => {
	const siteKey = window.simplyconf?.recaptchaSiteKey || "";
	const readyRef = useRef(false);

	useEffect(() => {
		if (!siteKey || document.getElementById(RECAPTCHA_SCRIPT_ID)) {
			return;
		}

		const script = document.createElement("script");
		script.id = RECAPTCHA_SCRIPT_ID;
		script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
		script.async = true;
		script.defer = true;
		script.onload = () => {
			readyRef.current = true;
		};
		document.head.appendChild(script);
	}, [siteKey]);

	const executeRecaptcha = useCallback(
		(action) => {
			if (!siteKey) {
				return Promise.resolve(null);
			}

			return new Promise((resolve) => {
				const tryExecute = () => {
					if (window.grecaptcha?.execute) {
						window.grecaptcha
							.execute(siteKey, { action })
							.then(resolve)
							.catch(() => resolve(null));
					} else {
						// Script not loaded yet — wait briefly
						setTimeout(tryExecute, 200);
					}
				};
				tryExecute();
			});
		},
		[siteKey],
	);

	return { executeRecaptcha, recaptchaEnabled: !!siteKey };
};

export default useRecaptcha;
