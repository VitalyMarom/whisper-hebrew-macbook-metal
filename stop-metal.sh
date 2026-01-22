#!/bin/bash

# Stop the Metal whisper setup

echo "Stopping web UI..."
docker compose -f docker-compose.metal.yml down 2>/dev/null

echo "Stopping whisper server..."
pkill -f "whisper-server" 2>/dev/null

# Also stop any docker whisper services
docker compose down 2>/dev/null

echo "Done."
