FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY . .

RUN bun run build

EXPOSE 8080

CMD ["vite", "preview", "--port", "8080", "--host", "0.0.0.0"]
