# ============================================
# Stage 1: Build the static site
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first (Docker layer caching — only re-install if deps change)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source code and build
COPY . .
RUN npm run build

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static build output from builder
COPY --from=builder /app/out /usr/share/nginx/html

# Make directories writable by nginx user
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

# Run as non-root
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health || exit 1
