#!/bin/bash

# Stop the Metal whisper setup

# Check if Docker is running (optional for stop, but good to validate)
if ! docker info > /dev/null 2>&1; then
    echo "Warning: Docker is not running or not installed."
    echo "Attempting to stop services anyway..."
fi

echo "Stopping audio extraction service..."
pkill -f "audio-extraction-service.py" 2>/dev/null
sleep 1

echo "Stopping web UI..."
docker compose -f docker-compose.metal.yml down 2>/dev/null
sleep 1

echo "Stopping whisper server..."
if pgrep -f "whisper-server" > /dev/null; then
    pkill -f "whisper-server" 2>/dev/null
    sleep 2
fi

# Also stop any docker whisper services
docker compose down 2>/dev/null

echo "All services stopped."
