#!/bin/bash

# Script to compile PO files to MO files for internationalization
# This script processes all .po files in the languages/ directory

set -e  # Exit on any error

echo "Compiling PO files to MO files..."

for file in languages/*.po; do
    echo "Compiling $file..."
    msgfmt "$file" -o "${file%.po}.mo"
done

echo "MO compilation complete!"
