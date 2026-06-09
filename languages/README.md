# SimplyConf Translation Files

This directory contains translation files for SimplyConf in multiple languages.

## 📁 File Structure

```
languages/
├── simplyconf.pot           # Template file (source)
├── simplyconf-es_ES.po      # Spanish (Spain)
├── simplyconf-de_DE.po      # German (Germany)
├── simplyconf-fr_FR.po      # French (France)
├── simplyconf-it_IT.po      # Italian (Italy)
├── simplyconf-pt_BR.po      # Portuguese (Brazil)
├── simplyconf-nl_NL.po      # Dutch (Netherlands)
├── simplyconf-ru_RU.po      # Russian (Russia)
├── simplyconf-ja.po         # Japanese
├── simplyconf-zh_CN.po      # Chinese (Simplified)
├── simplyconf-pl_PL.po      # Polish (Poland)
└── simplyconf-tr_TR.po      # Turkish (Turkey)
```

## 🌍 Available Languages

| Language | Locale Code | Status | Strings Translated |
|----------|-------------|--------|-------------------|
| Spanish (Spain) | `es_ES` | 🟡 In Progress | Sample only |
| German (Germany) | `de_DE` | 🟡 Starter | Sample only |
| French (France) | `fr_FR` | 🟡 Starter | Sample only |
| Italian (Italy) | `it_IT` | 🟡 Starter | Sample only |
| Portuguese (Brazil) | `pt_BR` | 🟡 Starter | Sample only |
| Dutch (Netherlands) | `nl_NL` | 🟡 Starter | Sample only |
| Russian (Russia) | `ru_RU` | 🟡 Starter | Sample only |
| Japanese | `ja` | 🟡 Starter | Sample only |
| Chinese (Simplified) | `zh_CN` | 🟡 Starter | Sample only |
| Polish (Poland) | `pl_PL` | 🟡 Starter | Sample only |
| Turkish (Turkey) | `tr_TR` | 🟡 Starter | Sample only |

**Total translatable strings:** 338

## 🚀 Quick Start for Translators

### Option 1: Using Poedit (Recommended)

1. **Install Poedit:**
   ```bash
   brew install --cask poedit  # macOS
   # Or download from https://poedit.net/
   ```

2. **Open your language file:**
   ```bash
   open -a Poedit languages/simplyconf-es_ES.po
   ```

3. **Translate strings** in the Poedit interface

4. **Save** - Poedit automatically generates the `.mo` file

### Option 2: Manual Translation

1. **Edit the PO file** with any text editor
2. **Find untranslated strings** (look for empty `msgstr ""`)
3. **Add translations:**
   ```po
   msgid "Account"
   msgstr "Cuenta"  # Add your translation here
   ```
4. **Compile to MO:**
   ```bash
   npm run i18n:compile:es  # Replace :es with your language
   ```

## 📝 Translation Guidelines

### Do's ✅
- Keep the same formatting (HTML tags, placeholders)
- Preserve special characters like `%s`, `%d`, `{variable}`
- Maintain capitalization style
- Test translations in context
- Use formal/informal tone consistently

### Don'ts ❌
- Don't translate variable names like `{selectedRowKeys.length}`
- Don't remove HTML tags like `<strong>`, `<br>`
- Don't change placeholder order without adjusting code
- Don't translate brand names (SimplyConf, WordPress)

### Examples

**Good:**
```po
msgid "Delete {count} items"
msgstr "Eliminar {count} elementos"
```

**Bad:**
```po
msgid "Delete {count} items"
msgstr "Eliminar elementos"  # Missing {count} placeholder!
```

## 🔧 For Developers

### Generate POT file
```bash
npm run i18n:make-pot
```

### Compile all languages
```bash
npm run i18n:compile
```

### Compile specific language
```bash
npm run i18n:compile:es  # Spanish
npm run i18n:compile:de  # German
npm run i18n:compile:fr  # French
# etc...
```

## 📊 Translation Progress

To check translation progress:
```bash
msgfmt --statistics languages/simplyconf-es_ES.po
```

Output example:
```
10 translated messages, 328 untranslated messages.
```

## 🤝 Contributing Translations

1. Fork the repository
2. Complete translations in your language's PO file
3. Test the translations locally
4. Submit a pull request with:
   - Updated `.po` file
   - Compiled `.mo` file
   - Screenshots showing translations in context (optional)

## 📚 Resources

- **Poedit:** https://poedit.net/
- **WordPress i18n:** https://developer.wordpress.org/plugins/internationalization/
- **Locale Codes:** https://wpastra.com/docs/complete-list-wordpress-locale-codes/
- **Translation Best Practices:** https://make.wordpress.org/polyglots/handbook/

## 🆘 Need Help?

- Check existing translations for context
- Use the POT file as reference
- Contact the development team
- Join WordPress translation community

---

**Last Updated:** 2025-12-03  
**Plugin Version:** 3.0.0  
**Total Strings:** 338
