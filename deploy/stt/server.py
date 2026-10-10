"""Sorani Kurdish STT microservice (faster-whisper / CTranslate2 int8, CPU).
~2-4x faster than the previous transformers fp32 pipeline on this old i7
(best with cpu_threads==cores). Keeps the fine-tuned Sorani model's Persian
forced decoder (language="fa") for correct Kurdish output.

POST /stt  <- { audioBase64 }  -> { text }
"""
import base64, io, os, time
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
import soundfile as sf
from faster_whisper import WhisperModel

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, "model_ct2")  # CTranslate2 int8 build

# Old 4-core laptops oversubscribe past this; 4 threads measured best on the
# target machine (i7-3630QM). Auto-detect core count, capped to avoid oversub.
cpu_threads = int(os.environ.get("STT_CPU_THREADS", max(1, (os.cpu_count() or 4) // 2)))

app = FastAPI(title="Sorani STT")

print(f"Loading faster-whisper Sorani model (int8, {cpu_threads} threads)...", flush=True)
t0 = time.time()
model = WhisperModel(MODEL_DIR, device="cpu", compute_type="int8", cpu_threads=cpu_threads)
print(f"Model loaded in {time.time()-t0:.1f}s", flush=True)


class STTReq(BaseModel):
    audioBase64: str


@app.get("/health")
def health():
    return {"ok": True, "service": "sorani-stt", "engine": "faster-whisper"}


@app.post("/stt")
def stt(req: STTReq):
    try:
        raw = base64.b64decode(req.audioBase64)
        audio, sr = sf.read(io.BytesIO(raw), dtype="float32")
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        # Resample to 16000 (linear interpolation, no extra deps)
        if sr != 16000:
            ratio = sr / 16000
            n = int(len(audio) / ratio)
            idx = (np.arange(n) * ratio).astype(int)
            idx = np.clip(idx, 0, len(audio) - 1)
            audio = audio[idx]

        t0 = time.time()
        segments, info = model.transcribe(
            audio,
            language="fa",  # Sorani model is fine-tuned with Persian forced decoder
            beam_size=1,  # greedy — several x faster on CPU, quality kept
            condition_on_previous_text=False,  # stop the recurring-loop hallucination
            no_repeat_ngram_size=2,
            repetition_penalty=1.4,
            vad_filter=True,  # Silero VAD drops silence/near-empty clips
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=200,
            ),
        )
        text = "".join(s.text for s in segments).strip()
        dt = time.time() - t0
        try:
            print(f"[stt] {dt*1000:.0f}ms :: {text}", flush=True)
        except UnicodeEncodeError:  # console is not UTF-8
            print(f"[stt] {dt*1000:.0f}ms :: <len {len(text)}>", flush=True)

        if not text:
            return {"text": "", "error": "no_speech"}  # all filtered by VAD
        return {"text": text}
    except Exception as e:
        print(f"[stt] error: {e}", flush=True)
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5100)
