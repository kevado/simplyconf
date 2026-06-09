# Internationalization (i18n) Workflow

## Generating POT Files

To generate the POT (Portable Object Template) file for translation:

```bash
npm run i18n:make-pot
```

This will:
- Scan all PHP and JavaScript files in `src/`, `includes/`, and `admin/` directories
- Extract all translatable strings using WordPress i18n functions
- Generate `languages/simplyconf.pot` with 338+ unique strings

## Supported Translation Functions

The POT generator recognizes these WordPress i18n functions:

### JavaScript/React
- `__('text', 'simplyconf')` - Translate string
- `_e('text', 'simplyconf')` - Translate and echo
- `_n('singular', 'plural', count, 'simplyconf')` - Plural forms
- `_x('text', 'context', 'simplyconf')` - Translate with context
- `esc_html__('text', 'simplyconf')` - Translate and escape HTML
- `esc_attr__('text', 'simplyconf')` - Translate and escape attribute

### PHP
All the above plus:
- `esc_html_e('text', 'simplyconf')` - Translate, escape HTML, and echo
- `esc_attr_e('text', 'simplyconf')` - Translate, escape attribute, and echo

## Available Languages

Sample PO files have been created for the top 10 WordPress languages:

| Language | Locale | File | Compile Command |
|----------|--------|------|-----------------|
| **Spanish (Spain)** | es_ES | `simplyconf-es_ES.po` | `npm run i18n:compile:es` |
| **German (Germany)** | de_DE | `simplyconf-de_DE.po` | `npm run i18n:compile:de` |
| **French (France)** | fr_FR | `simplyconf-fr_FR.po` | `npm run i18n:compile:fr` |
| **Italian (Italy)** | it_IT | `simplyconf-it_IT.po` | `npm run i18n:compile:it` |
| **Portuguese (Brazil)** | pt_BR | `simplyconf-pt_BR.po` | `npm run i18n:compile:pt` |
| **Dutch (Netherlands)** | nl_NL | `simplyconf-nl_NL.po` | `npm run i18n:compile:nl` |
| **Russian (Russia)** | ru_RU | `simplyconf-ru_RU.po` | `npm run i18n:compile:ru` |
| **Japanese** | ja | `simplyconf-ja.po` | `npm run i18n:compile:ja` |
| **Chinese (Simplified)** | zh_CN | `simplyconf-zh_CN.po` | `npm run i18n:compile:zh` |
| **Polish (Poland)** | pl_PL | `simplyconf-pl_PL.po` | `npm run i18n:compile:pl` |
| **Turkish (Turkey)** | tr_TR | `simplyconf-tr_TR.po` | `npm run i18n:compile:tr` |

## Translation Workflow

1. **Generate POT file** (after code changes):
   ```bash
   npm run i18n:make-pot
   ```

2. **Edit PO files** for each language:
   - Open the language file in Poedit: `open -a Poedit languages/simplyconf-es_ES.po`
   - Or edit manually with any text editor
   - Translate all 338 strings from English to target language

3. **Compile MO files**:
   ```bash
   # Compile all languages at once
   npm run i18n:compile
   
   # Or compile individual languages
   npm run i18n:compile:es
   npm run i18n:compile:de
   # etc...
   ```

## Best Practices

- Always use the `simplyconf` text domain
- Run POT generation before releases
- Keep strings simple and context-clear
- Use placeholders for dynamic content: `__('Hello %s', 'simplyconf')`
- Add translator comments for context when needed

## Statistics

Current translation coverage:
- **338 unique translatable strings**
- **99 files scanned**
- **15 files with translations**

Last updated: 2025-12-03
