#!/bin/bash

# Start whisper-cpp with Metal GPU acceleration on macOS
# This script starts the native whisper server and the web UI

MODEL_PATH="./models/ggml-medium.bin"
WHISPER_PORT=8080

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
