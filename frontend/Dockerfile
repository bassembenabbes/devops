# ── Stage 1: Build Angular (Node 20 dans Docker) ──────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Désactiver analytics Angular (évite la question interactive)
ENV NG_CLI_ANALYTICS=false
ENV CI=true

# Cache dépendances
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Build production
COPY . .
RUN npx ng build --configuration production

# ── Stage 2: Serve avec nginx ──────────────────────────────────
FROM nginx:1.25-alpine
# Angular 17 avec builder "application" output dans browser/
COPY --from=builder /app/dist/ecommerce-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
