# Whisper-cpp + AI - Hebrew Transcription

Web-based transcription service with AI processing for Hebrew.

## Features

- **Transcription**: Audio to text using Whisper
- **YouTube/Spotify**: Extract audio from YouTube and Spotify URLs
- **History**: Persistent storage of transcriptions
- **AI Processing**: Summarize, extract action items, translate, Q&A using local LLMs
- **Metal GPU**: Native acceleration on Apple Silicon (M4/M3/M2/M1)

---

## Quick Start (Metal GPU - Recommended)

### Using Makefile (Recommended)

```bash
# 1. Install dependencies
make install-deps

# 2. Download model
make download-model

# 3. Start
make start
```

### Or using shell scripts

```bash
# 1. Install dependencies
brew install whisper-cpp ffmpeg yt-dlp

# 2. Download model
./download-model.sh medium

# 3. (Optional) Pull an LLM for AI features
brew install ollama
ollama pull qwen2.5-coder:7b

# 4. Start
./start-metal.sh
```

Open **http://localhost:3000**

---

## Setup Options

### Option 1: Metal GPU (Fast) - Using Makefile

Best performance on Apple Silicon (M4/M3/M2/M1).

```bash
make install-deps
make download-model MODEL=medium
make start
```

To stop: `make stop`

### Option 2: Metal GPU (Fast) - Using Scripts

```bash
brew install whisper-cpp ffmpeg
./download-model.sh medium
./start-metal.sh
```

To stop: `./stop-metal.sh`

### Option 3: Docker CPU (Portable)

Everything in Docker, slower but portable.

```bash
make docker-start
```

Or with scripts:
```bash
./download-model.sh medium
docker compose up -d --build
```

### Custom Model (Docker)

To use a different Whisper model with Docker:
```bash
MODEL_NAME=ggml-large-v3.bin make docker-start
```

---

## Audio Sources

The app supports multiple audio input methods:

### 1. Upload Local Files
- Drag and drop audio files
- Supported formats: WAV, MP3, M4A, FLAC, OGG

### 2. YouTube Videos
- Paste YouTube URL (youtube.com or youtu.be)
- Extracts best audio quality
- Requires: yt-dlp (installed automatically)

### 3. Spotify Tracks
- Paste Spotify URL (spotify.com)
- Note: Some tracks may have DRM restrictions
- Requires: yt-dlp (installed automatically)

---

## AI Processing

The AI tab lets you process transcriptions with NVIDIA API models.

### Setup NVIDIA API Key

Get your API key from [build.nvidia.com](https://build.nvidia.com)

**Option 1: Via UI (Recommended)**
1. Go to the AI tab
2. Enter your NVIDIA API key in the input field
3. The key is saved to the backend server

**Option 2: Via Environment Variable**
```bash
export NVIDIA_API_KEY="your-api-key-here"
make start
```

### Available Models

| Model | Hebrew Quality |
|-------|----------------|
| ai21labs/AI21-Jamba-Mini-1.6 | ⭐⭐⭐⭐⭐ Highly Recommended |
| mistralai/mistral-nemotron | ⭐⭐⭐⭐ Very Good |
| meta/llama-3.1-405b-instruct | ⭐⭐⭐⭐ Very Good |
| qwen/qwen3-coder-480b-a35b-instruct | ⭐⭐⭐⭐ Very Good |

**Recommendation**: Use **AI21 Jamba Mini 1.6** for best native Hebrew understanding and performance.

### AI Features

| Preset | Description |
|--------|-------------|
| 📝 סכם | Summarize the transcription |
| 📋 נקודות עיקריות | Extract bullet points |
| ✅ משימות | Extract action items |
| 🌐 תרגם לאנגלית | Translate to English |
| ❓ שאלות ותשובות | Generate Q&A |

Or ask any custom question about the transcription. The full transcription is sent to the AI, not truncated.

---

## History

Transcriptions are saved to browser localStorage:
- Click **💾 שמור** to save a transcription
- View all saved transcriptions in the **היסטוריה** tab
- Load or send to AI from history

---

## Models

### Whisper Models

Using Makefile: `make download-model MODEL=<model>`
Using script: `./download-model.sh <model>`

| Model | Size | Hebrew Quality |
|-------|------|----------------|
| tiny | ~75 MB | Fair |
| small | 466 MB | Good |
| medium | 1.5 GB | Very Good |
| large-v3 | 3 GB | Best |

### LLM Models (for AI)

| Model | Provider | Hebrew |
|-------|----------|--------|
| AI21 Jamba Mini 1.6 | NVIDIA | Best (Native) |
| mistral-nemotron | NVIDIA | Very Good |
| llama-3.1-405b | NVIDIA | Very Good |
| qwen3-coder-480b | NVIDIA | Very Good |

---

## Makefile Commands

```bash
make help              # Show all available commands
make install-deps     # Install dependencies (whisper-cpp, ffmpeg, yt-dlp)
make download-model   # Download Whisper model (default: medium)
make download-model MODEL=large-v3  # Download specific model
make pull-llm         # Pull LLM model for AI (default: ai/qwen2.5:7B-F16)
make pull-llm MODEL=ai/llama3.2:3B-Q8_0  # Pull specific LLM
make start             # Start with Metal GPU
make stop              # Stop all services
make docker-start      # Start with Docker CPU
make docker-stop       # Stop Docker services
make logs              # Show Docker logs
make clean             # Clean up models and containers
```

---

## Shell Script Commands

```bash
# Start (Metal)
./start-metal.sh

# Stop (Metal)
./stop-metal.sh

# Download model
./download-model.sh <model>

# Start (Docker)
docker compose up -d

# Stop (Docker)
docker compose down

# View logs
docker compose logs -f
```

---

## Directory Structure

```
whisper/
├── Makefile                 # Build and run commands
├── docker-compose.yml       # Docker CPU setup
├── docker-compose.metal.yml # Metal GPU setup
├── Dockerfile
├── start-metal.sh
├── stop-metal.sh
├── download-model.sh
├── audio-extraction-service.py  # YouTube/Spotify audio extractor
├── ui/
│   ├── index.html           # Web UI
│   ├── nginx.conf
│   └── nginx.metal.conf
├── audio/
└── models/
```

---

## Troubleshooting

**"Model not found"**:
```bash
make download-model
# or
./download-model.sh medium
```

**"AI not working" / "LLM is not available"**:
1. Check your NVIDIA API key is set (UI or environment variable)
2. Verify the key is valid at [build.nvidia.com](https://build.nvidia.com)

**"Port in use"**:
```bash
make stop
# or
./stop-metal.sh
pkill -f whisper-server
```

**"Whisper-server not found"**:
```bash
make install-deps
# or
brew install whisper-cpp
```

**"Docker is not running"**:
The scripts now validate Docker is running. Start Docker Desktop:
- On macOS: `open /Applications/Docker.app`
- Or open Docker Desktop from Applications

**"YouTube/Spotify not working"**:
Ensure Python3 and yt-dlp are installed:
```bash
brew install python3
pip3 install yt-dlp flask flask-cors
```

---

## System Requirements

- macOS 11+ (Big Sur or later)
- Apple Silicon (M1/M2/M3/M4) recommended for Metal GPU
- 8GB RAM minimum (16GB recommended)
- Docker Desktop installed and running
- For YouTube/Spotify: Python3, yt-dlp, ffmpeg

---

## License

MIT
