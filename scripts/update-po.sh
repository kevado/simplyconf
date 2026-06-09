#!/bin/bash

# Update PO files for simplyconf (core plugin)
# This script regenerates the POT file and updates all PO files

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
LANGUAGES_DIR="$PLUGIN_DIR/languages"
PLUGIN_NAME="simplyconf"

echo "Updating PO files for $PLUGIN_NAME..."

# Generate POT file
node "$SCRIPT_DIR/generate-pot.js"

# Update or create PO files
cd "$LANGUAGES_DIR"

for lang in fr_FR de_DE es_ES it_IT ja nl_NL pl_PL pt_BR ru_RU tr_TR zh_CN; do
    PO_FILE="${PLUGIN_NAME}-${lang}.po"
    POT_FILE="${PLUGIN_NAME}.pot"
    
    if [ -f "$PO_FILE" ]; then
        echo "Updating $PO_FILE..."
        msgmerge -U "$PO_FILE" "$POT_FILE" 2>/dev/null
    else
        echo "Creating $PO_FILE..."
        msginit --no-translator --locale="$lang" --input="$POT_FILE" --output="$PO_FILE" 2>/dev/null
    fi
done

echo "PO files updated successfully!"
