# Multi-stage Docker build for BrandOS AI Enterprise Platform
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Compile and bundle frontend assets
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy manifests and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend distribution
COPY --from=builder /app/dist ./dist

# Copy backend server code and configuration
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig*.json ./

# Expose port (can be overridden via PORT env var in cloud runtimes)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-5000}/api/health || exit 1

# Start the unified backend and SPA server
CMD ["npm", "start"]
