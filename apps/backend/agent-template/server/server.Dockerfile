FROM oven/bun:1.2.2-alpine

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package.json and lockfile
COPY package.json bun.lock ./

# Create directories for client and server
RUN mkdir -p client server

# Copy package.json for client and server
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all dependencies
RUN bun install --frozen-lockfile

# Copy the entire project
COPY . .

WORKDIR /app/server
RUN bun run build
EXPOSE 2022

CMD ["bun", "run", "src/index.ts"]
