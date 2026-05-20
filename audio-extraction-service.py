#!/usr/bin/env python3
"""
Audio extraction and transcription storage service
Runs alongside the main whisper server to handle audio extraction from URLs and persistent history
"""

import os
import subprocess
import json
import tempfile
import uuid
import shutil
import fcntl
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


# Persistent storage for transcriptions
DATA_DIR = Path('./data')
HISTORY_FILE = DATA_DIR / 'transcriptions.json'
AUDIO_DIR = DATA_DIR / 'audio'
DATA_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

def load_history():
    """Load transcription history from file with file locking"""
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                data = json.load(f)
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                return data
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to load history: {e}")
            return []
    return []

def save_history(history):
    """Save transcription history to file with file locking"""
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            json.dump(history, f, ensure_ascii=False, indent=2)
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        return True
    except Exception as e:
        logger.error(f"Failed to save history: {e}")
        return False

@app.route('/history', methods=['GET'])
def get_history():
    """Get all saved transcriptions"""
    try:
        history = load_history()
        return jsonify(history), 200
    except Exception as e:
        logger.error(f"Error loading history: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/history', methods=['POST'])
def save_transcription():
    """Save a new transcription"""
    try:
        data = request.get_json()
        name = data.get('name', 'תמלול ללא שם')
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        history = load_history()
        item = {
            'id': int(datetime.now().timestamp() * 1000),
            'name': name,
            'text': text,
            'date': datetime.now().isoformat()
        }
        
        history.insert(0, item)
        if save_history(history):
            return jsonify(item), 201
        else:
            return jsonify({"error": "Failed to save"}), 500
    except Exception as e:
        logger.error(f"Error saving transcription: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/history/<int:item_id>', methods=['DELETE'])
def delete_transcription(item_id):
    """Delete a transcription"""
    try:
        history = load_history()
        history = [h for h in history if h['id'] != item_id]
        if save_history(history):
            return jsonify({"success": True}), 200
        else:
            return jsonify({"error": "Failed to delete"}), 500
    except Exception as e:
        logger.error(f"Error deleting transcription: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/history', methods=['DELETE'])
def clear_history():
    """Clear all transcriptions"""
    try:
        if save_history([]):
            return jsonify({"success": True}), 200
        else:
            return jsonify({"error": "Failed to clear"}), 500
    except Exception as e:
        logger.error(f"Error clearing history: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/audio/<path:filename>', methods=['GET'])
def serve_audio(filename):
    """Serve extracted audio files"""
    return send_from_directory(str(AUDIO_DIR.resolve()), filename)

@app.route('/audio/<path:filename>', methods=['DELETE'])
def delete_audio(filename):
    """Delete an extracted audio file"""
    try:
        file_path = AUDIO_DIR / filename
        if file_path.exists():
            file_path.unlink()
            return jsonify({"success": True}), 200
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting audio file: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/extract-audio', methods=['POST'])
def extract_audio():
    """
    Extract audio from YouTube or Spotify URL.
    Returns: {
        "url": path to download the extracted audio,
        "title": extracted title,
        "size_mb": file size in MB
    }
    """
    try:
        data = request.get_json()
        url = data.get('url', '').strip()

        if not url:
            return jsonify({"error": "URL is required"}), 400

        # Validate URL format
        if not any(domain in url for domain in ['youtube.com', 'youtu.be', 'spotify.com']):
            return jsonify({"error": "Only YouTube and Spotify URLs are supported"}), 400

        # Use temporary directory for extraction
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, '%(title)s.mp3')
            
            try:
                # Extract audio using yt-dlp
                cmd = [
                    'yt-dlp',
                    '-x',  # Extract audio
                    '-f', 'bestaudio/best',  # Best audio quality
                    '-o', output_path,
                    '--audio-format', 'mp3',
                    '--audio-quality', '192',
                    '--no-warnings',
                    '-q',  # Quiet mode
                    url
                ]

                # Handle Spotify URLs differently if needed
                if 'spotify.com' in url:
                    logger.warning(f"Spotify URL provided: {url}. Note: Due to DRM, Spotify audio extraction may not work.")

                logger.info(f"Extracting audio from: {url}")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

                if result.returncode != 0:
                    error_msg = result.stderr or "Failed to extract audio"
                    logger.error(f"yt-dlp error: {error_msg}")
                    return jsonify({"error": f"Failed to extract audio: {error_msg[:100]}"}), 400

                # Find the extracted MP3 file
                mp3_files = list(Path(tmpdir).glob('*.mp3'))
                if not mp3_files:
                    return jsonify({"error": "No audio file was extracted"}), 400

                audio_file = mp3_files[0]
                title = audio_file.stem

                # Copy to persistent audio directory with unique prefix
                unique_prefix = uuid.uuid4().hex[:8]
                safe_name = f"{unique_prefix}_{title}.mp3"
                dest_path = AUDIO_DIR / safe_name
                shutil.copy2(str(audio_file), str(dest_path))

                # Get file size in MB for reference
                file_size_mb = dest_path.stat().st_size / (1024 * 1024)
                logger.info(f"Successfully extracted: {title} ({file_size_mb:.1f} MB)")

                return jsonify({
                    "url": f"/audio/{safe_name}",
                    "title": title,
                    "size_mb": round(file_size_mb, 1)
                })

            except subprocess.TimeoutExpired:
                return jsonify({"error": "Extraction timeout - file may be too large"}), 408
            except Exception as e:
                logger.error(f"Extraction error: {str(e)}")
                return jsonify({"error": f"Extraction error: {str(e)[:100]}"}), 400

    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": f"Unexpected error: {str(e)[:100]}"}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "audio-extraction", "history_count": len(load_history())}), 200


if __name__ == '__main__':
    import sys
    
    # Ensure yt-dlp is available
    try:
        subprocess.run(['which', 'yt-dlp'], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("Installing yt-dlp...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'yt-dlp', 'flask', 'flask-cors'], check=True)

    # Run the Flask app
    port = os.environ.get('AUDIO_EXTRACTION_PORT', 5000)
    print(f"Starting audio extraction service on port {port}")
    app.run(host='0.0.0.0', port=int(port), debug=False)
