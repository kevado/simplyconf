(function (wp) {
	const { registerBlockType } = wp.blocks;
	const { useBlockProps, InspectorControls } = wp.blockEditor;
	const { Placeholder, PanelBody, SelectControl, ToggleControl, Spinner } = wp.components;
	const { __ } = wp.i18n;
	const { createElement: el, useState, useEffect } = wp.element;
	const { apiFetch } = wp;

	registerBlockType('simplyconf/register', {
		edit: function (props) {
			const { attributes, setAttributes } = props;
			const { eventId, hideTitle } = attributes;
			const [events, setEvents] = useState([]);
			const [loading, setLoading] = useState(true);

			const blockProps = useBlockProps({
				className: 'simplyconf-register-placeholder',
			});

			useEffect(() => {
				apiFetch({ path: '/simplyconf/v1/events' })
					.then((data) => {
						setEvents(data);
						setLoading(false);
					})
					.catch((error) => {
						console.error('Error fetching events:', error);
						setLoading(false);
					});
			}, []);

			const eventOptions = [
				{ label: __('Select an event...', 'simplyconf'), value: '' },
				...events.map((event) => ({
					label: event.name + ' (ID: ' + event.event_id + ')',
					value: event.event_id.toString(),
				})),
			];

			return el(
				wp.element.Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{
							title: __('Registration Settings', 'simplyconf'),
							initialOpen: true,
						},
						loading
							? el(Spinner)
							: el(
									wp.element.Fragment,
									null,
									el(SelectControl, {
										label: __('Event', 'simplyconf'),
										value: eventId ? eventId.toString() : '1',
										options: eventOptions,
										onChange: function (value) {
											setAttributes({ eventId: parseInt(value) || 1 });
										},
										help: __(
											'Select which event context this registration form uses.',
											'simplyconf'
										),
									}),
									el(ToggleControl, {
										label: __('Hide Page Title', 'simplyconf'),
										checked: hideTitle || false,
										onChange: function (value) {
											setAttributes({ hideTitle: value });
										},
										help: __(
											'Hide the page title when displaying the registration form.',
											'simplyconf'
										),
									})
							  )
					)
				),
				el(
					'div',
					blockProps,
					el(
						Placeholder,
						{
							icon: 'admin-users',
							label: __('SimplyConf Register', 'simplyconf'),
							instructions: __(
								'Displays a registration form for new conference participants to create an account.',
								'simplyconf'
							),
						},
						el(
							'div',
							{
								style: {
									marginTop: '16px',
									padding: '12px',
									backgroundColor: '#f0f6fc',
									border: '1px solid #0783be',
									borderRadius: '4px',
								},
							},
							el(
								'p',
								{ style: { margin: '0 0 8px 0', fontSize: '13px', color: '#1e1e1e' } },
								el('strong', null, __('Selected Event:', 'simplyconf')),
								' ',
								loading
									? __('Loading...', 'simplyconf')
									: events.find(function (e) { return e.event_id === eventId; })?.name ||
									  __('Event ID: ', 'simplyconf') + (eventId || 1)
							),
							el(
								'p',
								{ style: { margin: 0, fontSize: '13px', color: '#757575' } },
								__(
									'New users will be assigned the author role for the selected event.',
									'simplyconf'
								)
							)
						)
					)
				)
			);
		},

		save: function () {
			return null;
		},
	});
})(window.wp);
