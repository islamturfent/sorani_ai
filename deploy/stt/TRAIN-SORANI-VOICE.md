# Kendi Kadın Sorani Sesini Piper'a Eğitmek (Colab)

Bu rehber, **kadın Sorani (کوردیی ناوەندی) sesini** Piper TTS'e eğitmek içindir
(Seçenek A: Common Voice verisi — **kayıt yapmana gerek yok**). Eğitilen modeli
bilgisayarına indirip `local-piper` provider'ıyla kullanırsın — tamamen local,
internet gerektirmez, **ticari kullanım serbest (MIT)**.

> Piper'ın hazır seslerinde Sorani yoktur (en yakını Kurmanci kadın sesidir). Bu
> rehber, Common Voice'taki **gerçek kadın Sorani konuşmacılarını** kullanarak senin
> kendi Sorani sesini üretir.

---

## Özet — 3 adım

1. **Colab not defterini çalıştır** (bedava GPU) → Common Voice'tan en bol kadın
   Sorani konuşmacıyı seçip Piper'a eğitir → `model.onnx` + `model.onnx.json` üretir.
2. **İki dosyayı bilgisayarına indir.**
3. **`apply-sorani-voice.sh` ile kur + TTS'i devreye al.**

> Süre: ~1-3 saat (Colab GPU). Model indirmesi internet ister; eğitim sonrası local,
> internet'siz çalışır.

---

## Adım 1 — Colab not defterini çalıştır

Not defteri dosyası:
```
deploy/stt/colab/Train_Sorani_Piper.ipynb
```

1. [colab.research.google.com](https://colab.research.google.com) aç.
2. **File → Upload notebook** → `Train_Sorani_Piper.ipynb`'i yükle.
3. **Runtime → Change runtime type → GPU** seç (bedava T4 Yeterli).
4. Hücreleri **sırayla çalıştır** (her birinde ▶).
   - 2. hücrede veri aşaması Common Voice ckb'yi indirir ve **en çok kayıt veren tek
     kadın Sorani konuşmacıyı** otomatik seçer (tutarlı tek ses için).
   - Eğitim hücresi ~1-3 saat sürer.
5. Son hücre `model.onnx` ve `model.onnx.json` dosyalarını **indirir.**

> Common Voice'a erişim sorun olursa not defteri 13_0'a düşer. Eğer tamamen engellenirse
> Mozilla Data Collective'den `ckb` verisini indirip elle yüklemen gerekebilir.

---

## Adım 2 — Dosyaları bilgisayara koy

İndirdiğin iki dosyayı (varsayılan adları `model.onnx`, `model.onnx.json` ise)
`deploy/stt/` klasörüne şu adlarla kopyala:

```
deploy/stt/sorani_female.onnx
deploy/stt/sorani_female.onnx.json   (opsiyonel)
```

---

## Adım 3 — Kur + devreye al

```bash
bash deploy/stt/apply-sorani-voice.sh
```

Bu script `sorani_female.onnx`'i `deploy/stt/models/`'e kopyalar.

Sonra TTS servisini **Sorani modeliyle** yeniden başlat:
```bash
# önce eski TTS servisini kapat
# (uygun şekilde PID'ini bulup taskkill)
PIPER_MODEL=sorani_female.onnx bash deploy/stt/start-voice.sh
```

Veya daha kalıcı — `deploy/stt/tts_server.py`'deki `ku_TR-berfin_renas-medium.onnx`
varsayılan adını `sorani_female.onnx` yap.

`.env`'de TTS local olsun:
```
TTS_PROVIDER=local-piper
```

Artık platform `/api/voice/tts`'i **senin kadın Sorani sesinle** (local) konuşur.

---

## Notlar
- **Tek konuşmacı:** Not defteri en çok kayıt veren tek kadın konuşmacıyı seçer;
  bu, Piper'ın tutarlı tek ses üretmesi için önemlidir.
- **Kayıt (Recording Studio):** Kendi ses kayıtlarınla eğitmek istersen
  `apps/web/app/recording` (public adrese `/recording` ekleyerek) Sorani cümleleri
  okuyup `wav + txt` topla, sonra aynı Colab akışını kullan.
- **Alternatif:** Kurmanci kadın sesiyle devam etmek için hiçbir şey yapma —
  `ku_TR-berfin_renas` zaten kurulu.

## Dosyalar
- Colab not defteri: `deploy/stt/colab/Train_Sorani_Piper.ipynb`
- Devreye alma: `deploy/stt/apply-sorani-voice.sh`
- TTS servisi: `deploy/stt/tts_server.py`
