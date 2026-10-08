# Ücretsiz Barındırma + Alan Adı — Adım Adım

Bu platform (Next.js web + Express API) için **tamamen ücretsiz**, kredi kartı
gerektirmeyen bir yayın kurulumu:

- **Backend (API)** → **Render** (ücretsiz) → `https://sorani-api.onrender.com`
- **Frontend (web)** → **Vercel** (ücretsiz) → `https://sorani.vercel.app`
- (İsteğe bağlı) **Veritabanı** → **Neon** (ücretsiz Postgres)

İkisi de sana **gerçek, kalıcı, HTTPS'li bir alan adı** verir (`*.onrender.com` / `*.vercel.app`).

> Not: Gerçek ücretsiz kurulum her iki sağlayıcıda da üyelik oluşturmanı gerektirir.
> (Ben senin yerine üyelik açamam; e-postanı/onayını sen verirsin.) Aşağısı rehberdir —
> bitirince son adımı ben yaparım ya da adımları uygularsın.

## 1) Backend API → Render
1. [render.com](https://render.com) → ücretsiz hesap aç.
2. **New → Web Service** → senin **repo** (GitHub/GitLab) bağla; yoksa repo'yu yükle.
3. Ayarlar:
   - **Root Directory:** (monorepo olduğu için kök)
   - **Build Command:** `npm install && npm run build:prod`
   - **Start Command:** `npm run start:api`
   - **Environment:** Node 20
4. **Environment (env) ekle** (`.env` dosyandan doldur — asla commit etme):
   ```
   NODE_ENV=production
   PORT=4000
   TZ=Asia/Erbil
   TTS_PROVIDER=kurdishtts
   STT_PROVIDER=kurdishtts
   KURDISH_TTS_SPEAKER_ID=sorani_986
   KURDISH_TTS_API_KEY=<senin anahtarın>
   KURDISH_STT_API_KEY=<senin anahtarın>
   ```
5. Deploy → sana `https://sorani-api.onrender.com` verir. Test: `https://.../api/health`.

## 2) Frontend web → Vercel
1. [vercel.com](https://vercel.com) → ücretsiz hesap aç → **Add New → Project** → repo bağla.
2. **Root Directory:** `apps/web`
3. **Environment (env) ekle**:
   ```
   NEXT_PUBLIC_API_URL=https://sorani-api.onrender.com/api
   ```
4. Deploy → `https://sorani.vercel.app`.

> Vercel tarafından tarayıcı, API'ye doğrudan `NEXT_PUBLIC_API_URL` üzerinden çağırır;
> API'de CORS zaten açık, sorun olmaz.

## 3) (İsteğe bağlı) Kalıcı veri → Neon / Render Postgres
- Şu an veriler bellekte (yeniden başlatınca sıfırlanır). Kalıcılık için
  [neon.tech](https://neon.tech) → ücretsiz Postgres al → `DATABASE_URL` env'ine ekle.
  (Prisma şeması hazır: `prisma/schema.prisma`.)

## 4) Kendi `chat.seninalanın.com` istersen
- Cloudflare'a ücretsiz üye ol, alan adını ekle; `deploy/cloudflared/config.yml` rehberiyle
  named tunnel kur → kalıcı custom adres.

---

Hangi sağlayıcıyla başlayacağını söyle; hesabı açtığında bana **Deploy URL / repo / env** 
bilgisini verirsen kalan adımları (env'leri yerleştirme, sağlık kontrolü) birlikte tamamlarız.
