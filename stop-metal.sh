#!/bin/bash

# Stop the Metal whisper setup

# Check if Docker is running (optional for stop, but good to validate)
if ! docker info > /dev/null 2>&1; then
    echo "Warning: Docker is not running or not installed."
    echo "Attempting to stop services anyway..."
fi

echo "Stopping audio extraction service..."
pkill -f "audio-extraction-service.py" 2>/dev/null

echo "Stopping web UI..."
docker compose -f docker-compose.metal.yml down 2>/dev/null

echo "Stopping whisper server..."
pkill -f "whisper-server" 2>/dev/null

# Also stop any docker whisper services
docker compose down 2>/dev/null

echo "Done."
