#!/usr/bin/env bash
# Use this script to start a docker container for a local development database

# TO RUN ON WINDOWS:
# 1. Install WSL (Windows Subsystem for Linux) - https://learn.microsoft.com/en-us/windows/wsl/install
# 2. Install Docker Desktop for Windows - https://docs.docker.com/docker-for-windows/install/
# 3. Open WSL - `wsl`
# 4. Run this script - `./start-database.sh`

# On Linux and macOS you can run this script directly - `./start-database.sh`
# Extract the project name from the root package.json file
OPTIONS=$@
PROJECT_NAME=$(grep -m 1 '"name":' ../../package.json | awk -F'"' '{print $4}' | sed 's/^@//' | sed 's/\//-/g')

# Set the container name using the project name
DB_CONTAINER_NAME="${PROJECT_NAME}-postgres"

if ! [ -x "$(command -v docker)" ]; then
  echo -e "Docker is not installed. Please install docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
  echo "Database container '$DB_CONTAINER_NAME' was already running"
  exit 0
fi

if [ "$(docker ps -q -a -f name=$DB_CONTAINER_NAME)" ]; then
  docker start -ia "$DB_CONTAINER_NAME"
  echo "Existing database container '$DB_CONTAINER_NAME' started"
  exit 0
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
echo "Creating database container '$DB_CONTAINER_NAME' db '$DB_NAME' with '$DB_USER' and '$DB_PASSWORD' on port '$DB_PORT'"

./scripts/reset-database.sh &

docker run \
  --name $DB_CONTAINER_NAME \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e POSTGRES_DB="$DB_NAME" \
  -p "$DB_PORT":5432 \
  $OPTIONS \
  pgvector/pgvector:pg17 && echo "Database container '$DB_CONTAINER_NAME' was successfully created"

wait