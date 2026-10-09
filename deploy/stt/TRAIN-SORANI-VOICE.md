# Kendi Kadın Sorani Sesini Piper'a Eğitmek (Colab)

Bu rehber, **kendi kadın Sorani (کوردیی ناوەندی) sesini** Piper TTS modeline
eğitmek içindir. Eğitilen modeli bilgisayarına indirip `local-piper` provider'ıyla
kullanırsın — tamamen local, internet gerektirmez, **ticari kullanım serbest (MIT)**.

> **Neden eğitim?** Piper'ın hazır seslerinde Sorani yoktur; en yakını Kürtçe (Kurmanci)
> `ku_TR-berfin_renas` kadın sesidir (şu an `local-piper` bunu kullanıyor). Gerçek
> Sorani için kendi sesinle eğitmen gerekir.

> **ÖNEMLİ — veri:** Hazır Sorani veri kümeleri (SoraniTTS, Gigant KTTS) **erkek** sestir
> (CC BY 4.0). **Kadın** Sorani sesi için **kendi kayıtların** gerekir (aşağıda).

---

## 1) Veri topla: kendi kadın Sorani sesin

Piper iyi bir sonuç için **~1 saat temiz**, tek kadın konuşmacı sesi önerir
(minimum ~30 dk ile başlanabilir). Sorani cümlelerini yüksek sesle oku ve kaydet.

**İstenen format:**
- Tek konuşmacı (kadın), sessiz ortam, net mikrofon
- Cümle başına ayrı `.wav` dosyası (3–15 saniye)
- Her dosya için aynı adlı `.txt` transkript (Sorani yazısıyla)

**Kolay veri toplama:** Sorani haber/kitap metinlerinden ~300–1000 kısa cümle seç.
(Piper için 22.05 kHz mono önerilir; kayıt sonrası dönüşümü Colab script'i yapar.)

---

## 2) Google Colab'da eğit

Piper sesi eğitmek için `piper-training` paketini kullanırız (GPU gerekir, Colab bedava GPU yeterli).

Bir Colab not defterinde şu hücreleri çalıştır:

```python
# 1) Kütüphaneler
!pip install piper-training

# 2) Dosyaları yükle: dataset.zip (wav + txt çiftleri)
from google.colab import files
uploaded = files.upload()          # dataset.zip yükle
!unzip -q dataset.zip -d dataset
!ls dataset | head
```

```python
# 3) Piper datasetini hazırla (22.05k mono, metinler)
!piper.train_prepare \
    --dataset dataset \
    --language ckb \
    --sample-rate 22050 \
    --config-out config.json
```

```python
# 4) Eğit (Colab GPU; süre veri boyutuna göre ~1-3 saat)
!piper.train --config-dir . --run-name sorani-female
```

```python
# 5) ONNX'e dönüştür → indirilebilir iki dosya üretir
!piper.export_onnx \
    --run-dir runs/*/ \
    --output-dir output
!ls -la output/
```

---

## 3) Modeli bilgisayarına indirip kullan

Eğitim sonunda `output/` içinde şu iki dosya çıkar:
- `*.onnx`           (model)
- `*.onnx.json`      (config — ses ayarları)

Bunları bilgisayarda şuraya koy:
```
deploy/stt/models/sorani_female_kadın.onnx
deploy/stt/models/sorani_female_kadın.onnx.json
```

Sonra `deploy/stt/tts_server.py` içindeki `MODEL` satırını yeni modele çevir:
```python
MODEL = os.path.join(HERE, "models", "sorani_female_kadın.onnx")
```

Ve `.env`'de TTS'i local kullan:
```
TTS_PROVIDER=local-piper
```

Şunları yeniden başlat: `bash deploy/stt/start-voice.sh` + API. Artık platform
`/api/voice/tts`'i **senin kadın Sorani sesinle** (local, internet yok) konuşur.

---

## Alternatif (daha hızlı, erkek ses)
Sorani önemi yoksa / sadece hızlı çalışsın istiyorsan mevcut Kurmanci kadın sesi
`ku_TR-berfin_renas` zaten kurulu — `TTS_PROVIDER=local-piper` yeterli.

---

## Kaynaklar
- SoraniTTS veri kümesi (19 saat, ERKEK ses, CC BY): https://data.mendeley.com/datasets/jmtn248cc9
- Piper belgeleri: https://github.com/OHF-Voice/piper1-gpl
- Piper eğitim: https://github.com/rhasspy/piper-training
