# Whisper-cpp + AI - Hebrew Transcription

Web-based transcription service with AI processing for Hebrew.

## Features

- **Transcription**: Audio to text using Whisper
- **History**: Persistent storage of transcriptions
- **AI Processing**: Summarize, extract action items, translate, Q&A using local LLMs

---

## Quick Start (Metal GPU - Recommended)

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

### Option 1: Metal GPU (Fast)

Best performance on Apple Silicon (M4/M3/M2/M1).

```bash
brew install whisper-cpp ffmpeg
./download-model.sh medium
./start-metal.sh
```

### Option 2: Docker CPU (Portable)

Everything in Docker, slower but portable.

```bash
./download-model.sh medium
docker compose up -d --build
```

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
| סכם | Summarize the transcription |
| נקודות עיקריות | Extract bullet points |
| משימות | Extract action items |
| תרגם לאנגלית | Translate to English |
| שאלות ותשובות | Generate Q&A |

Or ask any custom question about the transcription.

---

## History

Transcriptions are saved to browser localStorage:
- Click **💾 שמור** to save a transcription
- View all saved transcriptions in the **היסטוריה** tab
- Load or send to AI from history

---

## Models

### Whisper Models

```bash
./download-model.sh <model>
```

| Model | Size | Hebrew Quality |
|-------|------|----------------|
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

## Commands

```bash
# Start (Metal)
./start-metal.sh

# Stop (Metal)
./stop-metal.sh

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
├── docker-compose.yml        # Docker CPU setup
├── docker-compose.metal.yml  # Metal GPU setup
├── Dockerfile
├── start-metal.sh
├── stop-metal.sh
├── download-model.sh
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
./download-model.sh medium
```

**AI not working**:
```bash
docker model pull ai/qwen2.5:7B-F16
```

**Port in use**:
```bash
./stop-metal.sh
pkill -f whisper-server
```

**Whisper-server not found**:
```bash
brew install whisper-cpp
```
