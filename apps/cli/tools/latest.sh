#!/bin/bash

PACKAGE_NAME=$(node -p "require('./package.json').name")
LATEST_BETA=$(npm view "$PACKAGE_NAME" dist-tags.beta)

echo "Promoting $PACKAGE_NAME@$LATEST_BETA to latest"
npm dist-tag add "$PACKAGE_NAME@$LATEST_BETA" latest
