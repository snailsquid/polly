FROM oven/bun:1-debian AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y gcc g++ make

COPY package.json bun.lockb* ./
RUN bun install

COPY prisma ./prisma
RUN bunx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1-debian AS production

WORKDIR /app

RUN apt-get update && apt-get install -y dumb-init

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production

EXPOSE 3000 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "bunx prisma db push --force-reset --skip-generate && bun run dist/index.js"]