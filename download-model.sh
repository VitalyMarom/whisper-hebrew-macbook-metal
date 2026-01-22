#!/bin/bash

# Script to download Whisper models for whisper-cpp
# For Hebrew, use multilingual models: tiny, base, small, medium, or large
# Larger models = better accuracy but slower

MODEL=${1:-medium}
MODELS_DIR="./models"

mkdir -p "$MODELS_DIR"

echo "Downloading whisper model: $MODEL"
echo "This may take a while depending on model size..."

# Model URLs from Hugging Face
case $MODEL in
  tiny)
    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"
    ;;
  base)
    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
    ;;
  small)
    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
    ;;
  medium)
    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin"
    ;;
  large-v1)
    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v1.bin"
    ;;
  large-v2)
    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin"
    ;;
  large-v3)
    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin"
    ;;
  large-v3-turbo)
    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin"
    ;;
  *)
    echo "Unknown model: $MODEL"
    echo "Available models: tiny, base, small, medium, large-v1, large-v2, large-v3, large-v3-turbo"
    echo "Recommended for Hebrew: medium or large-v3"
    exit 1
    ;;
esac

OUTPUT_FILE="$MODELS_DIR/ggml-${MODEL}.bin"

if [ -f "$OUTPUT_FILE" ]; then
  echo "Model already exists at $OUTPUT_FILE"
  exit 0
fi

curl -L "$URL" -o "$OUTPUT_FILE"

echo "Model downloaded to $OUTPUT_FILE"
echo ""
echo "Model sizes (approximate):"
echo "  tiny:           ~75 MB"
echo "  base:          ~142 MB"
echo "  small:         ~466 MB"
echo "  medium:        ~1.5 GB"
echo "  large-v1/v2/v3: ~3 GB"
