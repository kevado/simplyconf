#!/usr/bin/env node

/**
 * Generate POT file for SimplyConf
 *
 * This script extracts translatable strings from PHP and JavaScript files
 * and generates a POT (Portable Object Template) file for translation.
 */

const fs = require('node:fs');
const path = require('path');

// Configuration
const CONFIG = {
	domain: 'simplyconf',
	package: 'SimplyConf',
	version: '3.0.0',
	bugReportUrl: 'https://simplyconf.com',
	outputFile: path.join(__dirname, '..', 'languages', 'simplyconf.pot'),
	sourceDirs: [
		path.join(__dirname, '..', 'src'),
		path.join(__dirname, '..', 'inc'),
		path.join(__dirname, '..', 'classes'),
		path.join(__dirname, '..', 'routes'),
		path.join(__dirname, '..'), // Root directory for main plugin file
	],
	excludeDirs: [
		'node_modules',
		'dist',
		'tests',
		'playwright-report',
		'vendor',
		'.git',
	],
	fileExtensions: ['.js', '.jsx', '.tsx', '.ts', '.php'],
};

// Translation function patterns
const PATTERNS = {
	// JavaScript/React patterns
	js: [
		// __('text', 'domain')
		/__\(\s*'((?:[^'\\]|\\.)+)'\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/__\(\s*"((?:[^"\\]|\\.)+)"\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		// _e('text', 'domain')
		/_e\(\s*'((?:[^'\\]|\\.)+)'\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/_e\(\s*"((?:[^"\\]|\\.)+)"\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		// _n('singular', 'plural', number, 'domain')
		/_n\(\s*'((?:[^'\\]|\\.)+)'\s*,\s*['"]([^'"]+)['"]\s*,\s*[^,]+\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/_n\(\s*"((?:[^"\\]|\\.)+)"\s*,\s*['"]([^'"]+)['"]\s*,\s*[^,]+\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		// _x('text', 'context', 'domain')
		/_x\(\s*'((?:[^'\\]|\\.)+)'\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/_x\(\s*"((?:[^"\\]|\\.)+)"\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		// esc_html__('text', 'domain')
		/esc_html__\(\s*'((?:[^'\\]|\\.)+)'\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/esc_html__\(\s*"((?:[^"\\]|\\.)+)"\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		// esc_attr__('text', 'domain')
		/esc_attr__\(\s*'((?:[^'\\]|\\.)+)'\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/esc_attr__\(\s*"((?:[^"\\]|\\.)+)"\s*,\s*['"]([^'"]+)['"]\s*\)/g,
	],
	// PHP patterns
	php: [
		/__\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/_e\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/_n\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*[^,]+\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/_x\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/esc_html__\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/esc_attr__\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/esc_html_e\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
		/esc_attr_e\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
	],
};

class POTGenerator {
	constructor() {
		this.strings = new Map();
		this.stats = {
			filesProcessed: 0,
			stringsFound: 0,
		};
	}

	/**
	 * Recursively find all files in directories
	 */
	findFiles(dir, files = []) {
		if (!fs.existsSync(dir)) {
			return files;
		}

		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				if (!CONFIG.excludeDirs.includes(entry.name)) {
					this.findFiles(fullPath, files);
				}
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name);
				if (CONFIG.fileExtensions.includes(ext)) {
					files.push(fullPath);
				}
			}
		}

		return files;
	}

	/**
	 * Get line number from content and index
	 */
	getLineNumber(content, index) {
		return content.substring(0, index).split('\n').length;
	}

	/**
	 * Extract strings from a file
	 */
	extractFromFile(filePath) {
		const content = fs.readFileSync(filePath, 'utf8');
		const ext = path.extname(filePath);
		const patterns = ext === '.php' ? PATTERNS.php : PATTERNS.js;
		const relativePath = path.relative(path.join(__dirname, '..'), filePath);

		let foundInFile = 0;

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				let msgid = match[1];
				msgid = msgid.replace(/\\(['"])/g, '$1');
				const domain = match[2] || match[3]; // Handle different capture groups

				// Only include strings for our domain
				if (domain === CONFIG.domain) {
					const lineNumber = this.getLineNumber(content, match.index);
					const reference = `${relativePath}:${lineNumber}`;

					if (!this.strings.has(msgid)) {
						this.strings.set(msgid, {
							msgid,
							references: [],
						});
					}

					this.strings.get(msgid).references.push(reference);
					foundInFile++;
				}
			}
		}

		this.stats.filesProcessed++;
		if (foundInFile > 0) {
			console.log(`  ✓ ${relativePath}: ${foundInFile} strings`);
		}

		return foundInFile;
	}

	/**
	 * Generate POT file header
	 */
	generateHeader() {
		const now = new Date();
		const year = now.getFullYear();
		const timestamp = now.toISOString().replace(/\.\d{3}Z$/, '+0000');

		return `# Copyright (C) ${year} ${CONFIG.package}
# This file is distributed under the same license as the ${CONFIG.package} package.
msgid ""
msgstr ""
"Project-Id-Version: ${CONFIG.package} ${CONFIG.version}\\n"
"Report-Msgid-Bugs-To: ${CONFIG.bugReportUrl}\\n"
"POT-Creation-Date: ${timestamp}\\n"
"PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE\\n"
"Last-Translator: FULL NAME <EMAIL@ADDRESS>\\n"
"Language-Team: LANGUAGE <LL@li.org>\\n"
"Language: \\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"

`;
	}

	/**
	 * Generate POT entry for a string
	 */
	generateEntry(string) {
		let entry = '';

		// Add references
		for (const ref of string.references) {
			entry += `#: ${ref}\n`;
		}

		// Add msgid
		entry += `msgid "${string.msgid.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"\n`;
		entry += `msgstr ""\n\n`;

		return entry;
	}

	/**
	 * Generate the complete POT file
	 */
	async generate() {
		console.log('🔍 Scanning for translatable strings...\n');

		// Find all files
		const allFiles = [];
		for (const dir of CONFIG.sourceDirs) {
			this.findFiles(dir, allFiles);
		}

		console.log(`Found ${allFiles.length} files to process\n`);

		// Extract strings from all files
		for (const file of allFiles) {
			try {
				this.extractFromFile(file);
			} catch (error) {
				console.error(`  ✗ Error processing ${file}: ${error.message}`);
			}
		}

		this.stats.stringsFound = this.strings.size;

		console.log('\n📊 Statistics:');
		console.log(`   Files processed: ${this.stats.filesProcessed}`);
		console.log(`   Unique strings found: ${this.stats.stringsFound}`);

		// Generate POT content
		let potContent = this.generateHeader();

		// Sort strings alphabetically for consistency
		const sortedStrings = Array.from(this.strings.values()).sort((a, b) =>
			a.msgid.localeCompare(b.msgid)
		);

		for (const string of sortedStrings) {
			potContent += this.generateEntry(string);
		}

		// Write POT file
		const outputDir = path.dirname(CONFIG.outputFile);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		fs.writeFileSync(CONFIG.outputFile, potContent, 'utf8');

		console.log(`\n✅ POT file generated: ${CONFIG.outputFile}`);
	}
}

// Run the generator
const generator = new POTGenerator();
generator.generate().catch((error) => {
	console.error('❌ Error generating POT file:', error);
	process.exit(1);
});
