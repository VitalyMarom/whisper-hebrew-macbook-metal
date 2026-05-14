.PHONY: help start stop download-model install-deps clean logs

# Default target
help:
	@echo "Whisper Hebrew Transcription Service"
	@echo ""
	@echo "Available targets:"
	@echo "  make start              Start the service with Metal GPU acceleration"
	@echo "  make stop               Stop all services"
	@echo "  make download-model     Download Whisper model (default: medium)"
	@echo "                          Usage: make download-model MODEL=large-v3"
	@echo "  make install-deps       Install dependencies (brew)"
	@echo "  make docker-start       Start with Docker CPU (instead of Metal)"
	@echo "  make logs               Show Docker logs"
	@echo "  make clean              Clean up downloaded models and containers"
	@echo ""
	@echo "Quick start:"
	@echo "  1. make install-deps"
	@echo "  2. make download-model"
	@echo "  3. make start"
	@echo ""
	@echo "Available models: tiny, base, small, medium, large-v1, large-v2, large-v3, large-v3-turbo"
	@echo "Recommended for Hebrew: medium or large-v3"

# Install dependencies via Homebrew
install-deps:
	@echo "Installing dependencies..."
	@which brew > /dev/null || (echo "Homebrew not found. Please install from https://brew.sh"; exit 1)
	brew install whisper-cpp ffmpeg
	@echo "Dependencies installed!"

# Download Whisper model
download-model:
	@MODEL=$${MODEL:-medium}; \
	MODELS_DIR="./models"; \
	mkdir -p "$$MODELS_DIR"; \
	echo "Downloading whisper model: $$MODEL"; \
	echo "This may take a while depending on model size..."; \
	\
	case $$MODEL in \
	  tiny) \
	    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"; \
	    ;; \
	  base) \
	    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"; \
	    ;; \
	  small) \
	    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"; \
	    ;; \
	  medium) \
	    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin"; \
	    ;; \
	  large-v1) \
	    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v1.bin"; \
	    ;; \
	  large-v2) \
	    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin"; \
	    ;; \
	  large-v3) \
	    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin"; \
	    ;; \
	  large-v3-turbo) \
	    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin"; \
	    ;; \
	  *) \
	    echo "Unknown model: $$MODEL"; \
	    echo "Available models: tiny, base, small, medium, large-v1, large-v2, large-v3, large-v3-turbo"; \
	    exit 1; \
	    ;; \
	esac; \
	\
	OUTPUT_FILE="$$MODELS_DIR/ggml-$$MODEL.bin"; \
	\
	if [ -f "$$OUTPUT_FILE" ]; then \
	  echo "Model already exists at $$OUTPUT_FILE"; \
	  exit 0; \
	fi; \
	\
	curl -L "$$URL" -o "$$OUTPUT_FILE"; \
	echo "Model downloaded to $$OUTPUT_FILE"; \
	echo ""; \
	echo "Model sizes (approximate):"; \
	echo "  tiny:           ~75 MB"; \
	echo "  base:          ~142 MB"; \
	echo "  small:         ~466 MB"; \
	echo "  medium:        ~1.5 GB"; \
	echo "  large-v1/v2/v3: ~3 GB"

# Start with Metal GPU acceleration
start:
	@bash start-metal.sh

# Stop all services
stop:
	@bash stop-metal.sh

# Start with Docker CPU (portable option)
docker-start:
	@if ! docker info > /dev/null 2>&1; then \
	  echo "Error: Docker is not running or not installed."; \
	  echo "Please start Docker and try again."; \
	  exit 1; \
	fi
	docker compose up -d --build

# Stop Docker services
docker-stop:
	docker compose down

# Show Docker logs
logs:
	docker compose -f docker-compose.metal.yml logs -f

# Clean up models and containers
clean:
	@echo "Cleaning up..."
	rm -rf ./models
	docker compose -f docker-compose.metal.yml down 2>/dev/null || true
	docker compose down 2>/dev/null || true
	@echo "Cleanup complete!"
