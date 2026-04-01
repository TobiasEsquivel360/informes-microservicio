# ========================================================================

# STAGE 1 — Obtener los archivos .js con el proyecto ya listo para ejecutar

# ========================================================================
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY tsconfig.json ./

COPY src ./src

RUN npm run build

# ========================================================================

# STAGE 2 — Imagen final con playwright lista para ejecutar

# ========================================================================

FROM mcr.microsoft.com/playwright:v1.58.2-noble AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3005
EXPOSE 3005
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

CMD ["node", "dist/index.js"]