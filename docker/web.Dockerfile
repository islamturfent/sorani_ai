FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY .npmrc ./
COPY apps/web apps/web
RUN npm install --ignore-scripts

FROM deps AS build
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @sorani/web

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/apps/web/node_modules ./node_modules
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000", "-c", "apps/web"]
