FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY .npmrc ./
COPY packages packages
COPY providers providers
RUN npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts

FROM deps AS build
COPY apps/api apps/api
RUN npm run build --workspace @sorani/shared \
  && npm run build --workspace @sorani/events \
  && npm run build --workspace @sorani/validation \
  && npm run build --workspace @sorani/restaurants \
  && npm run build --workspace @sorani/reservations \
  && npm run build --workspace @sorani/provider-llm \
  && npm run build --workspace @sorani/provider-stt \
  && npm run build --workspace @sorani/provider-tts \
  && npm run build --workspace @sorani/provider-telephony \
  && npm run build --workspace @sorani/provider-reservations \
  && npm run build --workspace @sorani/ai \
  && npm run build --workspace @sorani/voice \
  && npm run build --workspace @sorani/telephony \
  && npm run build --workspace @sorani/customers \
  && npm run build --workspace @sorani/calls \
  && npm run build --workspace @sorani/tenants \
  && npm run build --workspace @sorani/users \
  && npm run build --workspace @sorani/notifications \
  && npm run build --workspace @sorani/analytics \
  && npm run build --workspace @sorani/api

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/providers ./providers
COPY --from=build /app/apps/api ./apps/api
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
