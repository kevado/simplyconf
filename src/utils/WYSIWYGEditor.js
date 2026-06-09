import { __ } from "@wordpress/i18n";
import { ContentState, convertToRaw, EditorState, Modifier } from "draft-js";
import draftToHtml from "draftjs-to-html";
import { forwardRef, useEffect, useState } from "react";
import { Editor } from "react-draft-wysiwyg";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import "./WYSIWYGEditor.css";

/**
 * Reusable WYSIWYG Editor Component
 *
 * A rich text editor built on Draft.js that can be used across the entire application
 * for editing email templates, abstracts, reviews, etc.
 *
 * @param {Object} props
 * @param {string} props.value - Current editor content (HTML)
 * @param {Function} props.onChange - Callback when content changes
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.minHeight - Minimum height in pixels
 * @param {boolean} props.readOnly - Whether editor is read-only
 * @param {Array} props.customButtons - Custom toolbar buttons
 * @param {Function} props.onCustomButtonClick - Custom button click handler
 * @param {Object} props.style - Additional styles
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showCharCount - Whether to show character count
 * @param {number} props.maxLength - Maximum character count
 * @param {string} props.domain - Translation domain
 *
 * @example
 * // Basic usage
 * <WYSIWYGEditor
 *   value={content}
 *   onChange={setContent}
 *   placeholder="Enter your content here..."
 * />
 *
 * @example
 * // With character count and max length
 * <WYSIWYGEditor
 *   value={content}
 *   onChange={setContent}
 *   minHeight={300}
 *   showCharCount={true}
 *   maxLength={5000}
 * />
 *
 * @example
 * // For email templates
 * <WYSIWYGEditor
 *   value={emailBody}
 *   onChange={setEmailBody}
 *   placeholder="Enter email message..."
 *   domain="simplyconf-emails"
 * />
 */
const WYSIWYGEditor = forwardRef(
	(
		{
			value = "",
			onChange,
			placeholder = __("Start typing...", "simplyconf"),
			minHeight = 400,
			readOnly = false,
			disabled = false,
			customButtons = [],
			onCustomButtonClick,
			style = {},
			className = "",
			showCharCount = false,
			maxLength = null,
			domain = "simplyconf",
		},
		ref,
	) => {
		// Map disabled to readOnly for consistency with other form components
		const isReadOnly = readOnly || disabled;
		// Convert HTML to EditorState
		const createEditorState = (html) => {
			if (html && html.trim() !== "") {
				try {
					// For now, create from plain text since HTML conversion is complex
					// This ensures content is preserved even if formatting is lost initially
					const plainText = html.replace(/<[^>]*>/g, ""); // Strip HTML tags
					const contentState = ContentState.createFromText(plainText);
					return EditorState.createWithContent(contentState);
				} catch (error) {
					console.warn("Error creating editor state from HTML:", error);
					return EditorState.createEmpty();
				}
			}
			return EditorState.createEmpty();
		};

		// Initialize editor state
		const [editorState, setEditorState] = useState(() =>
			createEditorState(value),
		);

		// Update editor state when value prop changes
		useEffect(() => {
			if (
				value !== draftToHtml(convertToRaw(editorState.getCurrentContent()))
			) {
				setEditorState(createEditorState(value));
			}
		}, [value, createEditorState, editorState.getCurrentContent]);

		// Handle content change
		const handleEditorStateChange = (newState) => {
			setEditorState(newState);

			// Convert to HTML
			const rawContent = convertToRaw(newState.getCurrentContent());
			const content = draftToHtml(rawContent);

			// Check if content is empty or just whitespace
			const isEmpty =
				!content ||
				content.trim() === "" ||
				content === "<p><br></p>" ||
				content === "<p></p>";

			if (onChange) {
				onChange(isEmpty ? "" : content);
			}
		};

		// Get character count
		const getCharCount = () => {
			if (!editorState) return 0;
			const content = editorState.getCurrentContent();
			return content.getPlainText().length;
		};

		// Enforce maxLength by blocking input when limit is reached
		const handleBeforeInput = (chars) => {
			if (!maxLength) return "not-handled";
			const currentLength = getCharCount();
			if (currentLength + chars.length > maxLength) {
				return "handled";
			}
			return "not-handled";
		};

		const handlePastedText = (text) => {
			if (!maxLength) return false;
			const currentLength = getCharCount();
			if (currentLength + text.length > maxLength) {
				// Truncate pasted text to fit within the limit
				const remaining = maxLength - currentLength;
				if (remaining <= 0) return true;
				const truncated = text.slice(0, remaining);
				const contentState = editorState.getCurrentContent();
				const selection = editorState.getSelection();
				const newContent = Modifier.insertText(
					contentState,
					selection,
					truncated,
				);
				const newState = EditorState.push(
					editorState,
					newContent,
					"insert-characters",
				);
				handleEditorStateChange(newState);
				return true;
			}
			return false;
		};

		// Toolbar configuration
		const toolbar = {
			options: [
				"inline",
				"blockType",
				"fontSize",
				"list",
				"textAlign",
				"colorPicker",
				"link",
				"history",
			],
			inline: {
				options: ["bold", "italic", "underline", "strikethrough"],
			},
			blockType: {
				options: ["Normal", "H1", "H2", "H3", "H4", "H5", "H6"],
			},
			fontSize: {
				options: [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72],
			},
			list: {
				options: ["unordered", "ordered"],
			},
			textAlign: {
				options: ["left", "center", "right"],
			},
			colorPicker: {
				presetColors: [
					"#000000",
					"#FF0000",
					"#00FF00",
					"#0000FF",
					"#FFFF00",
					"#FF00FF",
					"#00FFFF",
				],
			},
		};

		return (
			<div
				className={`wysiwyg-editor-container ${className}`}
				style={{ ...style }}
			>
				<Editor
					ref={ref}
					editorState={editorState}
					onEditorStateChange={handleEditorStateChange}
					handleBeforeInput={handleBeforeInput}
					handlePastedText={handlePastedText}
					wrapperStyle={{
						minHeight: `${minHeight}px`,
					}}
					editorStyle={{
						minHeight: `${minHeight - 100}px`,
						padding: "16px",
						border: "1px solid #d9d9d9",
						borderRadius: "0 0 8px 8px",
						background: isReadOnly ? "#f5f5f5" : "#ffffff",
					}}
					toolbar={toolbar}
					placeholder={placeholder}
					readOnly={isReadOnly}
				/>
				{showCharCount && (
					<div
						className="wysiwyg-char-count"
						style={
							maxLength && getCharCount() >= maxLength
								? { color: "#ff4d4f" }
								: undefined
						}
					>
						{getCharCount()}
						{maxLength && ` / ${maxLength}`}
					</div>
				)}
			</div>
		);
	},
);

/**
 * Insert text at cursor position
 * Utility function to insert text/variables into the Draft.js editor
 *
 * @param {Object} editorRef - React ref to the Draft.js editor
 * @param {string} text - Text to insert
 *
 * @example
 * const editorRef = useRef();
 * insertTextAtCursor(editorRef, '{variable_name}');
 */
export const insertTextAtCursor = (editorRef, text) => {
	if (!editorRef.current) {
		return;
	}

	// The ref now points directly to the react-draft-wysiwyg Editor component
	const editor = editorRef.current;

	// Get the editor state from the component's props
	const currentEditorState = editor.props.editorState;

	if (!currentEditorState) {
		return;
	}

	// Get current selection
	const selection = currentEditorState.getSelection();
	const currentContent = currentEditorState.getCurrentContent();

	// Insert text at cursor position using Draft.js Modifier
	const newContent = Modifier.insertText(currentContent, selection, text);

	const newEditorState = EditorState.push(
		currentEditorState,
		newContent,
		"insert-text",
	);

	// Update the editor state through the parent component's onChange
	if (editor.props.onEditorStateChange) {
		editor.props.onEditorStateChange(newEditorState);
	}
};

/**
 * Get plain text from HTML
 * Utility to extract plain text from HTML content
 *
 * @param {string} html - HTML content
 * @returns {string} Plain text
 *
 * @example
 * const plainText = getPlainTextFromHTML('<p>Hello <strong>World</strong></p>');
 * // Returns: "Hello World"
 */
export const getPlainTextFromHTML = (html) => {
	const div = document.createElement("div");
	div.innerHTML = html;
	return div.textContent || div.innerText || "";
};

/**
 * Get word count from HTML
 * Utility to count words in HTML content
 *
 * @param {string} html - HTML content
 * @returns {number} Word count
 *
 * @example
 * const wordCount = getWordCount('<p>Hello world</p>');
 * // Returns: 2
 */
export const getWordCount = (html) => {
	const text = getPlainTextFromHTML(html);
	return text
		.trim()
		.split(/\s+/)
		.filter((word) => word.length > 0).length;
};

export default WYSIWYGEditor;
