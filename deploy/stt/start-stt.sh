#!/usr/bin/env bash
# Start the local Sorani Whisper STT microservice on port 5100.
# Requires: Python 3.11 + deps (see deploy/stt/requirements.txt)
# This serves /api/voice/stt via STT_PROVIDER=local-whisper.
set -e
export PATH="/c/Users/Lenovo/AppData/Local/Programs/Python/Python311:$PATH"
DIR="$(cd "$(dirname "$0")" && pwd)"
nohup python "$DIR/server.py" > /tmp/sorani-logs/stt.log 2>&1 &
echo "Sorani STT starting on http://localhost:5100 ... (log: /tmp/sorani-logs/stt.log)"
