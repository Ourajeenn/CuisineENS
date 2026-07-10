# ─────────────────────────────────────────────
# CuisineEnsemble — Frontend React/Nginx Dockerfile
# ─────────────────────────────────────────────

# Stage 1: Build the React app
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (leverage Docker layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build for production
COPY . .

# VITE_API_URL will be injected at build time via --build-arg
ARG VITE_API_URL=https://cuisine-ensemble-api.fly.dev/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
