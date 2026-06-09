/**
 * Utility functions for triggering browser file downloads.
 */

/**
 * Triggers a browser download for a given Blob.
 * @param {Blob} blob - The file blob to download
 * @param {string} filename - The suggested filename
 */
export function downloadBlob(blob, filename) {
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	window.URL.revokeObjectURL(url);
	document.body.removeChild(a);
}

/**
 * Decodes a base64-encoded PDF string and triggers a browser download.
 * @param {string} base64Content - Base64-encoded file content
 * @param {string} filename - The suggested filename
 */
export function downloadBase64File(base64Content, filename) {
	const binaryString = atob(base64Content);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	const blob = new Blob([bytes], { type: "application/pdf" });
	downloadBlob(blob, filename);
}
