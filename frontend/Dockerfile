FROM oven/bun:latest@sha256:3aa040e5445efa09d75bb428a64ba50db13e2b3ac9b6b0c7f145615f62b2ee18 AS deps
WORKDIR /app

COPY bun.lock package.json ./
RUN bun install --frozen-lockfile 

FROM node:26.13.1-bookworm-slim@sha256:b822af76043e2656ffc172072036fe0968a3c09a692e4ad05eb9348ad5dbdf4c AS builder
WORKDIR /app

ARG COMMIT_HASH
ENV NEXT_PUBLIC_COMMIT_HASH=${COMMIT_HASH}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_SHARP_PATH=/app/node_modules/sharp
ENV NEXT_TELEMETRY_DISABLED=1
RUN realpath .

RUN npm run build

FROM node:26.13.1-bookworm-slim@sha256:b822af76043e2656ffc172072036fe0968a3c09a692e4ad05eb9348ad5dbdf4c AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js", "--hostname", "0.0.0.0"]
