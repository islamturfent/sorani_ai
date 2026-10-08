# SORANI AI CALL CENTER

Multi-Restaurant Sorani AI Voice Call Center Platform. A tenant-isolated, provider-agnostic
platform that lets customers reserve tables across many restaurants by speaking naturally in
**Sorani Kurdish (کوردیی ناوەندی)** with a female AI voice agent named **Rojin**.

> **Core principle:** the AI is never locked to a single restaurant or provider. Every capability
> (LLM, STT, TTS, Telephony, Reservation, Restaurant Search, Notification) is behind a provider
> interface so that restaurants and providers can be plugged in without touching the AI core.

## High-level flow

```
 CUSTOMER ──▶ VOICE AI (Rojin, Sorani female) ──▶ AI AGENT CORE
                                                    ├──▶ Restaurant Search Engine ──▶ Restaurant DB
                                                    ├──▶ Reservation Engine ──▶ Providers (A/B/C/Direct)
                                                    └──▶ Telephony Engine ──▶ SIP / VoIP
```

A customer says e.g. *"شەوی پێنجشەممە دەمەوێت لە باشترین ڕێستورانێکی ئێربیل بۆ چوار کەس حجز بکەم."*
The AI understands intent, searches restaurants, filters by availability, offers options, lets the
customer choose, and creates a reservation — possibly by calling the restaurant directly over the
phone when no online reservation system exists.

## Tech stack

- **Frontend:** Next.js 14 · TypeScript · React · Tailwind · shadcn/ui
- **Backend:** Node.js · TypeScript · Next.js API (separate `apps/api`)
- **Database:** PostgreSQL + Prisma
- **Cache/events:** Redis
- **AI:** LM Studio (OpenAI-compatible) — swappable via `LLMProvider`
- **Voice:** STT / TTS / VAD provider abstractions
- **Telephony:** SIP/VoIP provider abstraction
- **Infra:** Docker · Docker Compose

## Monorepo layout

```
.
├── apps/
│   ├── web/                  # Next.js dashboard (RTL/LTR UI)
│   └── api/                  # API service (REST, webhooks)
├── packages/
│   ├── shared/               # errors, logging, types, utils
│   ├── events/               # domain event bus abstraction
│   ├── validation/           # request validation
│   ├── database/             # Prisma client + schema
│   ├── restaurants/          # domain + search + ranking
│   ├── reservations/         # domain + providers + orchestrator
│   ├── ai/                   # AI agent core + system prompt
│   ├── voice/                # STT / TTS / VAD interfaces
│   ├── telephony/            # telephony domain
│   ├── customers/
│   ├── calls/
│   ├── tenants/
│   ├── notifications/
│   └── analytics/
├── providers/
│   ├── llm/                  # lm-studio, openai, anthropic, mock
│   ├── stt/                  # openai-whisper, mock
│   ├── tts/                  # provider-a, mock
│   ├── telephony/            # twilio, sip, mock
│   └── reservations/         # provider-a/b, direct, mock
├── prisma/                   # canonical Prisma schema (symlinked into database pkg)
├── docker/
├── tests/
├── docker-compose.yml
└── package.json
```

## Getting started

### 1. Prerequisites

- Node.js **>= 18.17** (recommended 20.x)
- PostgreSQL and Redis (or `docker compose up db redis`)

### 2. Install & configure

```bash
npm install
cp .env.example .env
npx prisma db push --schema prisma/schema.prisma
npm run db:seed
```

### 3. Run

```bash
# Infrastructure
docker compose up -d db redis

# API (uses mock providers by default, so no external keys needed)
npm run dev:api

# Web dashboard
npm run dev:web
```

Open `http://localhost:3000`. Use the **"Start AI Call"** simulation on the dashboard to talk to
Rojin from your browser without any real phone or external API.

### 4. Wire real providers

Edit `.env` to point `LLM_PROVIDER`/`STT_PROVIDER`/`TTS_PROVIDER`/`TELEPHONY_PROVIDER` at real
implementations (LM Studio, OpenAI, Twilio, …). Providers are registered in provider registries and
are hot-swappable.

## Architecture highlights

- **API-first:** all operations go through REST endpoints; the frontend never touches the DB.
- **Provider registries & adapters:** no module depends on a specific provider. Add a provider by
  implementing one interface and registering it.
- **Direct Restaurant Provider:** when a restaurant has no online booking, the platform calls the
  restaurant over the phone and the AI negotiates availability.
- **Idempotency:** reservations carry an idempotency key to prevent duplicates on retry/fallback.
- **Domain events & event bus:** `restaurant.created`, `reservation.confirmed`, `call.started`, …
  emitted through an abstraction that can be swapped to Redis/RabbitMQ/Kafka.
- **Multi-tenancy & RBAC:** every tenant-scoped query carries a tenant context; roles
  `SUPER_ADMIN`, `TENANT_ADMIN`, `RESTAURANT_MANAGER`, `CALL_CENTER_AGENT`, `VIEWER`.
- **Encrypted credentials:** provider credentials stored encrypted at rest.
- **Contract tests:** every reservation provider must pass the contract test suite.

## License

Proprietary. © The platform owner.
