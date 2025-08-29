#!/bin/bash

# Script to get the first Databricks app and delete it if it exists
# Uses the Databricks CLI to manage apps

set -e  # Exit on any error

echo "🔍 Checking for Databricks apps..."

# Get list of apps in JSON format and extract the first app name
FIRST_APP=$(databricks apps list --output json 2>/dev/null | jq -r '.[0].name // empty' 2>/dev/null)

# Check if we found any apps
if [ -z "$FIRST_APP" ] || [ "$FIRST_APP" = "null" ]; then
    echo "ℹ️  No Databricks apps found in the workspace."
    exit 0
fi

echo "📱 Found first app: $FIRST_APP"

# Confirm deletion (uncomment the lines below if you want interactive confirmation)
# echo "❓ Do you want to delete the app '$FIRST_APP'? (y/N)"
# read -r CONFIRM
# if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
#     echo "❌ Deletion cancelled."
#     exit 0
# fi

echo "🗑️  Deleting app: $FIRST_APP"

# Delete the app
if databricks apps delete "$FIRST_APP" 2>/dev/null; then
    echo "✅ Successfully deleted app: $FIRST_APP"
else
    echo "❌ Failed to delete app: $FIRST_APP"
    exit 1
fi