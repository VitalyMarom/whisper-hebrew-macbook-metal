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
brew install whisper-cpp ffmpeg

# 2. Download model
./download-model.sh medium

# 3. Pull an LLM model for AI features
docker model pull ai/qwen2.5:7B-F16

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

The AI tab lets you process transcriptions with local LLMs via Docker Model Runner.

### Setup Docker Model

```bash
# Pull a model (Qwen 2.5 recommended for Hebrew)
docker model pull ai/qwen2.5:7B-F16

# Or other options:
docker model pull ai/llama3.2:3B-Q8_0
docker model pull ai/mistral:7B-Q4_K_M
docker model pull ai/gemma3:4B-F16
```

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

| Model | Size | Hebrew |
|-------|------|--------|
| ai/qwen2.5:7B-F16 | ~15 GB | Best |
| ai/llama3.2:3B-Q8_0 | ~3 GB | Good |
| ai/mistral:7B-Q4_K_M | ~4 GB | Good |

---

## Makefile Commands

```bash
make help              # Show all available commands
make install-deps     # Install dependencies (whisper-cpp, ffmpeg)
make download-model   # Download Whisper model (default: medium)
make download-model MODEL=large-v3  # Download specific model
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
```bash
docker model pull ai/qwen2.5:7B-F16
```

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
