#!/usr/bin/env bash
# Sorani modelini devreye al — eğitilmiş .onnx + .onnx.json dosyalarını kurar.
#
# Kullanım:
#   1) Colab eğitiminden Indirilen model.onnx ve model.onnx.json dosyalarını
#      bu klasörün yanına (deploy/stt/) kopyala.
#   2) bash deploy/stt/apply-sorani-voice.sh
#   3) TTS'i yeniden başlat: bash deploy/stt/start-voice.sh  (zaten ayaktaysa öldür/kaldır)
#
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/sorani_female.onnx"
if [ ! -f "$SRC" ]; then
  echo "HATA: $SRC bulunamadı."
  echo "Colab'da olusan model.onnx'i '$DIR/sorani_female.onnx' adıyla buraya kopyala."
  exit 1
fi

mkdir -p "$DIR/models"
cp "$SRC" "$DIR/models/sorani_female.onnx"
# config dosyasi da varsa kopyala
if [ -f "$DIR/sorani_female.onnx.json" ]; then
  cp "$DIR/sorani_female.onnx.json" "$DIR/models/sorani_female.onnx.json"
  cp "$DIR/sorani_female.onnx.json" "$DIR/models/config.json"
fi

echo "✅ Model kuruldu: $DIR/models/sorani_female.onnx"
echo ""
echo "PIPER_MODEL ile devreye almak için TTS servisini şöyle başlat:"
echo "   PIPER_MODEL=sorani_female.onnx python $DIR/tts_server.py"
echo ""
echo "veya .env içine ekle / start script'e geçir. Şimdi elle düzenleme istersen:"
echo "   export PIPER_MODEL=sorani_female.onnx"
