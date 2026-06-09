#!/bin/bash

# Script to generate JSON files from PO files for internationalization
# This script processes all .po files in the languages/ directory

set -e  # Exit on any error

echo "Generating JSON files from PO files..."

for file in languages/*.po; do
    echo "Processing $file..."
    php -d error_reporting=E_ERROR $(which wp) i18n make-json "$file" --no-purge || true
done

# echo "Running fix-json-domain.js..."
# node ./scripts/fix-json-domain.js

echo "JSON generation complete!"
