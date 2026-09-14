# Built by GitHub Actions (not needed for local development).
# Build from the repo root: docker build -f infra/docker/api.Dockerfile .

FROM node:24-slim AS build
RUN npm install -g pnpm@12.3.4
WORKDIR /app

# Placeholder so `prisma generate` can load its config; the real URL is set at runtime.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build

COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @grant/shared build \
  && pnpm --filter @grant/api db:generate \
  && pnpm --filter @grant/api build

FROM node:24-slim AS runtime
RUN npm install -g pnpm@12.3.4
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "pnpm db:deploy && node dist/main.js"]
