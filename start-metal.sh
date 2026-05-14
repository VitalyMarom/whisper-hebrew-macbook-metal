#!/bin/bash

# Start whisper-cpp with Metal GPU acceleration on macOS
# This script starts the native whisper server and the web UI

MODEL_PATH="./models/ggml-medium.bin"
WHISPER_PORT=8080

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running or not installed."
    echo "Please start Docker and try again."
    echo ""
    echo "On macOS, you can start Docker by:"
    echo "  - Opening Docker Desktop from Applications"
    echo "  - Or running: open /Applications/Docker.app"
    exit 1
fi

# Check if whisper-server is installed
if ! command -v whisper-server &> /dev/null; then
    echo "whisper-server not found. Installing via Homebrew..."
    brew install whisper-cpp
fi

# Check if model exists
if [ ! -f "$MODEL_PATH" ]; then
    echo "Model not found at $MODEL_PATH"
    echo "Run: ./download-model.sh medium"
    exit 1
fi

# Check if port is already in use
if lsof -i :$WHISPER_PORT > /dev/null 2>&1; then
    echo "Port $WHISPER_PORT is already in use. Stopping existing processes..."
    pkill -f whisper-server 2>/dev/null
    sleep 2
fi

# Stop any existing docker services that might conflict
docker compose down 2>/dev/null
docker compose -f docker-compose.metal.yml down 2>/dev/null

echo ""
echo "Starting whisper server with Metal acceleration..."
echo "Model: $MODEL_PATH"
echo "Port: $WHISPER_PORT"
echo ""

# Start whisper server in background
whisper-server \
    --model "$MODEL_PATH" \
    --host 127.0.0.1 \
    --port $WHISPER_PORT \
    --convert \
    &

WHISPER_PID=$!
echo "Whisper server starting (PID: $WHISPER_PID)"

# Wait for server to be ready
echo "Waiting for server to initialize..."
sleep 5

# Check if server is running
if ! kill -0 $WHISPER_PID 2>/dev/null; then
    echo "Error: Whisper server failed to start"
    exit 1
fi

# Start audio extraction service (optional, for YouTube/Spotify support)
if command -v python3 &> /dev/null; then
    echo "Starting audio extraction service..."
    python3 audio-extraction-service.py &
    AUDIO_SVC_PID=$!
    sleep 2
    echo "Audio extraction service started (PID: $AUDIO_SVC_PID)"
else
    echo "Warning: Python3 not found. YouTube/Spotify audio extraction will not be available."
fi

# Start the UI container
echo "Starting web UI..."
docker compose -f docker-compose.metal.yml up -d

echo ""
echo "=========================================="
echo "  Whisper with Metal is running!"
echo "=========================================="
echo ""
echo "  Web UI: http://localhost:3000"
echo "  API:    http://localhost:$WHISPER_PORT"
echo ""
echo "  To stop: ./stop-metal.sh"
echo "  Or press Ctrl+C"
echo ""

# Keep script running and show server output
wait $WHISPER_PID
