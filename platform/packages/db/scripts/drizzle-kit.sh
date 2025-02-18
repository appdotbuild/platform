#!/bin/bash

set -e

VARS=`node ../../packages/db/scripts/extractVars.js`

cd ../../packages/db

if [ "$1" == "seed" ]; then
    env $VARS bun ./seeds.ts
elif [ "$1" == "reset" ]; then
    env $VARS bun ./scripts/resetDb.ts
else
    env $VARS bun drizzle-kit $@
fi
