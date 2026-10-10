# Sorani STT — CTranslate2 (faster-whisper) build

The Sorani Whisper model is converted to **CTranslate2 int8** so it runs ~2-4x
faster on this old CPU-only machine (via `faster-whisper`). The converted
model lives in `deploy/stt/model_ct2/` (git-ignored).

## How to (re)build `model_ct2/`

```bash
export PATH="/c/Users/Lenovo/AppData/Local/Programs/Python/Python311:$PATH"
pip install faster-whisper ctranslate2

cd deploy/stt
# model/ = original fine-tuned Sorani Whisper (transformers/safetensors)
rm -rf model_ct2
ct2-transformers-converter \
  --model model \
  --output_dir model_ct2 \
  --copy_files tokenizer.json preprocessor_config.json \
  --quantization int8
```

Notes
- `--model` must point at the **model directory** (with `config.json`,
  `model.safetensors`, `tokenizer.json`), not a single weights file.
- `tokenizer.json` is generated with `AutoTokenizer` if the original model
  lacks it (3.9MB) — required by the converter.
- `server.py` loads `model_ct2/` with `compute_type="int8"`,
  `cpu_threads=max(1, cores//2)` (4 measured best on i7-3630QM).

## Tuning in `server.py`
- `language="fa"` — the Sorani model was fine-tuned with a **Persian forced
  decoder**; forcing it skips language detection (~2x faster) and keeps
  correct Kurdish output.
- `beam_size=1` (greedy), `condition_on_previous_text=False`,
  `no_repeat_ngram_size=2`, `repetition_penalty=1.4` — stops the recurring
  hallucination loop (`بەوەیەکەیە ...`) on short/noisy clips.
- `vad_filter=True` — Silero VAD drops silence/near-empty clips.

## Restart
```bash
bash deploy/stt/start-voice.sh    # STT :5100 + TTS :5101
```
Env `PYTHONIOENCODING=utf-8` / `PYTHONUTF8=1` are now exported so the service
does not crash printing Kurdish text on a cp1252 console.
