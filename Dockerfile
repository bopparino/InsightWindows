# Next.js app image, same recipe as the cut-sheet program. Alpine base;
# better-sqlite3 ships musl prebuilds so python3/make/g++ are only a fallback.
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++

ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN npm prune --omit=dev

FROM node:22-alpine AS runner

# System Chromium for puppeteer PDF generation (cut-sheet recipe): alpine's
# binary lives at /usr/bin/chromium-browser; fonts so PDFs have glyphs.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "start"]
