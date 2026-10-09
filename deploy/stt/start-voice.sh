#!/usr/bin/env bash
# Start local voice services (Sorani Whisper STT on :5100 + Piper TTS on :5101).
set -e
export PATH="/c/Users/Lenovo/AppData/Local/Programs/Python/Python311:$PATH"
DIR="$(cd "$(dirname "$0")" && pwd)"
nohup python "$DIR/server.py" > /tmp/sorani-logs/stt.log 2>&1 &
echo "Sorani STT starting on http://localhost:5100"
nohup python "$DIR/tts_server.py" > /tmp/sorani-logs/tts.log 2>&1 &
echo "Local Piper TTS starting on http://localhost:5101"
sleep 1
echo "Logs: /tmp/sorani-logs/stt.log  /tmp/sorani-logs/tts.log"
