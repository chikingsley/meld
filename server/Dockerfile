FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy server and src code
COPY server ./server
COPY src ./src

# Expose the server port (3001 to match your ngrok setup)
EXPOSE 3001

# Start the server with watch mode
CMD ["bun", "--watch", "--inspect", "--verbose", "server/bun-server.ts"]
