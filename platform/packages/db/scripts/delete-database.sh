#!/usr/bin/env bash
# Use this script to start a docker container for a local development database

# TO RUN ON WINDOWS:
# 1. Install WSL (Windows Subsystem for Linux) - https://learn.microsoft.com/en-us/windows/wsl/install
# 2. Install Docker Desktop for Windows - https://docs.docker.com/docker-for-windows/install/
# 3. Open WSL - `wsl`
# 4. Run this script - `./start-database.sh`

# On Linux and macOS you can run this script directly - `./start-database.sh`
# Extract the project name from the root package.json file
PROJECT_NAME=$(grep -m 1 '"name":' ../../package.json | awk -F'"' '{print $4}' | sed 's/^@//' | sed 's/\//-/g')

# Set the container name using the project name
DB_CONTAINER_NAME="${PROJECT_NAME}-postgres"

if ! [ -x "$(command -v docker)" ]; then
  echo -e "Docker is not installed. Please install docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
  echo "Stopping database container '$DB_CONTAINER_NAME' already running"
  docker stop $DB_CONTAINER_NAME
fi

if ! [ "$(docker ps -q -a -f name=$DB_CONTAINER_NAME)" ]; then
  echo "Database container not existing '$DB_CONTAINER_NAME', nothing to delete."
  exit 0
fi

echo "Deleting database container '$DB_CONTAINER_NAME'"

docker rm $DB_CONTAINER_NAME

echo "Done."