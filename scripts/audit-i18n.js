const fs = require('fs');
const path = require('path');

const SCAN_DIR = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '../src');
const IGNORE_DIRS = ['node_modules', '__tests__', 'build', 'dist'];
const ATTRIBUTES_TO_CHECK = ['placeholder', 'title', 'label', 'message', 'tooltip', 'description', 'okText', 'cancelText'];

// Regex to capture potential hardcoded strings
// 1. Text between tags: >Some Text<
const JSX_TEXT_REGEX = />([^<>{}\r\n]+)</g;

// 2. Hardcoded attributes: placeholder="Some Text" (not {expression})
// match attribute name, equals, quote, content, quote
const ATTRIBUTE_REGEX = new RegExp(`\\b(${ATTRIBUTES_TO_CHECK.join('|')})=(['"])([^'"]+)\\2`, 'g');

// Ignore patterns (numbers, symbols, whitespace)
const IGNORE_TEXT_REGEX = /^[\s\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;

let issueCount = 0;

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (IGNORE_DIRS.includes(f)) continue;
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            if (f.endsWith('.js') || f.endsWith('.jsx')) {
                callback(dirPath);
            }
        }
    }
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let fileHasIssues = false;

    // Check specific lines
    lines.forEach((line, index) => {
        let match;
        const lineNum = index + 1;

        // Check JSX Text
        while ((match = JSX_TEXT_REGEX.exec(line)) !== null) {
            const text = match[1].trim();
            if (text && !IGNORE_TEXT_REGEX.test(text)) {
                if (!fileHasIssues) {
                    console.log(`\n📄 ${path.relative(path.join(__dirname, '..'), filePath)}`);
                    fileHasIssues = true;
                }
                console.log(`  L${lineNum} [Text]: "${text}"`);
                issueCount++;
            }
        }

        // Check Attributes
        while ((match = ATTRIBUTE_REGEX.exec(line)) !== null) {
            const attr = match[1];
            const text = match[3].trim();
            if (text && !IGNORE_TEXT_REGEX.test(text) && !text.startsWith('http')) {
                 if (!fileHasIssues) {
                    console.log(`\n📄 ${path.relative(path.join(__dirname, '..'), filePath)}`);
                    fileHasIssues = true;
                }
                console.log(`  L${lineNum} [Attr: ${attr}]: "${text}"`);
                issueCount++;
            }
        }
    });
}

console.log('🔍 Starting I18n Audit...\n');
walkDir(SCAN_DIR, checkFile);

if (issueCount === 0) {
    console.log('\n✅ No potential i18n issues found!');
} else {
    console.log(`\n⚠️  Found ${issueCount} potential issues.`);
}
