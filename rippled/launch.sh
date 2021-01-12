#!/bin/bash
set -e

# Verify that we are allowed to communicate with Docker
docker ps > /dev/null

./start-container.sh

DOCKER_PID=$!

node initialize.js

wait $DOCKER_PID
