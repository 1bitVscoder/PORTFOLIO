# ============================================
# Stage 1: Build the standalone site
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first (Docker layer caching — only re-install if deps change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# ============================================
# Stage 2: Serve using Next.js standalone runner
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Create a system user and group for running the server under non-root permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets and static resources
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# server.js is created by next build from the standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set correct permissions for Next.js cache directory
RUN mkdir -p .next && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health || exit 1

# Start the standalone server
CMD ["node", "server.js"]
