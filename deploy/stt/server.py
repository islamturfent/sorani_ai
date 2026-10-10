"""Sorani Kurdish STT microservice (Whisper small Sorani, CPU).
POST /stt  <- { audioBase64 }  -> { text }
"""
import base64, io, os, time
import numpy as np
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import soundfile as sf

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")
app = FastAPI(title="Sorani STT")

print("Loading Sorani Whisper model (CPU)...", flush=True)
t0 = time.time()
proc = AutoProcessor.from_pretrained(MODEL_DIR)
model = AutoModelForSpeechSeq2Seq.from_pretrained(MODEL_DIR)
model.eval()
print(f"Model loaded in {time.time()-t0:.1f}s", flush=True)

class STTReq(BaseModel):
    audioBase64: str

@app.get("/health")
def health():
    return {"ok": True, "service": "sorani-stt"}

@app.post("/stt")
def stt(req: STTReq):
    try:
        raw = base64.b64decode(req.audioBase64)
        audio, sr = sf.read(io.BytesIO(raw), dtype="float32")
        if sr != 16000:
            # simple resample via librosa-free linear interp is avoided; torchaudio not installed.
            pass
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        # Resample to 16000 if needed
        if sr != 16000:
            ratio = sr / 16000
            n = int(len(audio) / ratio)
            idx = (np.arange(n) * ratio).astype(int)
            idx = np.clip(idx, 0, len(audio)-1)
            audio = audio[idx]
        inputs = proc(audio, return_tensors="pt", sampling_rate=16000)
        with torch.no_grad():
            # Greedy (num_beams=1) — several times faster on CPU than beam search,
            # keeps Sorani quality. Anti-repetition to stop the recurring loop
            # ("بەوەیەکەیە ...") that small Whisper models fall into on short/noisy
            # microphone clips.
            gen = model.generate(
                inputs.input_features,
                forced_decoder_ids=proc.get_decoder_prompt_ids(language="persian", task="transcribe"),
                num_beams=1,
                do_sample=False,
                max_new_tokens=128,
                no_repeat_ngram_size=2,
                repetition_penalty=1.4,
                early_stopping=True,
                condition_on_prev_tokens=False,
            )
        text = proc.batch_decode(gen, skip_special_tokens=True)[0].strip()
        return {"text": text}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5100)
