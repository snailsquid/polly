FROM oven/bun:1-debian AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y gcc g++ make

COPY package.json bun.lock* ./
RUN bun install

ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY . .
RUN bun run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]