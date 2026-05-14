#!/usr/bin/env python3
"""
Audio extraction service for YouTube and Spotify
Runs alongside the main whisper server to handle audio extraction from URLs
"""

import os
import subprocess
import json
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Check for required tools
def check_requirements():
    """Verify that required tools are installed"""
    try:
        subprocess.run(['which', 'yt-dlp'], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        logger.warning("yt-dlp not found. Installing via pip...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'yt-dlp'], check=True)

@app.route('/extract-audio', methods=['POST'])
def extract_audio():
    """
    Extract audio from YouTube or Spotify URL
    Returns: {
        "audio": base64 encoded audio data,
        "title": extracted title,
        "duration": duration in seconds
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
                    # Note: Spotify extraction may not work due to DRM
                    # Users should provide YouTube URLs or export Spotify playlists
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

                # Read audio file and convert to base64
                import base64
                with open(audio_file, 'rb') as f:
                    audio_data = base64.b64encode(f.read()).decode('utf-8')

                # Get file size in MB for reference
                file_size_mb = audio_file.stat().st_size / (1024 * 1024)
                logger.info(f"Successfully extracted: {title} ({file_size_mb:.1f} MB)")

                return jsonify({
                    "audio": audio_data,
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
    try:
        # Check if yt-dlp is available
        subprocess.run(['which', 'yt-dlp'], check=True, capture_output=True)
        return jsonify({"status": "ok", "service": "audio-extraction"}), 200
    except:
        return jsonify({"status": "unhealthy", "service": "audio-extraction"}), 503

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
    app.run(host='127.0.0.1', port=int(port), debug=False)
