"""Local Piper TTS microservice (Kurdish voice) — CPU, no internet.
POST /tts  <- { text }  -> { format, audioBase64 }
"""
import base64, io, os, subprocess, tempfile
from fastapi import FastAPI
from pydantic import BaseModel
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "models", "ku_TR-berfin_renas-medium.onnx")

app = FastAPI(title="Local Piper TTS")

class TTSReq(BaseModel):
    text: str
    language: str = "ckb"

@app.get("/health")
def health():
    return {"ok": True, "service": "local-piper", "model": os.path.basename(MODEL)}

@app.post("/tts")
def tts(req: TTSReq):
    if not req.text.strip():
        return {"error": "empty text"}
    try:
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "out.wav")
            proc = subprocess.run(
                ["python", "-m", "piper", "-m", MODEL, "-f", out, "--", req.text],
                capture_output=True, text=True, timeout=120,
            )
            if proc.returncode != 0 or not os.path.exists(out):
                return {"error": (proc.stderr or proc.stdout)[-300:]}
            data, sr = sf.read(out, dtype="float32")
            # Piper outputs 22050Hz mono
            buf = io.BytesIO()
            sf.write(buf, data, sr, format="WAV")
            wav = buf.getvalue()
            return {"format": "audio/wav", "audioBase64": base64.b64encode(wav).decode()}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5101)
