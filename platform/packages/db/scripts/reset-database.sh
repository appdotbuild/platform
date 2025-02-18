#!/usr/bin/env bash
# Extract the project name from the root package.json file
PROJECT_NAME=$(grep -m 1 '"name":' ../../package.json | awk -F'"' '{print $4}' | sed 's/^@//' | sed 's/\//-/g')

# Set the container name using the project name
DB_CONTAINER_NAME="${PROJECT_NAME}-postgres"

if ! [ -x "$(command -v docker)" ]; then
  echo -e "Docker is not installed. Please install docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

# import env variables from .env
set -a
#find the first .env file in the apps/* directories that have a POSTGRES_URL variable:
ENV_FILE=$(find ../../apps/* -name .env -exec grep -l 'POSTGRES_URL' {} + | head -n 1)
source $ENV_FILE

DB_PASSWORD=$(echo "$POSTGRES_URL" | awk -F':' '{print $3}' | awk -F'@' '{print $1}')
DB_USER=$(echo "$POSTGRES_URL" | awk -F':' '{print $2}' | awk -F'//' '{print $2}')
DB_PORT=$(echo "$POSTGRES_URL" | awk -F':' '{print $4}' | awk -F'\/' '{print $1}')
DB_NAME=$(echo "$POSTGRES_URL" | awk -F'/' '{print $4}' | awk -F'?' '{print $1}')

# Reset and seeds all apps:
echo "Waiting for database to be ready..."
COUNT=30
until docker exec $DB_CONTAINER_NAME pg_isready -U "$DB_USER" -d "$DB_NAME"; do
  if [ $COUNT -lt 0 ]; then
    echo "Timed out waiting for PostgreSQL to become available"
    exit 1
  fi
  COUNT=$((COUNT - 1))

  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

sleep 1

echo "Migrating database..."
cd ../../packages/db && pnpm drizzle-kit migrate

cd ../../packages/db && pnpm seed

echo "Database reset completed"