# Build stage
FROM oven/bun:1.2.2-alpine AS builder

# Set working directory
WORKDIR /app

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

# Build client
RUN cd client && bun run build

# Production stage for frontend
FROM caddy:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /srv

# Copy only the built client files and Caddyfile
COPY --from=builder /app/client/dist /srv
COPY --from=builder /app/client/Caddyfile /srv/Caddyfile

# Start Caddy with appropriate config
ENTRYPOINT ["caddy", "run", "--config", "/srv/Caddyfile"]
