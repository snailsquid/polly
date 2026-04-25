FROM oven/bun:1-alpine AS builder

WORKDIR /app

RUN apk add --no-cache gcc musl-dev

COPY package.json bun.lockb* ./
RUN bun install

COPY prisma ./prisma
RUN bunx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1-alpine AS production

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

RUN bunx prisma migrate deploy

ENV NODE_ENV=production

EXPOSE 3000 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/polls || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "dist/index.js"]
