"""
Synthetic Sorani voice data generator.
- Sorani sentences -> kurdishtts.com TTS -> female Sorani voice audio
- Each audio saved as 22050Hz mono WAV + matching .txt (Piper format)

Usage:
  python generate_data.py                 # uses bundled sentences, 1hr target
  python generate_data.py --count 30      # generate only 30 (mini test)
  python generate_data.py --hours 1.0     # target hours
"""
import argparse, base64, io, json, os, time, sys, urllib.request
import librosa, soundfile as sf

# --- bundled Sorani sentences (LLM-style generated phrases) ---
SENTENCES = [
    "سڵاو چۆنی بەڕێز",
    "بەخێربێیت بۆ ڕێستۆرانتەکەمان",
    "تکایە ژمارەی کەسەکان بڵێ",
    "دەتەوێت بۆ کاتژمێر چەند حجز بکەین",
    "سبەی شەو بەردەستە بۆ چوار کەس",
    "ناوی تۆ چییە",
    "تکایە ژمارە تەلەفۆنەکەت بەم بدە",
    "حجزەکە بە سەرکەوتوویی تۆمارکرا",
    "ئێستا دەتوانم یارمەتیت بدەم",
    "ئەمڕۆ کاتژمێر نۆی ئێوارە بەردەستە",
    "دەتەوێت لەسەر تەلەفۆن قسە بکەین",
    "زۆر سوپاس بۆ بانگهێشتەکەت",
    "ڕێستۆرانتەکە لە ناوەندی شارە",
    "تکایە خۆش بنووسەوە",
    "دەتوانین ژووری تایبەت بۆ تۆ دابین بکەین",
    "ئێمە خزمەتگوزاری تایبەت پێشکەش دەکەین",
    "بەڵێ بە دڵنیاییەوە",
    "نەخێر ئێستا ناتوانم",
    "چەند خولەک چاوەڕوان بە",
    "سوپاس بۆ پەیوەندیت لەگەڵمان",
    "ڕۆژ و کاتەکە بۆم بڵێ",
    "دەمەوێت مێزێک بۆ دوو کەس",
    "بەداخەوە ئێستا بەردەست نییە",
    "دەتوانین کاتێکی تر جێگیر بکەین",
    "تکایە چاوەڕوان بە تکایە",
    "ئێستا پەیوەندیت دەگەێنم بە بەرێوەبەرەکە",
    "زۆر خۆشحاڵم یارمەتیت بدەم",
    "حجزەکەت دووپات کرایەوە",
    "تکایە ڕۆژێکی تر هەڵبژێرە",
    "ئێمە لە کاتژمێر یەکدا بەردەستین",
    "دەتوانیت لەسەر وێبسایت حجز بکەیت",
    "ناونیشانی ڕێستۆرانتەکە لە ناوەندی شاری هەولێرە",
    "ئێمە خواردنی کوردیمان هەیە",
    "تایبەتمەندی سەربازی بۆ منداڵان هەیە",
    "تکایە بە کورتی باسی خواستەکەت بکە",
    "دەتوانین بۆ تۆ مێزێکی باش دابین بکەین",
    "ڕێستۆرانتەکەمان تازەیە",
    "کاتژمێرەکانی کارکردن لە بەیانییەوە تا ئێوارەیە",
    "ئێمە خزمەتی خێرا پێشکەش دەکەین",
    "تکایە مۆبایلەکەت بەکار بهێنە بۆ حجزکردن",
]

def load_key():
    # try env then local .env
    import re
    k = os.environ.get("KURDISH_TTS_API_KEY")
    if k:
        return k
    try:
        with open(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"), "r", encoding="utf-8") as f:
            for line in f:
                m = re.match(r'\s*KURDISH_TTS_API_KEY\s*=\s*(\S+)', line)
                if m:
                    return m.group(1)
    except Exception:
        pass
    return ""

def tts_one(api_key, text, speaker="sorani_986"):
    body = json.dumps({"speaker_id": speaker, "model_version": "v4", "text": text, "format": "mp3"}).encode()
    req = urllib.request.Request(
        "https://www.kurdishtts.com/api/tts-proxy",
        data=body,
        headers={"Content-Type": "application/json", "x-api-key": api_key},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()  # mp3 bytes

def mp3_to_wav_bytes(mp3):
    # decode mp3->float, resample to 22050, encode WAV
    audio, sr = librosa.load(io.BytesIO(mp3), sr=22050, mono=True)
    buf = io.BytesIO()
    sf.write(buf, audio, 22050, format="WAV")
    return buf.getvalue()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=None)
    ap.add_argument("--hours", type=float, default=None)
    ap.add_argument("--out", default="data")
    args = ap.parse_args()

    api_key = load_key()
    if not api_key:
        print("HATA: KURDISH_TTS_API_KEY bulunamadı.")
        sys.exit(1)
    os.makedirs(args.out, exist_ok=True)

    # repeat sentences to reach target if needed
    seq = SENTENCES
    if args.count:
        seq = (SENTENCES * ((args.count // len(SENTENCES)) + 1))[:args.count]
    elif args.hours:
        # ~3s per clip, ~1200 clips per hour
        target = int(args.hours * 1200)
        seq = (SENTENCES * ((target // len(SENTENCES)) + 1))[:target]

    ok = 0
    t0 = time.time()
    for i, text in enumerate(seq):
        name = f"sorani_{i:04d}"
        wav_path = os.path.join(args.out, name + ".wav")
        txt_path = os.path.join(args.out, name + ".txt")
        if os.path.exists(wav_path) and os.path.exists(txt_path):
            ok += 1
            continue
        try:
            mp3 = tts_one(api_key, text)
            wav = mp3_to_wav_bytes(mp3)
            with open(wav_path, "wb") as f:
                f.write(wav)
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text)
            ok += 1
            if i % 10 == 0:
                print(f"  [{i}/{len(seq)}] ok={ok} dur= {time.time()-t0:.0f}s")
        except Exception as e:
            print(f"  [{i}] hata: {e}")
            time.sleep(2)

    print(f"BITTI: {ok} kayit -> {args.out}  (sure {time.time()-t0:.0f}s)")
    print("Piper icin wav+txt ciftleri hazir.")

if __name__ == "__main__":
    main()
