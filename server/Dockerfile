FROM oven/bun:latest

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy server and src code
COPY server ./server

# Expose the server port (3001 to match your ngrok setup)
EXPOSE 3001

# Start the server with watch mode
CMD ["bun", "--watch", "server/bun-server.ts"]
