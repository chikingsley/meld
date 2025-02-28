FROM oven/bun:latest

WORKDIR /app

# Install OpenSSL and curl for Prisma and healthcheck
RUN apt-get update -y \
    && apt-get install -y openssl curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and schema
COPY package.json bun.lock ./
COPY prisma ./prisma

# Install dependencies and generate Prisma Client
RUN bun install \
    && mv node_modules ../

RUN bunx prisma generate --schema ./prisma/schema.prisma

RUN bun i -g prisma

# Copy application code
COPY server ./server
COPY .env ./.env
COPY src ./src

# Start the server with watch mode
CMD ["bun", "run", "--watch", "server/bun-server.ts"]
